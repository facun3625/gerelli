"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/require-admin";
import { encryptSecret } from "@/lib/secret-box";
import type { MercadoPagoStoredConfig } from "@/lib/mercadopago-config";
import type { PaymentMethodType } from "@/generated/prisma/client";

export async function setPaymentMethodEnabled(type: PaymentMethodType, enabled: boolean) {
  const { tenant } = await requireTenantAdmin();
  await prisma.paymentMethodConfig.upsert({
    where: { tenantId_type: { tenantId: tenant.id, type } },
    update: { enabled },
    create: { tenantId: tenant.id, type, enabled },
  });
  revalidatePath("/admin/pagos");
}

export async function updatePaymentMethodLabel(type: PaymentMethodType, label: string) {
  const { tenant } = await requireTenantAdmin();
  const trimmed = label.trim() || null;
  await prisma.paymentMethodConfig.upsert({
    where: { tenantId_type: { tenantId: tenant.id, type } },
    update: { label: trimmed },
    create: { tenantId: tenant.id, type, enabled: false, label: trimmed },
  });
  revalidatePath("/admin/pagos");
  revalidatePath("/checkout");
}

export async function updateCashRestriction(minPreviousOrders: number | null) {
  const { tenant } = await requireTenantAdmin();
  await prisma.paymentMethodConfig.upsert({
    where: { tenantId_type: { tenantId: tenant.id, type: "CASH_ON_DELIVERY" } },
    update: { minPreviousOrders },
    create: { tenantId: tenant.id, type: "CASH_ON_DELIVERY", enabled: false, minPreviousOrders },
  });
  revalidatePath("/admin/pagos");
  revalidatePath("/checkout");
}

const transferConfigSchema = z.object({
  bankName: z.string().optional(),
  accountHolder: z.string().optional(),
  cbuOrAlias: z.string().optional(),
});

export async function updateTransferConfig(formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  const parsed = transferConfigSchema.parse({
    bankName: formData.get("bankName") || undefined,
    accountHolder: formData.get("accountHolder") || undefined,
    cbuOrAlias: formData.get("cbuOrAlias") || undefined,
  });

  await prisma.paymentMethodConfig.upsert({
    where: { tenantId_type: { tenantId: tenant.id, type: "TRANSFER" } },
    update: { config: parsed },
    create: { tenantId: tenant.id, type: "TRANSFER", enabled: false, config: parsed },
  });
  revalidatePath("/admin/pagos");
}

const mercadoPagoConfigSchema = z.object({
  accessToken: z.string().optional(),
  publicKey: z.string().optional(),
  webhookSecret: z.string().optional(),
});

export async function updateMercadoPagoConfig(formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  const parsed = mercadoPagoConfigSchema.parse({
    accessToken: (formData.get("accessToken") as string)?.trim() || undefined,
    publicKey: (formData.get("publicKey") as string)?.trim() || undefined,
    webhookSecret: (formData.get("webhookSecret") as string)?.trim() || undefined,
  });

  const existingRow = await prisma.paymentMethodConfig.findUnique({
    where: { tenantId_type: { tenantId: tenant.id, type: "MERCADOPAGO" } },
  });
  const existing = (existingRow?.config as MercadoPagoStoredConfig | null) ?? {};

  // Los campos secretos llegan vacíos cuando no se tocaron (la UI muestra un
  // enmascarado, nunca el valor real) — vacío significa "dejá el que ya
  // estaba", no "borralo".
  const config: MercadoPagoStoredConfig = {
    accessTokenEnc: parsed.accessToken ? encryptSecret(parsed.accessToken) : existing.accessTokenEnc,
    webhookSecretEnc: parsed.webhookSecret
      ? encryptSecret(parsed.webhookSecret)
      : existing.webhookSecretEnc,
    publicKey: parsed.publicKey ?? existing.publicKey,
  };

  await prisma.paymentMethodConfig.upsert({
    where: { tenantId_type: { tenantId: tenant.id, type: "MERCADOPAGO" } },
    update: { config },
    create: { tenantId: tenant.id, type: "MERCADOPAGO", enabled: false, config },
  });
  revalidatePath("/admin/pagos");
  revalidatePath("/checkout");
}
