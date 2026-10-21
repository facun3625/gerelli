import { prisma } from "@/lib/prisma";

export function toDateAtNoon(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`);
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function toHHMM(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// Para cada pozo, arrastra la cantidad cargada en la fecha anterior más
// cercana (así el admin no recarga los mismos números a mano cada vez); si
// un pozo no tenía fila ahí (nunca se cargó, o no había fecha anterior), cae
// a su defaultStockQuantity. Un pozo sigue naciendo "sin límite" solo si
// tanto la fecha anterior como el default coinciden en eso.
export async function seedDefaultStock(tenantId: string, deliveryDateId: string) {
  const current = await prisma.deliveryDate.findUnique({
    where: { id: deliveryDateId },
    select: { date: true },
  });
  if (!current) return;

  const [stockGroups, previous] = await Promise.all([
    prisma.stockGroup.findMany({ where: { tenantId } }),
    prisma.deliveryDate.findFirst({
      where: { tenantId, id: { not: deliveryDateId }, date: { lt: current.date } },
      orderBy: { date: "desc" },
      include: { stockGroupStock: true },
    }),
  ]);
  if (stockGroups.length === 0) return;

  const previousByGroup = new Map(previous?.stockGroupStock.map((s) => [s.stockGroupId, s.quantityAvailable]) ?? []);

  const rows = stockGroups
    .map((g) => {
      const quantityAvailable = previousByGroup.has(g.id) ? previousByGroup.get(g.id)! : g.defaultStockQuantity;
      return quantityAvailable != null ? { stockGroupId: g.id, deliveryDateId, quantityAvailable } : null;
    })
    .filter((row): row is { stockGroupId: string; deliveryDateId: string; quantityAvailable: number } => row != null);
  if (rows.length === 0) return;

  await prisma.stockGroupStock.createMany({ data: rows, skipDuplicates: true });
}

/**
 * Cualquier fecha que quedó OPEN pero ya no puede recibir pedidos (el día de
 * entrega quedó en el pasado, o se pasó la hora de corte) pasa a EXPIRED. No
 * se toca nada que ya esté CLOSED a mano.
 */
export async function expireStaleDates(tenantId: string) {
  const now = new Date();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  await prisma.deliveryDate.updateMany({
    where: {
      tenantId,
      status: "OPEN",
      OR: [{ date: { lt: startOfToday } }, { cutoffAt: { lt: now } }],
    },
    data: { status: "EXPIRED" },
  });
}
