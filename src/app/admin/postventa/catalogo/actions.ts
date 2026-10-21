"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { ActionError, toUserError } from "@/lib/action-error";

// El catálogo default del tenant (developmentId null) es una configuración
// global de la constructora, no de un desarrollo puntual — solo el
// administrador de la cuenta lo edita, no un PostSaleManager con
// desarrollos asignados.
async function requireAdmin() {
  const { tenant, session } = await requirePostSaleStaff();
  if (session.user.role !== "ADMIN") {
    throw new ActionError("Solo un administrador puede editar el catálogo por defecto");
  }
  return { tenant };
}

const nameSchema = z
  .string()
  .trim()
  .min(1, "Ingresá un nombre")
  .max(80, "El nombre puede tener hasta 80 caracteres");

function parseWarrantyMonths(value: FormDataEntryValue | null): number | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const parsed = z.coerce.number().int().min(0, "La garantía no puede ser negativa").max(600).parse(raw);
  return parsed;
}

export async function createDefaultSection(form: FormData) {
  try {
    const { tenant } = await requireAdmin();
    const name = nameSchema.parse(form.get("name"));
    const count = await prisma.postSaleSection.count({
      where: { tenantId: tenant.id, developmentId: null },
    });
    await prisma.$transaction(async (tx) => {
      const section = await tx.postSaleSection.create({
        data: { tenantId: tenant.id, developmentId: null, name, order: count },
      });
      // Toda sección arranca con un rubro catch-all "Otros" — el reclamo
      // siempre puede caer ahí si no encaja en el resto del catálogo.
      await tx.postSaleRubro.create({
        data: {
          tenantId: tenant.id,
          sectionId: section.id,
          name: "Otros",
          isCatchAll: true,
          order: 0,
        },
      });
    });
    revalidatePath("/admin/postventa/catalogo");
    return { ok: true as const };
  } catch (err) {
    return toUserError(err, "No se pudo crear la sección");
  }
}

export async function deleteDefaultSection(sectionId: string) {
  try {
    const { tenant } = await requireAdmin();
    await prisma.postSaleSection.delete({
      where: { id: sectionId, tenantId: tenant.id, developmentId: null },
    });
    revalidatePath("/admin/postventa/catalogo");
    return { ok: true as const };
  } catch (err) {
    return toUserError(err, "No se pudo eliminar la sección");
  }
}

export async function createDefaultRubro(sectionId: string, form: FormData) {
  try {
    const { tenant } = await requireAdmin();
    const name = nameSchema.parse(form.get("name"));
    const section = await prisma.postSaleSection.findFirst({
      where: { id: sectionId, tenantId: tenant.id, developmentId: null },
    });
    if (!section) throw new ActionError("Sección no encontrada");
    const warrantyMonths = parseWarrantyMonths(form.get("warrantyMonths"));
    const count = await prisma.postSaleRubro.count({ where: { tenantId: tenant.id, sectionId } });
    await prisma.postSaleRubro.create({
      data: { tenantId: tenant.id, sectionId, name, order: count, warrantyMonths },
    });
    revalidatePath("/admin/postventa/catalogo");
    return { ok: true as const };
  } catch (err) {
    return toUserError(err, "No se pudo crear el rubro");
  }
}

export async function deleteDefaultRubro(rubroId: string) {
  try {
    const { tenant } = await requireAdmin();
    const rubro = await prisma.postSaleRubro.findFirst({
      where: { id: rubroId, tenantId: tenant.id },
    });
    if (!rubro) throw new ActionError("Rubro no encontrado");
    if (rubro.isCatchAll) throw new ActionError('El rubro "Otros" no se puede eliminar');
    await prisma.postSaleRubro.delete({ where: { id: rubroId, tenantId: tenant.id } });
    revalidatePath("/admin/postventa/catalogo");
    return { ok: true as const };
  } catch (err) {
    return toUserError(err, "No se pudo eliminar el rubro");
  }
}
