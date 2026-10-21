import { prisma } from "@/lib/prisma";
import { canTenantReceiveOrders } from "@/lib/billing-status";
import { seedDefaultStock, toDateAtNoon, toHHMM, todayKey } from "@/lib/schedule";

const WEEKDAY_LABELS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];

type WeeklyWindow = {
  order: number;
  orderOpenTime: string;
  orderCloseTime: string;
  fulfillmentStart: string;
  fulfillmentEnd: string;
};

export type WeeklyAvailability =
  | {
      open: true;
      deliveryDateId: string;
      closesAt: string;
      fulfillmentLabel: string;
    }
  | { open: false; nextOpenLabel: string | null };

async function ensureTodayDeliveryDate(tenantId: string, windows: WeeklyWindow[]) {
  const date = toDateAtNoon(todayKey());
  let deliveryDate = await prisma.deliveryDate.findFirst({ where: { tenantId, date } });
  if (!deliveryDate) {
    deliveryDate = await prisma.deliveryDate.create({ data: { tenantId, date, status: "OPEN" } });
    await seedDefaultStock(tenantId, deliveryDate.id);
  } else if (deliveryDate.status !== "OPEN") {
    deliveryDate = await prisma.deliveryDate.update({
      where: { id: deliveryDate.id },
      data: { status: "OPEN" },
    });
  }

  const existingSlots = await prisma.pickupSlot.findMany({
    where: { tenantId, deliveryDateId: deliveryDate.id },
    orderBy: { id: "asc" },
  });
  const seenLabels = new Set<string>();
  const duplicateIds: string[] = [];
  for (const slot of existingSlots) {
    if (seenLabels.has(slot.label)) duplicateIds.push(slot.id);
    else seenLabels.add(slot.label);
  }
  if (duplicateIds.length > 0) {
    await prisma.pickupSlot.deleteMany({ where: { id: { in: duplicateIds } } });
  }

  const missingWindows = windows.filter((w) => !seenLabels.has(`${w.fulfillmentStart} a ${w.fulfillmentEnd}`));
  if (missingWindows.length > 0) {
    await prisma.pickupSlot.createMany({
      data: missingWindows.map((w) => ({
        tenantId,
        deliveryDateId: deliveryDate.id,
        label: `${w.fulfillmentStart} a ${w.fulfillmentEnd}`,
        order: w.order,
      })),
    });
  }

  return deliveryDate.id;
}

async function nextWeeklyOpenLabel(tenantId: string): Promise<string | null> {
  const rules = await prisma.weeklyScheduleRule.findMany({
    where: { tenantId, enabled: true },
    include: { windows: { orderBy: { order: "asc" } } },
  });
  const windowsByWeekday = new Map(rules.filter((r) => r.windows.length > 0).map((r) => [r.weekday, r.windows]));
  if (windowsByWeekday.size === 0) return null;

  const closures = await prisma.storeClosure.findMany({ where: { tenantId } });

  const now = new Date();
  const hhmm = toHHMM(now);

  for (let i = 0; i < 8; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() + i);
    if (closures.some((c) => day >= c.startDate && day <= c.endDate)) continue;
    const windows = windowsByWeekday.get(day.getDay());
    if (!windows) continue;

    const candidate = i === 0 ? windows.find((w) => w.orderOpenTime > hhmm) : windows[0];
    if (!candidate) continue;

    const dayLabel = i === 0 ? "hoy" : i === 1 ? "mañana" : `el ${WEEKDAY_LABELS[day.getDay()]}`;
    return `${dayLabel} a las ${candidate.orderOpenTime}`;
  }
  return null;
}

