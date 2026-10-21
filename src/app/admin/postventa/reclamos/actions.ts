"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { ActionError, toUserError } from "@/lib/action-error";
import { uploadClaimPhotos } from "@/lib/post-sale-photos";

const statusSchema = z.object({
  status: z.enum(["NEW", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "REJECTED", "CLOSED"]),
  notes: z.string().trim().max(4000).optional(),
});

export async function updatePostSaleClaimStatus(claimId: string, form: FormData) {
  try {
    const { tenant, assignedDevelopmentIds } = await requirePostSaleStaff();
    const claim = await prisma.postSaleClaim.findFirst({
      where: { id: claimId, tenantId: tenant.id },
      select: { developmentId: true, status: true },
    });
    if (!claim) throw new ActionError("Reclamo no encontrado");
    if (assignedDevelopmentIds && !assignedDevelopmentIds.includes(claim.developmentId)) {
      throw new ActionError("No tenés acceso a este reclamo");
    }
    const parsed = statusSchema.parse({
      status: form.get("status"),
      notes: form.get("notes") || undefined,
    });

    // Sin esto, reenviar el mismo estado sin nota (ej: doble click en
    // "Actualizar") deja entradas idénticas repetidas en el historial — solo
    // vale la pena una entrada nueva si cambió el estado o se dejó una nota.
    if (parsed.status === claim.status && !parsed.notes) {
      throw new ActionError("No hay cambios para guardar");
    }

    await prisma.$transaction(async (tx) => {
      const updated = await tx.postSaleClaim.update({
        where: { id: claimId, tenantId: tenant.id },
        data: { status: parsed.status },
      });
      await tx.postSaleClaimEvent.create({
        data: { claimId: updated.id, status: updated.status, notes: parsed.notes },
      });
    });
  } catch (err) {
    return toUserError(err, "No se pudo actualizar el reclamo");
  }
  revalidatePath("/admin/postventa/reclamos");
  revalidatePath(`/admin/postventa/reclamos/${claimId}`);
  return { ok: true as const };
}

const newClaimSchema = z.object({
  developmentId: z.string().min(1, "Elegí un desarrollo"),
  unitId: z.string().min(1, "Elegí una unidad"),
  contactId: z.string().min(1, "Elegí un propietario"),
  sectionId: z.string().min(1, "Elegí una sección"),
  rubroId: z.string().min(1, "Elegí un rubro"),
  title: z.string().trim().min(1, "Contanos brevemente qué pasa").max(120),
  description: z.string().trim().max(4000).optional(),
});

// El staff carga el reclamo en nombre de un propietario ya cargado en la
// unidad (name/taxId precargados por "Cargar propietario") — no hace falta
// que el propietario esté registrado con Google todavía.
export async function createPostSaleClaimByStaff(form: FormData) {
  try {
    const { tenant, assignedDevelopmentIds } = await requirePostSaleStaff();
    const parsed = newClaimSchema.parse({
      developmentId: form.get("developmentId"),
      unitId: form.get("unitId"),
      contactId: form.get("contactId"),
      sectionId: form.get("sectionId"),
      rubroId: form.get("rubroId"),
      title: form.get("title"),
      description: form.get("description") || undefined,
    });
    if (assignedDevelopmentIds && !assignedDevelopmentIds.includes(parsed.developmentId)) {
      throw new ActionError("No tenés acceso a ese desarrollo");
    }

    const [unit, member, section, rubro] = await Promise.all([
      prisma.postSaleUnit.findFirst({
        where: { id: parsed.unitId, tenantId: tenant.id, developmentId: parsed.developmentId },
      }),
      prisma.postSaleUnitMember.findFirst({
        where: { tenantId: tenant.id, unitId: parsed.unitId, contactId: parsed.contactId },
      }),
      prisma.postSaleSection.findFirst({
        where: { id: parsed.sectionId, tenantId: tenant.id, developmentId: parsed.developmentId },
      }),
      prisma.postSaleRubro.findFirst({ where: { id: parsed.rubroId, tenantId: tenant.id, sectionId: parsed.sectionId } }),
    ]);
    if (!unit) throw new ActionError("Unidad no encontrada");
    if (!member) throw new ActionError("Ese propietario no está cargado en esa unidad");
    if (!section || !rubro) throw new ActionError("La sección o el rubro elegido no es válido");

    const photos = await uploadClaimPhotos(form, tenant.id);

    await prisma.postSaleClaim.create({
      data: {
        tenantId: tenant.id,
        developmentId: parsed.developmentId,
        unitId: parsed.unitId,
        contactId: parsed.contactId,
        sectionId: parsed.sectionId,
        rubroId: parsed.rubroId,
        title: parsed.title,
        description: parsed.description ?? "",
        photos,
        events: { create: { status: "NEW" } },
      },
    });
  } catch (err) {
    return toUserError(err, "No se pudo crear el reclamo");
  }
  revalidatePath("/admin/postventa/reclamos");
  return { ok: true as const };
}

