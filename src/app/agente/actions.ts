"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAgent } from "@/lib/require-agent";
import { prisma } from "@/lib/prisma";
import { ActionError, toUserError } from "@/lib/action-error";
import { canAccessInquiry } from "@/lib/agent-permissions";
export async function updateAssignedInquiry(id: string, form: FormData) {
  try {
    const { tenant, agent, permissions } = await requireAgent();
    const data = z.object({ status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "CLOSED"]), notes: z.string().trim().max(15000) }).parse(Object.fromEntries(form));
    const inquiry = await prisma.estateInquiry.findFirst({ where: { id, tenantId: tenant.id } });
    if (!inquiry || !canAccessInquiry(permissions, agent.id, inquiry))
      throw new ActionError("No tenés permiso para actualizar esta consulta");
    await prisma.estateInquiry.update({ where: { id, tenantId: tenant.id }, data });
    revalidatePath("/agente");
    revalidatePath("/admin/gestion/consultas");
    revalidatePath("/admin/gestion/busquedas");
    return { ok: true };
  } catch (error) { return toUserError(error, "No se pudo actualizar la consulta"); }
}
