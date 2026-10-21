"use server";

import * as XLSX from "xlsx";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { ActionError, toUserError } from "@/lib/action-error";

// Tope razonable para un edificio (ni el archivo más grande que se pueda
// pedir manualmente tarda relevante, ni el loop de filas se cuelga).
const MAX_ROWS = 1000;

// Alias case-insensitive de encabezados — acepta tanto los nombres
// sugeridos (propietario_dni) como variantes cortas (dni).
const HEADER_ALIASES: Record<string, string> = {
  unidad: "unidad",
  unit: "unidad",
  etiqueta: "unidad",
  piso: "piso",
  floor: "piso",
  propietario_dni: "dni",
  dni: "dni",
  propietario_nombre: "nombre",
  nombre: "nombre",
  propietario_email: "email",
  email: "email",
  propietario_telefono: "telefono",
  telefono: "telefono",
  phone: "telefono",
  fecha_entrega: "entrega",
  fechaentrega: "entrega",
  entrega: "entrega",
  delivered_at: "entrega",
};

// Acepta "2026-03-15" (CSV) y también lo que llega de una celda de fecha de
// Excel — cellDates:true en XLSX.read hace que esa celda ya sea un objeto
// Date en vez de un serial numérico, así que alcanza con new Date().
function parseDeliveredAt(raw: string): Date | undefined {
  if (!raw) return undefined;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export type PostSaleImportSummary = {
  rows: number;
  unitsCreated: number;
  unitsReused: number;
  contactsCreated: number;
  contactsReused: number;
  errors: { row: number; message: string }[];
};

export type PostSaleImportRowPreview = {
  row: number;
  unidad: string;
  piso: string;
  dni: string;
  nombre: string;
  unitStatus: "nueva" | "existente";
  contactStatus: "nuevo" | "existente";
};

type ParsedRow = {
  rowNumber: number;
  label: string;
  taxId: string;
  floor: string;
  nombre: string;
  email: string;
  telefono: string;
  entrega: string;
};

// Parseo del archivo, compartido entre la vista previa y la importación
// real — ninguna de las dos debería poder leer el archivo de forma
// distinta a la otra.
async function readImportRows(form: FormData) {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new ActionError("Elegí un archivo para importar");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  } catch {
    throw new ActionError("No pudimos leer el archivo. Verificá que sea .csv, .xls o .xlsx");
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!sheet) throw new ActionError("El archivo no tiene hojas con datos");

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (!rawRows.length) throw new ActionError("El archivo no tiene filas de datos");
  if (rawRows.length > MAX_ROWS) {
    throw new ActionError(`El archivo tiene demasiadas filas (máximo ${MAX_ROWS})`);
  }

  const rows: ParsedRow[] = [];
  const structuralErrors: { row: number; message: string }[] = [];

  rawRows.forEach((raw, i) => {
    const rowNumber = i + 2; // +1 por el encabezado, +1 porque las planillas empiezan en 1
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      const alias = HEADER_ALIASES[key.trim().toLowerCase()];
      if (alias) normalized[alias] = String(value ?? "").trim();
    }
    const label = normalized.unidad ?? "";
    const taxId = normalized.dni ?? "";
    if (!label || !taxId) {
      structuralErrors.push({
        row: rowNumber,
        message: !label ? "Falta la columna unidad" : "Falta la columna propietario_dni",
      });
      return;
    }
    rows.push({
      rowNumber,
      label,
      taxId,
      floor: normalized.piso ?? "",
      nombre: normalized.nombre ?? "",
      email: normalized.email ?? "",
      telefono: normalized.telefono ?? "",
      entrega: normalized.entrega ?? "",
    });
  });

  return { total: rawRows.length, rows, structuralErrors };
}

