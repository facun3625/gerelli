import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/require-admin";
import { DateEditor } from "./date-editor";

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

function toDatetimeLocalValue(d: Date) {
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function variantLabel(productName: string, gusto: string | null, tamano: string | null) {
  const suffix = [gusto, tamano].filter(Boolean).join(" · ");
  return suffix ? `${productName} — ${suffix}` : productName;
}

export default async function EditDeliveryDatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenant } = await requireTenantAdmin();

  const [deliveryDate, variants, stockGroups, pickupEnabled, dateSlots, defaultSlots, movements, costs] =
    await Promise.all([
      prisma.deliveryDate.findUnique({ where: { id, tenantId: tenant.id } }),
      prisma.productVariant.findMany({
        where: { active: true, product: { tenantId: tenant.id, active: true } },
        include: { product: true },
        orderBy: [{ product: { name: "asc" } }, { order: "asc" }],
      }),
      prisma.stockGroup.findMany({
        where: { tenantId: tenant.id },
        select: { id: true, name: true, isIndividual: true, stock: { where: { deliveryDateId: id } } },
        orderBy: { name: "asc" },
      }),
      prisma.fulfillmentMethodConfig
        .findUnique({ where: { tenantId_type: { tenantId: tenant.id, type: "PICKUP" } } })
        .then((row) => row?.enabled ?? false),
      prisma.pickupSlot.findMany({
        where: { tenantId: tenant.id, deliveryDateId: id },
        orderBy: { order: "asc" },
      }),
      prisma.pickupSlot.findMany({
        where: { tenantId: tenant.id, deliveryDateId: null },
        orderBy: { order: "asc" },
      }),
      prisma.stockMovement.findMany({
        where: { tenantId: tenant.id, deliveryDateId: id },
        include: { stockGroup: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.deliveryDateCost.findMany({
        where: { deliveryDateId: id },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  if (!deliveryDate) notFound();

  // Toda variante activa pertenece a un pozo (propio o compartido); acá se
  // arma una sola lista, un pozo de stock por grupo. Un pozo individual
  // (isIndividual) muestra el nombre del producto en vivo en vez del nombre
  // guardado del pozo — ese nombre es solo una foto del momento en que se
  // creó y queda desactualizado si el producto se renombra después.
  const groups = stockGroups
    .map((g) => {
      const memberNames = variants
        .filter((v) => v.stockGroupId === g.id)
        .map((v) => variantLabel(v.product.name, v.gusto, v.tamano));
      const stock = g.stock[0];
      return {
        id: g.id,
        name: g.isIndividual && memberNames[0] ? memberNames[0] : g.name,
        productNames: memberNames,
        quantityAvailable: stock?.quantityAvailable ?? null,
        quantitySold: stock?.quantitySold ?? 0,
      };
    })
    .filter((g) => g.productNames.length > 0);

  return (
    <DateEditor
      key={deliveryDate.id}
      deliveryDate={{
        id: deliveryDate.id,
        date: toDateInputValue(deliveryDate.date),
        orderOpenAt: deliveryDate.orderOpenAt ? toDatetimeLocalValue(deliveryDate.orderOpenAt) : null,
        cutoffAt: deliveryDate.cutoffAt ? toDatetimeLocalValue(deliveryDate.cutoffAt) : null,
        capacity: deliveryDate.capacity,
        notes: deliveryDate.notes,
        status: deliveryDate.status,
        showCatalogBeforeOpen: deliveryDate.showCatalogBeforeOpen,
      }}
      stockMode={deliveryDate.stockMode}
      groups={groups}
      pickupEnabled={pickupEnabled}
      dateSlots={dateSlots}
      defaultSlots={defaultSlots}
      movements={movements.map((m) => ({
        id: m.id,
        targetName: m.stockGroup?.name ?? "—",
        reason: m.reason,
        delta: m.delta,
        quantityAvailable: m.quantityAvailable,
        quantitySold: m.quantitySold,
        note: m.note,
        createdAt: m.createdAt.toISOString(),
      }))}
      costs={costs.map((c) => ({
        id: c.id,
        label: c.label,
        amount: Number(c.amount),
        createdAt: c.createdAt.toISOString(),
      }))}
    />
  );
}
