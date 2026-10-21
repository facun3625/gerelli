"use server";

import { getCurrentTenant } from "@/lib/tenant";
import { getRemainingForVariant, getRemainingForVariants } from "@/lib/stock";

export async function checkRemainingStock(deliveryDateId: string, variantId: string) {
  const tenant = await getCurrentTenant();
  if (!tenant) return 0;
  return getRemainingForVariant(tenant.id, deliveryDateId, variantId);
}

export async function checkRemainingStockForVariants(deliveryDateId: string, variantIds: string[]) {
  const tenant = await getCurrentTenant();
  if (!tenant) return {} as Record<string, number>;
  const map = await getRemainingForVariants(tenant.id, deliveryDateId, variantIds);
  return Object.fromEntries(map) as Record<string, number>;
}
