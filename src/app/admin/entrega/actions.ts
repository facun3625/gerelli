"use server";

import { ActionError, toUserError } from "@/lib/action-error";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/require-admin";
import type { FulfillmentType } from "@/generated/prisma/client";

export async function setFulfillmentMethodEnabled(type: FulfillmentType, enabled: boolean) {
  try {
    return await runSetFulfillmentMethodEnabled(type, enabled);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración de entrega");
  }
}

async function runSetFulfillmentMethodEnabled(type: FulfillmentType, enabled: boolean) {
  const { tenant } = await requireTenantAdmin();
  await prisma.fulfillmentMethodConfig.upsert({
    where: { tenantId_type: { tenantId: tenant.id, type } },
    update: { enabled },
    create: { tenantId: tenant.id, type, enabled },
  });
  revalidatePath("/admin/entrega");
  return { ok: true as const };
}

export async function addDefaultPickupSlot(label: string) {
  try {
    return await runAddDefaultPickupSlot(label);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración de entrega");
  }
}

async function runAddDefaultPickupSlot(label: string) {
  const { tenant } = await requireTenantAdmin();
  if (!label.trim()) throw new ActionError("Ingresá un horario");

  const last = await prisma.pickupSlot.findFirst({
    where: { tenantId: tenant.id, deliveryDateId: null },
    orderBy: { order: "desc" },
  });
  await prisma.pickupSlot.create({
    data: { tenantId: tenant.id, deliveryDateId: null, label: label.trim(), order: (last?.order ?? -1) + 1 },
  });
  revalidatePath("/admin/entrega");
  return { ok: true as const };
}

export async function deleteDefaultPickupSlot(id: string) {
  try {
    return await runDeleteDefaultPickupSlot(id);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración de entrega");
  }
}

async function runDeleteDefaultPickupSlot(id: string) {
  const { tenant } = await requireTenantAdmin();
  await prisma.pickupSlot.delete({ where: { id, tenantId: tenant.id, deliveryDateId: null } });
  revalidatePath("/admin/entrega");
  return { ok: true as const };
}

const deliveryFeeSchema = z.object({
  fee: z.coerce.number().min(0, "El costo no puede ser negativo"),
});

export async function updateDeliveryFee(formData: FormData) {
  try {
    return await runUpdateDeliveryFee(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración de entrega");
  }
}

async function runUpdateDeliveryFee(formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  const parsed = deliveryFeeSchema.parse({ fee: formData.get("fee") || 0 });

  await prisma.fulfillmentMethodConfig.upsert({
    where: { tenantId_type: { tenantId: tenant.id, type: "DELIVERY" } },
    update: { config: { fee: parsed.fee } },
    create: { tenantId: tenant.id, type: "DELIVERY", enabled: false, config: { fee: parsed.fee } },
  });
  revalidatePath("/admin/entrega");
  return { ok: true as const };
}
