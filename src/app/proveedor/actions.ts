"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireProvider } from "@/lib/require-provider";
import { ActionError, toUserError } from "@/lib/action-error";

async function requireClaimAccess(claimId: string) {
  const { tenant, provider } = await requireProvider();
  const claim = await prisma.postSaleClaim.findFirst({
    where: { id: claimId, tenantId: tenant.id, assignedProviderId: provider.id },
    select: { id: true, status: true },
  });
  if (!claim) throw new ActionError("No tenés acceso a este reclamo");
  return { tenant, provider, claim };
}

const messageSchema = z.object({
  body: z.string().trim().min(1, "Escribí un mensaje").max(2000),
});

export async function sendPostSaleClaimMessageProvider(claimId: string, form: FormData) {
  try {
    const { provider } = await requireClaimAccess(claimId);
    const parsed = messageSchema.parse({ body: form.get("body") });

    await prisma.$transaction([
      prisma.postSaleClaimMessage.create({
        data: { claimId, sender: "PROVIDER", senderName: provider.name, body: parsed.body },
      }),
      prisma.postSaleClaim.update({ where: { id: claimId }, data: { providerLastReadAt: new Date() } }),
    ]);
  } catch (err) {
    return toUserError(err, "No se pudo enviar el mensaje");
  }
  revalidatePath(`/proveedor/reclamos/${claimId}`);
  return { ok: true as const };
}

const statusSchema = z.object({
  status: z.enum(["ASSIGNED", "IN_PROGRESS", "RESOLVED"]),
  notes: z.string().trim().max(4000).optional(),
});

// El proveedor solo puede mover el reclamo dentro de los estados de trabajo
// en curso — no puede rechazarlo ni cerrarlo del todo, eso lo decide el
// staff.
export async function updatePostSaleClaimStatusByProvider(claimId: string, form: FormData) {
  try {
    const { claim } = await requireClaimAccess(claimId);
    const parsed = statusSchema.parse({
      status: form.get("status"),
      notes: form.get("notes") || undefined,
    });
    if (parsed.status === claim.status && !parsed.notes) {
      throw new ActionError("No hay cambios para guardar");
    }
    await prisma.$transaction(async (tx) => {
      const updated = await tx.postSaleClaim.update({ where: { id: claimId }, data: { status: parsed.status } });
      await tx.postSaleClaimEvent.create({
        data: { claimId: updated.id, status: updated.status, notes: parsed.notes },
      });
    });
  } catch (err) {
    return toUserError(err, "No se pudo actualizar el reclamo");
  }
  revalidatePath(`/proveedor/reclamos/${claimId}`);
  revalidatePath("/proveedor");
  return { ok: true as const };
}

export async function markPostSaleClaimReadByProvider(claimId: string) {
  try {
    const { tenant } = await requireClaimAccess(claimId);
    await prisma.postSaleClaim.updateMany({
      where: { id: claimId, tenantId: tenant.id },
      data: { providerLastReadAt: new Date() },
    });
  } catch {
    // Sin acceso — no hay nada que marcar.
  }
}
