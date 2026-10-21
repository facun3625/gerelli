"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { ActionError, toUserError } from "@/lib/action-error";

// A diferencia del catálogo default (solo ADMIN), el catálogo instancia de
// un desarrollo ya asignado lo puede tocar también su PostSaleManager — de
// ahí que se valide el alcance (assignedDevelopmentIds) en vez de exigir
// ADMIN a secas.
async function requireDevelopmentAccess(developmentId: string) {
  const { tenant, assignedDevelopmentIds } = await requirePostSaleStaff();
  if (assignedDevelopmentIds && !assignedDevelopmentIds.includes(developmentId)) {
    throw new ActionError("No tenés acceso a este desarrollo");
  }
  const development = await prisma.postSaleDevelopment.findFirst({
    where: { id: developmentId, tenantId: tenant.id },
  });
  if (!development) throw new ActionError("Desarrollo no encontrado");
  return { tenant, development };
}

const nameSchema = z.string().trim().min(1, "Ingresá un nombre").max(80);

function parseWarrantyMonths(value: FormDataEntryValue | null): number | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  return z.coerce.number().int().min(0, "La garantía no puede ser negativa").max(600).parse(raw);
}

export async function createInstanceSection(developmentId: string, form: FormData) {
  try {
    const { tenant } = await requireDevelopmentAccess(developmentId);
    const name = nameSchema.parse(form.get("name"));
    const count = await prisma.postSaleSection.count({
      where: { tenantId: tenant.id, developmentId },
    });
    await prisma.$transaction(async (tx) => {
      const section = await tx.postSaleSection.create({
        data: { tenantId: tenant.id, developmentId, name, order: count },
      });
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
  } catch (err) {
    return toUserError(err, "No se pudo crear la sección");
  }
  revalidatePath(`/admin/postventa/desarrollos/${developmentId}/catalogo`);
  return { ok: true as const };
}

export async function deleteInstanceSection(developmentId: string, sectionId: string) {
  try {
    const { tenant } = await requireDevelopmentAccess(developmentId);
    await prisma.postSaleSection.delete({
      where: { id: sectionId, tenantId: tenant.id, developmentId },
    });
  } catch (err) {
    return toUserError(err, "No se pudo eliminar la sección");
  }
  revalidatePath(`/admin/postventa/desarrollos/${developmentId}/catalogo`);
  return { ok: true as const };
}

export async function createInstanceRubro(developmentId: string, sectionId: string, form: FormData) {
  try {
    const { tenant } = await requireDevelopmentAccess(developmentId);
    const name = nameSchema.parse(form.get("name"));
    const section = await prisma.postSaleSection.findFirst({
      where: { id: sectionId, tenantId: tenant.id, developmentId },
    });
    if (!section) throw new ActionError("Sección no encontrada");
    const warrantyMonths = parseWarrantyMonths(form.get("warrantyMonths"));
    const count = await prisma.postSaleRubro.count({ where: { tenantId: tenant.id, sectionId } });
    await prisma.postSaleRubro.create({
      data: { tenantId: tenant.id, sectionId, name, order: count, warrantyMonths },
    });
  } catch (err) {
    return toUserError(err, "No se pudo crear el rubro");
  }
  revalidatePath(`/admin/postventa/desarrollos/${developmentId}/catalogo`);
  return { ok: true as const };
}

export async function deleteInstanceRubro(developmentId: string, rubroId: string) {
  try {
    const { tenant } = await requireDevelopmentAccess(developmentId);
    const rubro = await prisma.postSaleRubro.findFirst({ where: { id: rubroId, tenantId: tenant.id } });
    if (!rubro) throw new ActionError("Rubro no encontrado");
    if (rubro.isCatchAll) throw new ActionError('El rubro "Otros" no se puede eliminar');
    await prisma.postSaleRubro.delete({ where: { id: rubroId, tenantId: tenant.id } });
  } catch (err) {
    return toUserError(err, "No se pudo eliminar el rubro");
  }
  revalidatePath(`/admin/postventa/desarrollos/${developmentId}/catalogo`);
  return { ok: true as const };
}

// El desarrollo arranca "siguiendo el estándar" (catalogCustomized false) —
// la copia instancia ya existe (se hizo al crearlo) pero se muestra de solo
// lectura hasta que alguien decida personalizarla acá. Una vez true no se
// ofrece volver atrás solo: revertir implicaría re-copiar el catálogo
// default y podría chocar con reclamos que ya referencian las secciones/
// rubros personalizados.
export async function setDevelopmentCatalogCustomized(developmentId: string) {
  try {
    const { tenant } = await requireDevelopmentAccess(developmentId);
    await prisma.postSaleDevelopment.update({
      where: { id: developmentId, tenantId: tenant.id },
      data: { catalogCustomized: true },
    });
  } catch (err) {
    return toUserError(err, "No se pudo personalizar el catálogo");
  }
  revalidatePath(`/admin/postventa/desarrollos/${developmentId}/catalogo`);
  return { ok: true as const };
}
