import { prisma } from "@/lib/prisma";

export async function getPickupSlotsForDate(tenantId: string, deliveryDateId: string) {
  const specific = await prisma.pickupSlot.findMany({
    where: { tenantId, deliveryDateId },
    orderBy: { order: "asc" },
  });
  if (specific.length > 0) return specific;

  return prisma.pickupSlot.findMany({
    where: { tenantId, deliveryDateId: null },
    orderBy: { order: "asc" },
  });
}
