"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/require-admin";
import { logGroupStockMovement } from "@/lib/stock-movements";

export async function deleteOrders(orderIds: string[]) {
  const { tenant } = await requireTenantAdmin();
  if (orderIds.length === 0) return;

  const orders = await prisma.order.findMany({
    where: { id: { in: orderIds }, tenantId: tenant.id },
    include: { items: { include: { productVariant: true } } },
  });
  if (orders.length === 0) return;

  await prisma.$transaction(async (tx) => {
    for (const order of orders) {
      // Un pedido CANCELLED ya devolvió su stock al cancelarse/rechazarse
      // (ver restoreStockForOrder en admin/pedidos/[id]/actions.ts) — restarlo
      // de nuevo acá lo hacía descontar dos veces y quedar en negativo.
      if (order.status === "CANCELLED") continue;

      const byGroup = new Map<string, number>();
      for (const item of order.items) {
        const groupId = item.productVariant.stockGroupId;
        byGroup.set(groupId, (byGroup.get(groupId) ?? 0) + item.quantity);
      }
      for (const [stockGroupId, quantity] of byGroup) {
        await tx.stockGroupStock.updateMany({
          where: { stockGroupId, deliveryDateId: order.deliveryDateId },
          data: { quantitySold: { decrement: quantity } },
        });
        await logGroupStockMovement(tx, {
          tenantId: tenant.id,
          deliveryDateId: order.deliveryDateId,
          stockGroupId,
          reason: "RESTOCK",
          delta: quantity,
          note: `Pedido ${order.id} borrado`,
        });
      }
    }
    await tx.order.deleteMany({ where: { id: { in: orders.map((o) => o.id) }, tenantId: tenant.id } });
  });

  revalidatePath("/admin/pedidos");
  revalidatePath("/admin/fechas");
}