/** Modo A: horario semanal. Resuelve si la tienda toma pedidos ahora mismo. */
export async function resolveWeeklyAvailability(tenantId: string): Promise<WeeklyAvailability> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  if (!canTenantReceiveOrders(tenant)) return { open: false, nextOpenLabel: null };
  if (tenant.ordersManuallyClosed) {
    // Cerrado a mano: no prometemos un próximo horario porque no reabre solo.
    return { open: false, nextOpenLabel: null };
  }

  const now = new Date();
  const hhmm = toHHMM(now);

  const closures = await prisma.storeClosure.findMany({ where: { tenantId } });
  if (closures.some((c) => now >= c.startDate && now <= c.endDate)) {
    return { open: false, nextOpenLabel: await nextWeeklyOpenLabel(tenantId) };
  }

  const rule = await prisma.weeklyScheduleRule.findUnique({
    where: { tenantId_weekday: { tenantId, weekday: now.getDay() } },
    include: { windows: { orderBy: { order: "asc" } } },
  });

  if (!rule?.enabled || rule.windows.length === 0) {
    return { open: false, nextOpenLabel: await nextWeeklyOpenLabel(tenantId) };
  }

  const activeWindow = rule.windows.find((w) => hhmm >= w.orderOpenTime && hhmm <= w.orderCloseTime);
  if (!activeWindow) {
    return { open: false, nextOpenLabel: await nextWeeklyOpenLabel(tenantId) };
  }

  const deliveryDateId = await ensureTodayDeliveryDate(tenantId, rule.windows);
  return {
    open: true,
    deliveryDateId,
    closesAt: activeWindow.orderCloseTime,
    fulfillmentLabel: `${activeWindow.fulfillmentStart} a ${activeWindow.fulfillmentEnd}`,
  };
}

export type OpenSale = {
  id: string;
  date: Date;
  cutoffAt: Date | null;
  capacity: number | null;
};

async function getOpenSales(tenantId: string): Promise<OpenSale[]> {
  const now = new Date();
  const candidates = await prisma.deliveryDate.findMany({
    where: {
      tenantId,
      status: "OPEN",
      OR: [{ orderOpenAt: null }, { orderOpenAt: { lte: now } }],
      AND: [{ OR: [{ cutoffAt: null }, { cutoffAt: { gt: now } }] }],
    },
    orderBy: { date: "asc" },
  });

  const capacitatedIds = candidates.filter((d) => d.capacity != null).map((d) => d.id);
  const orderCounts = capacitatedIds.length
    ? await prisma.order.groupBy({
        by: ["deliveryDateId"],
        where: { deliveryDateId: { in: capacitatedIds }, status: { not: "CANCELLED" } },
        _count: true,
      })
    : [];
  const orderCountByDate = new Map(orderCounts.map((c) => [c.deliveryDateId, c._count]));

  return candidates.filter((d) => d.capacity == null || (orderCountByDate.get(d.id) ?? 0) < d.capacity);
}

const saleDateFormatter = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "2-digit", month: "long" });

export type ScheduledSalesAvailability =
  | { open: true; sales: OpenSale[] }
  | { open: false; soldOut: boolean; nextSaleLabel: string | null; previewDate: OpenSale | null };

/** Modo B: ventas programadas. Resuelve qué "ventas" están tomando pedidos ahora. */
export async function resolveScheduledSalesAvailability(tenantId: string): Promise<ScheduledSalesAvailability> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  if (!canTenantReceiveOrders(tenant)) return { open: false, soldOut: false, nextSaleLabel: null, previewDate: null };
  const sales = await getOpenSales(tenantId);
  if (sales.length > 0) return { open: true, sales };

  const now = new Date();
  const upcoming = await prisma.deliveryDate.findFirst({
    where: { tenantId, status: "OPEN", orderOpenAt: { gt: now } },
    orderBy: { orderOpenAt: "asc" },
  });
  if (upcoming) {
    return {
      open: false,
      soldOut: false,
      // upcoming.date es la fecha de ENTREGA, no cuándo se puede empezar a
      // pedir — mostrarla acá le decía al cliente "volvé el día que te
      // entregamos" en vez de "volvé cuando abrimos". orderOpenAt es la
      // fecha correcta (siempre no-null: es justo la que usó el where de
      // arriba para encontrar esta fecha).
      nextSaleLabel: saleDateFormatter.format(upcoming.orderOpenAt!),
      // El dueño puede dejar ver el catálogo (sin poder pedir) mientras
      // falta para que abra — ver showCatalogBeforeOpen en el editor de
      // la fecha.
      previewDate: upcoming.showCatalogBeforeOpen ? upcoming : null,
    };
  }

  const activeButFull = await prisma.deliveryDate.findFirst({
    where: {
      tenantId,
      status: "OPEN",
      capacity: { not: null },
      OR: [{ orderOpenAt: null }, { orderOpenAt: { lte: now } }],
      AND: [{ OR: [{ cutoffAt: null }, { cutoffAt: { gt: now } }] }],
    },
  });
  return { open: false, soldOut: Boolean(activeButFull), nextSaleLabel: null, previewDate: null };
}