// Vista previa: mismas cuentas que la importación real (unidades/contactos
// nuevos vs. reusados, filas con problemas), pero de solo lectura — no
// escribe nada. Deja que el admin revise antes de comprometerse.
export async function previewPostSaleImport(developmentId: string, form: FormData) {
  try {
    const { tenant, assignedDevelopmentIds } = await requirePostSaleStaff();
    if (assignedDevelopmentIds && !assignedDevelopmentIds.includes(developmentId)) {
      throw new ActionError("No tenés acceso a este desarrollo");
    }
    const development = await prisma.postSaleDevelopment.findFirst({
      where: { id: developmentId, tenantId: tenant.id },
    });
    if (!development) throw new ActionError("Desarrollo no encontrado");

    const { total, rows, structuralErrors } = await readImportRows(form);

    const existingUnitLabels = new Set(
      (
        await prisma.postSaleUnit.findMany({
          where: { tenantId: tenant.id, developmentId },
          select: { label: true },
        })
      ).map((u) => u.label.toLowerCase()),
    );
    const seenLabels = new Set<string>();
    const existingTaxIds = new Set(
      (
        await prisma.postSaleContact.findMany({
          where: { tenantId: tenant.id, kind: "OWNER" },
          select: { taxId: true },
        })
      ).map((c) => c.taxId),
    );
    const seenTaxIds = new Set<string>();

    const summary: PostSaleImportSummary = {
      rows: total,
      unitsCreated: 0,
      unitsReused: 0,
      contactsCreated: 0,
      contactsReused: 0,
      errors: [...structuralErrors],
    };
    const preview: PostSaleImportRowPreview[] = [];

    for (const row of rows) {
      const labelKey = row.label.toLowerCase();
      const unitStatus = existingUnitLabels.has(labelKey) || seenLabels.has(labelKey) ? "existente" : "nueva";
      if (unitStatus === "existente") summary.unitsReused++;
      else summary.unitsCreated++;
      seenLabels.add(labelKey);

      const contactStatus = existingTaxIds.has(row.taxId) || seenTaxIds.has(row.taxId) ? "existente" : "nuevo";
      if (contactStatus === "existente") summary.contactsReused++;
      else summary.contactsCreated++;
      seenTaxIds.add(row.taxId);

      preview.push({
        row: row.rowNumber,
        unidad: row.label,
        piso: row.floor,
        dni: row.taxId,
        nombre: row.nombre,
        unitStatus,
        contactStatus,
      });
    }

    return { ok: true as const, summary, preview };
  } catch (err) {
    return toUserError(err, "No se pudo procesar el archivo");
  }
}

export async function importPostSaleUnits(developmentId: string, form: FormData) {
  try {
    const { tenant, assignedDevelopmentIds } = await requirePostSaleStaff();
    if (assignedDevelopmentIds && !assignedDevelopmentIds.includes(developmentId)) {
      throw new ActionError("No tenés acceso a este desarrollo");
    }
    const development = await prisma.postSaleDevelopment.findFirst({
      where: { id: developmentId, tenantId: tenant.id },
    });
    if (!development) throw new ActionError("Desarrollo no encontrado");

    const { total, rows, structuralErrors } = await readImportRows(form);

    const summary: PostSaleImportSummary = {
      rows: total,
      unitsCreated: 0,
      unitsReused: 0,
      contactsCreated: 0,
      contactsReused: 0,
      errors: [...structuralErrors],
    };

    // Unidades ya vistas en esta importación (incluye las que ya existían
    // antes de correrla) — así dos filas con la misma "unidad" (co-
    // propietarios) reusan la unidad en vez de duplicarla.
    const unitCache = new Map<string, string>();
    const existingUnits = await prisma.postSaleUnit.findMany({
      where: { tenantId: tenant.id, developmentId },
      select: { id: true, label: true },
    });
    for (const u of existingUnits) unitCache.set(u.label.toLowerCase(), u.id);

    for (const row of rows) {
      // Cada fila en su propia transacción chica — si una fila falla no
      // hace falta descartar las que ya se cargaron, y no se arriesga un
      // timeout de transacción con archivos grandes.
      try {
        await prisma.$transaction(async (tx) => {
          let unitId = unitCache.get(row.label.toLowerCase());
          if (!unitId) {
            const unit = await tx.postSaleUnit.create({
              data: {
                tenantId: tenant.id,
                developmentId,
                label: row.label,
                floor: row.floor || undefined,
                deliveredAt: parseDeliveredAt(row.entrega),
              },
            });
            unitId = unit.id;
            unitCache.set(row.label.toLowerCase(), unitId);
            summary.unitsCreated++;
          } else {
            summary.unitsReused++;
          }

          const existingContact = await tx.postSaleContact.findFirst({
            where: { tenantId: tenant.id, taxId: row.taxId, kind: "OWNER" },
          });
          const contact =
            existingContact ??
            (await tx.postSaleContact.create({
              data: {
                tenantId: tenant.id,
                kind: "OWNER",
                taxId: row.taxId,
                name: row.nombre || null,
                email: row.email || null,
                phone: row.telefono || null,
              },
            }));
          if (existingContact) summary.contactsReused++;
          else summary.contactsCreated++;

          const existingMember = await tx.postSaleUnitMember.findFirst({
            where: { tenantId: tenant.id, unitId, contactId: contact.id },
          });
          if (!existingMember) {
            await tx.postSaleUnitMember.create({
              data: { tenantId: tenant.id, unitId, contactId: contact.id },
            });
          }
        });
      } catch (err) {
        summary.errors.push({
          row: row.rowNumber,
          message: err instanceof Error ? err.message : "No se pudo procesar la fila",
        });
      }
    }

    revalidatePath(`/admin/postventa/desarrollos/${developmentId}`);
    return { ok: true as const, summary };
  } catch (err) {
    return toUserError(err, "No se pudo importar el archivo");
  }
}
