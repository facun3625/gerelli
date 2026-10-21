"use server";

import { ActionError, toUserError } from "@/lib/action-error";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { deleteTenant } from "../tiendas/[tenantId]/actions";

// Borra una cuenta con absolutamente todo lo que tiene atado: si es dueña de
// una tienda, se borra la tienda entera (productos, pedidos, todo — ver
// deleteTenant); si además reparte código de revendedor, se borran sus
// comisiones ganadas y las tiendas que trajo quedan sin referente (no se
// borran esas tiendas, solo pierden el dato de quién las trajo). Irreversible.
export async function deleteUserAccount(userId: string) {
  try {
    return await runDeleteUserAccount(userId);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el usuario");
  }
}

async function runDeleteUserAccount(userId: string) {
  const session = await requireSuperAdmin();
  if (session.user.id === userId) {
    throw new ActionError("No podés borrar tu propia cuenta");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ActionError("Usuario no encontrado");
  if (user.role === "SUPER_ADMIN") {
    throw new ActionError("No se puede borrar una cuenta de super admin desde acá");
  }

  // deleteTenant ya se encarga de este usuario si es el dueño: lo borra
  // junto con la tienda, salvo que también sea revendedor — ahí lo conserva
  // a propósito (desvinculado, sin tienda) para no perderle el historial de
  // comisiones de otras tiendas. Ese caso se termina de limpiar abajo.
  if (user.role === "ADMIN" && user.tenantId) {
    await deleteTenant(user.tenantId);
  }

  const stillExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, referralCode: true } });
  if (!stillExists) {
    revalidatePath("/platform/usuarios");
    return;
  }

  if (stillExists.referralCode) {
    await prisma.$transaction([
      prisma.resellerCommission.deleteMany({ where: { resellerId: userId } }),
      prisma.tenant.updateMany({ where: { referredByResellerId: userId }, data: { referredByResellerId: null } }),
    ]);
  }

  // Actividad propia como cliente: se borra junto con la cuenta (a
  // diferencia de /admin/usuarios, que la protege — acá el super admin ya
  // pidió explícitamente borrar todo). Los pedidos quedan como "de
  // invitado" (userId null) en vez de borrarse, para no arruinar el
  // historial de ventas de la tienda a la que pertenecen.
  await prisma.order.updateMany({ where: { userId }, data: { userId: null } });

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/platform/usuarios");
  return { ok: true as const };
}
