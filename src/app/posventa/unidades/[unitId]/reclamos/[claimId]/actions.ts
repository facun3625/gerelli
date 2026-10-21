"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getPostSaleContact } from "@/lib/require-post-sale-portal";
import { ActionError, toUserError } from "@/lib/action-error";

const messageSchema = z.object({
  body: z.string().trim().min(1, "Escribí un mensaje").max(2000),
});

// Cualquier miembro de la unidad (no solo quien generó el reclamo) puede
// escribir — "quien maneja la unidad", no únicamente el autor original.
async function requireUnitAccess(claimId: string) {
  const { tenant, contact } = await getPostSaleContact();
  if (!tenant || !contact) throw new ActionError("Iniciá sesión para continuar");
  const claim = await prisma.postSaleClaim.findFirst({
    where: { id: claimId, tenantId: tenant.id },
    select: { unitId: true },
  });
  if (!claim) throw new ActionError("Reclamo no encontrado");
  const member = await prisma.postSaleUnitMember.findFirst({
    where: { tenantId: tenant.id, unitId: claim.unitId, contactId: contact.id },
  });
  if (!member) throw new ActionError("No tenés acceso a este reclamo");
  return { tenant, contact, unitId: claim.unitId };
}

export async function sendPostSaleClaimMessageOwner(claimId: string, form: FormData) {
  let unitId: string | undefined;
  try {
    const access = await requireUnitAccess(claimId);
    unitId = access.unitId;
    const parsed = messageSchema.parse({ body: form.get("body") });

    await prisma.$transaction([
      prisma.postSaleClaimMessage.create({
        data: {
          claimId,
          sender: "OWNER",
          senderName: access.contact.name ?? "Propietario",
          body: parsed.body,
        },
      }),
      prisma.postSaleClaim.update({ where: { id: claimId }, data: { ownerLastReadAt: new Date() } }),
    ]);
  } catch (err) {
    return toUserError(err, "No se pudo enviar el mensaje");
  }
  revalidatePath(`/posventa/unidades/${unitId}/reclamos/${claimId}`);
  return { ok: true as const };
}

export async function markPostSaleClaimReadByOwner(claimId: string) {
  try {
    const { tenant } = await requireUnitAccess(claimId);
    await prisma.postSaleClaim.updateMany({
      where: { id: claimId, tenantId: tenant.id },
      data: { ownerLastReadAt: new Date() },
    });
  } catch {
    // Sin acceso o sin sesión — no hay nada que marcar como leído.
  }
}
