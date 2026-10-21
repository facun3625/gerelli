import { prisma } from "@/lib/prisma";
import { logGroupStockMovement } from "@/lib/stock-movements";

const UNLIMITED_STOCK = 999;

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0];

// Devuelve al stock lo que un pedido había reservado. El stock se descuenta
// al crear el pedido (incluso antes de que el pago esté confirmado), así que
// cancelar tiene que revertirlo.
//
// Vive acá y no en el archivo de acciones del admin porque lo usan dos
// lugares: el admin al rechazar/cancelar, y el webhook de MercadoPago cuando
// un pago se rechaza. Duplicar lógica de stock es la forma más rápida de que
// los dos caminos se desincronicen.
export async function restoreStockForOrder(tx: Tx, orderId: string, note?: string) {
  const items = await tx.orderItem.findMany({
    where: { orderId },
    include: { productVariant: true },
  });
  const order = await tx.order.findUniqueOrThrow({ where: { id: orderId } });

  const byGroup = new Map<string, number>();
  for (const item of items) {
    const groupId = item.productVariant.stockGroupId;
    byGroup.set(groupId, (byGroup.get(groupId) ?? 0) + item.quantity);
  }
  for (const [stockGroupId, quantity] of byGroup) {
    await tx.stockGroupStock.updateMany({
      where: { stockGroupId, deliveryDateId: order.deliveryDateId },
      data: { quantitySold: { decrement: quantity } },
    });
    await logGroupStockMovement(tx, {
      tenantId: order.tenantId,
      deliveryDateId: order.deliveryDateId,
      stockGroupId,
      reason: "RESTOCK",
      delta: quantity,
      note: note ?? `Pedido ${order.id} cancelado`,
    });
  }
}

// Remanente real, leído en el momento — usado para revalidar justo antes de
// agregar/incrementar en el carrito, porque el remanente que trae la página
// puede haber quedado viejo (otra persona compró, o el admin ajustó stock).
export async function getRemainingForVariant(
  tenantId: string,
  deliveryDateId: string,
  variantId: string,
): Promise<number> {
  const [tenant, deliveryDate, variant] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.deliveryDate.findUnique({ where: { id: deliveryDateId, tenantId } }),
    prisma.productVariant.findFirst({
      where: { id: variantId, product: { tenantId } },
      include: { product: true },
    }),
  ]);
  if (!tenant || !deliveryDate || !variant) return 0;

  if (tenant.orderingMode === "WEEKLY_HOURS" && variant.product.soldOutToday) return 0;
  if (deliveryDate.stockMode === "UNLIMITED") return UNLIMITED_STOCK;

  const stock = await prisma.stockGroupStock.findUnique({
    where: { stockGroupId_deliveryDateId: { stockGroupId: variant.stockGroupId, deliveryDateId } },
  });
  if (!stock || stock.quantityAvailable == null) return UNLIMITED_STOCK;
  return Math.max(0, stock.quantityAvailable - stock.quantitySold);
}

// Batch de la misma cuenta de arriba, para no hacer N+1 al armar el
// catálogo (una consulta por variante mostrada).
export async function getRemainingForVariants(
  tenantId: string,
  deliveryDateId: string,
  variantIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (variantIds.length === 0) return result;

  const [tenant, deliveryDate, variants] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId } }),
    prisma.deliveryDate.findUnique({ where: { id: deliveryDateId, tenantId } }),
    prisma.productVariant.findMany({
      where: { id: { in: variantIds }, product: { tenantId } },
      include: { product: true },
    }),
  ]);
  if (!tenant || !deliveryDate) {
    for (const id of variantIds) result.set(id, 0);
    return result;
  }

  if (deliveryDate.stockMode === "UNLIMITED") {
    for (const v of variants) {
      const remaining = tenant.orderingMode === "WEEKLY_HOURS" && v.product.soldOutToday ? 0 : UNLIMITED_STOCK;
      result.set(v.id, remaining);
    }
    return result;
  }

  const stockGroupIds = [...new Set(variants.map((v) => v.stockGroupId))];
  const stocks = await prisma.stockGroupStock.findMany({
    where: { deliveryDateId, stockGroupId: { in: stockGroupIds } },
  });
  const stockByGroup = new Map(stocks.map((s) => [s.stockGroupId, s]));

  for (const v of variants) {
    if (tenant.orderingMode === "WEEKLY_HOURS" && v.product.soldOutToday) {
      result.set(v.id, 0);
      continue;
    }
    const stock = stockByGroup.get(v.stockGroupId);
    if (!stock || stock.quantityAvailable == null) {
      result.set(v.id, UNLIMITED_STOCK);
      continue;
    }
    result.set(v.id, Math.max(0, stock.quantityAvailable - stock.quantitySold));
  }
  return result;
}

// Remanente a nivel producto (el máximo entre sus variantes) — usado antes
// de que el cliente elija una variante puntual, ej. el badge "agotado" de
// la card del catálogo.
export async function getRemainingForProduct(
  tenantId: string,
  deliveryDateId: string,
  productId: string,
): Promise<number> {
  const variants = await prisma.productVariant.findMany({
    where: { productId, active: true, product: { tenantId } },
    select: { id: true },
  });
  if (variants.length === 0) return 0;
  const remaining = await getRemainingForVariants(
    tenantId,
    deliveryDateId,
    variants.map((v) => v.id),
  );
  return Math.max(0, ...remaining.values());
}
