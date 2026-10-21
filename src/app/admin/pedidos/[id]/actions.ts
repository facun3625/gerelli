"use server";

import { ActionError, toUserError } from "@/lib/action-error";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/require-admin";
import type { OrderStatus } from "@/generated/prisma/client";
import { restoreStockForOrder } from "@/lib/stock";

// Los tres estados "activos" del pedido se pueden reasignar libremente
// entre sí en cualquier sentido (incluso desde Entregado hacia atrás, por
// si el admin se equivocó) — no es un avance de un solo paso como antes.
const ACTIVE_STATUSES: OrderStatus[] = ["CONFIRMED", "PREPARING", "DELIVERED"];

const CANCELLABLE_FROM: OrderStatus[] = ["CONFIRMED", "PREPARING"];

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  try {
    return await runUpdateOrderStatus(orderId, status);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar el pedido");
  }
}

async function runUpdateOrderStatus(orderId: string, status: OrderStatus) {
  const { tenant } = await requireTenantAdmin();

  const order = await prisma.order.findUnique({ where: { id: orderId, tenantId: tenant.id } });
  if (!order) throw new ActionError("Pedido no encontrado");

  const isActiveSwitch = ACTIVE_STATUSES.includes(order.status) && ACTIVE_STATUSES.includes(status);
  const isCancel = status === "CANCELLED" && CANCELLABLE_FROM.includes(order.status);
  if (!isActiveSwitch && !isCancel) throw new ActionError("Ese cambio de estado no es válido");

  await prisma.$transaction(async (tx) => {
    if (isCancel) {
      await restoreStockForOrder(tx, orderId);
    }
    await tx.order.update({ where: { id: orderId }, data: { status } });
  });
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin", "layout");
  return { ok: true as const };
}

export async function approveOrder(orderId: string) {
  try {
    return await runApproveOrder(orderId);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar el pedido");
  }
}

async function runApproveOrder(orderId: string) {
  const { tenant } = await requireTenantAdmin();

  const order = await prisma.order.findUnique({ where: { id: orderId, tenantId: tenant.id } });
  if (!order) throw new ActionError("Pedido no encontrado");

  await prisma.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "CONFIRMED" } });
    await tx.paymentProof.updateMany({ where: { orderId }, data: { status: "APPROVED", reviewedAt: new Date() } });
  });

  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin", "layout");
  return { ok: true as const };
}

export async function rejectOrder(orderId: string) {
  try {
    return await runRejectOrder(orderId);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar el pedido");
  }
}

async function runRejectOrder(orderId: string) {
  const { tenant } = await requireTenantAdmin();

  const order = await prisma.order.findUnique({ where: { id: orderId, tenantId: tenant.id } });
  if (!order) throw new ActionError("Pedido no encontrado");

  await prisma.$transaction(async (tx) => {
    await restoreStockForOrder(tx, orderId);
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    await tx.paymentProof.updateMany({ where: { orderId }, data: { status: "REJECTED", reviewedAt: new Date() } });
  });

  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  revalidatePath("/admin", "layout");
  return { ok: true as const };
}
