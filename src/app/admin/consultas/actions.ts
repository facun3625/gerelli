"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/require-admin";

const schema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "QUOTED", "RESPONDED", "ACCEPTED", "REJECTED", "CLOSED"]),
  quotedAmount: z.coerce.number().nonnegative().nullable(),
  internalNotes: z.string().trim().optional(),
});

export async function updateInquiry(id: string, formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  const parsed = schema.parse({
    status: formData.get("status"),
    quotedAmount: formData.get("quotedAmount") ? formData.get("quotedAmount") : null,
    internalNotes: String(formData.get("internalNotes") ?? ""),
  });
  await prisma.$transaction(async (tx) => {
    const inquiry = await tx.serviceInquiry.update({ where: { id, tenantId: tenant.id }, data: { status: parsed.status, quotedAmount: parsed.quotedAmount, internalNotes: parsed.internalNotes || null } });
    await tx.serviceInquiryEvent.create({ data: { inquiryId: id, status: inquiry.status, quotedAmount: inquiry.quotedAmount, notes: inquiry.internalNotes } });
  });
  revalidatePath("/admin/consultas");
  revalidatePath(`/admin/consultas/${id}`);
  revalidatePath("/admin", "layout");
}

// Abrir la ficha cuenta como "vista" — se llama desde MarkSeenOnMount, que
// solo se dispara cuando el componente realmente monta en el navegador
// (nunca durante el prefetch de un <Link>, que ejecutaría esto con solo
// pasar el mouse cerca si viviera en el render de la página).
export async function markInquirySeen(id: string) {
  const { tenant } = await requireTenantAdmin();
  const { count } = await prisma.serviceInquiry.updateMany({
    where: { id, tenantId: tenant.id, status: "NEW" },
    data: { status: "IN_PROGRESS" },
  });
  if (count > 0) {
    await prisma.serviceInquiryEvent.create({ data: { inquiryId: id, status: "IN_PROGRESS" } });
    revalidatePath("/admin/consultas");
    revalidatePath(`/admin/consultas/${id}`);
    revalidatePath("/admin", "layout");
  }
}