const messageSchema = z.object({
  body: z.string().trim().min(1, "Escribí un mensaje").max(2000),
});

export async function sendPostSaleClaimMessageStaff(claimId: string, form: FormData) {
  try {
    const { tenant, session, assignedDevelopmentIds } = await requirePostSaleStaff();
    const claim = await prisma.postSaleClaim.findFirst({
      where: { id: claimId, tenantId: tenant.id },
      select: { developmentId: true },
    });
    if (!claim) throw new ActionError("Reclamo no encontrado");
    if (assignedDevelopmentIds && !assignedDevelopmentIds.includes(claim.developmentId)) {
      throw new ActionError("No tenés acceso a este reclamo");
    }
    const parsed = messageSchema.parse({ body: form.get("body") });

    await prisma.$transaction([
      prisma.postSaleClaimMessage.create({
        data: {
          claimId,
          sender: "STAFF",
          senderName: session.user.name ?? "Staff",
          body: parsed.body,
        },
      }),
      // Mandar un mensaje implica haber visto el hilo hasta ahora.
      prisma.postSaleClaim.update({ where: { id: claimId }, data: { staffLastReadAt: new Date() } }),
    ]);
  } catch (err) {
    return toUserError(err, "No se pudo enviar el mensaje");
  }
  revalidatePath(`/admin/postventa/reclamos/${claimId}`);
  revalidatePath("/admin/postventa/reclamos");
  return { ok: true as const };
}

// Se llama al abrir la ficha del reclamo — marca el hilo como leído por el
// staff. Es una escritura durante un GET a propósito (mismo criterio que
// "visto" de una notificación): no necesita su propio botón ni revalidación
// aparte, el contador de no leídos ya se recalcula en el próximo render.
export async function markPostSaleClaimReadByStaff(claimId: string, tenantId: string) {
  await prisma.postSaleClaim.updateMany({
    where: { id: claimId, tenantId },
    data: { staffLastReadAt: new Date() },
  });
}

async function requireClaimAccess(claimId: string) {
  const { tenant, assignedDevelopmentIds } = await requirePostSaleStaff();
  const claim = await prisma.postSaleClaim.findFirst({
    where: { id: claimId, tenantId: tenant.id },
    select: { developmentId: true },
  });
  if (!claim) throw new ActionError("Reclamo no encontrado");
  if (assignedDevelopmentIds && !assignedDevelopmentIds.includes(claim.developmentId)) {
    throw new ActionError("No tenés acceso a este reclamo");
  }
  return { tenant, developmentId: claim.developmentId };
}

// managerId vacío = "sin asignar" (lo saca). Solo se puede asignar a un
// administrador que ya tenga ESE desarrollo asignado — no tiene sentido
// derivarle un reclamo a alguien que después no lo va a poder ver.
export async function assignPostSaleClaimManager(claimId: string, managerId: string) {
  try {
    const { tenant, developmentId } = await requireClaimAccess(claimId);
    if (managerId) {
      const assignment = await prisma.postSaleManagerBuilding.findFirst({
        where: { tenantId: tenant.id, managerId, developmentId },
      });
      if (!assignment) throw new ActionError("Ese administrador no tiene este desarrollo asignado");
    }
    await prisma.postSaleClaim.update({
      where: { id: claimId, tenantId: tenant.id },
      data: { assignedManagerId: managerId || null },
    });
  } catch (err) {
    return toUserError(err, "No se pudo asignar el administrador");
  }
  revalidatePath(`/admin/postventa/reclamos/${claimId}`);
  revalidatePath("/admin/postventa/reclamos");
  return { ok: true as const };
}

export async function assignPostSaleClaimProvider(claimId: string, providerId: string) {
  try {
    const { tenant } = await requireClaimAccess(claimId);
    if (providerId) {
      const provider = await prisma.postSaleProvider.findFirst({ where: { id: providerId, tenantId: tenant.id } });
      if (!provider) throw new ActionError("Proveedor no encontrado");
    }
    await prisma.postSaleClaim.update({
      where: { id: claimId, tenantId: tenant.id },
      data: { assignedProviderId: providerId || null },
    });
  } catch (err) {
    return toUserError(err, "No se pudo derivar el reclamo");
  }
  revalidatePath(`/admin/postventa/reclamos/${claimId}`);
  revalidatePath("/admin/postventa/reclamos");
  return { ok: true as const };
}
