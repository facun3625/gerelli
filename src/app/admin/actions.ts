"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/require-admin";

export async function setStoreOpen(open: boolean) {
  const { tenant } = await requireTenantAdmin();
  await prisma.tenant.update({ where: { id: tenant.id }, data: { storeOpen: open } });
  revalidatePath("/", "layout");
  revalidatePath("/admin", "layout");
}
