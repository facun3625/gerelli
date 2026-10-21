"use server";

import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";

type DomainRequestStatus = "PENDING" | "IN_PROGRESS" | "DONE";

export async function setDomainRequestStatus(id: string, status: DomainRequestStatus) {
  await requireSuperAdmin();
  await prisma.domainRequest.update({ where: { id }, data: { status } });
  revalidatePath("/platform/dominios");
}
