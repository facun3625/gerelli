"use server";

import { ActionError, toUserError } from "@/lib/action-error";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { seedEstateCatalogDefaults } from "@/lib/estate/catalog-defaults";

const subdomainSchema = z
  .string()
  .min(2, "Mínimo 2 caracteres")
  .max(40, "Máximo 40 caracteres")
  .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones");

const newTenantSchema = z.object({
  subdomain: subdomainSchema,
  storeName: z.string().min(1, "Ingresá el nombre del negocio"),
  adminName: z.string().min(1, "Ingresá el nombre del admin"),
  adminEmail: z.string().email("Email inválido"),
  adminPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  planId: z.string().optional(),
});

export async function createTenant(formData: FormData) {
  try {
    return await runCreateTenant(formData);
  } catch (err) {
    return toUserError(err, "No se pudo crear la tienda");
  }
}

async function runCreateTenant(formData: FormData) {
  await requireSuperAdmin();

  const parsed = newTenantSchema.parse({
    subdomain: (formData.get("subdomain") as string)?.trim().toLowerCase(),
    storeName: formData.get("storeName"),
    adminName: formData.get("adminName"),
    adminEmail: formData.get("adminEmail"),
    adminPassword: formData.get("adminPassword"),
    planId: formData.get("planId") || undefined,
  });

  const existing = await prisma.tenant.findUnique({ where: { subdomain: parsed.subdomain } });
  if (existing) {
    throw new ActionError("Ya existe una tienda con ese subdominio");
  }

  const [passwordHash, plan] = await Promise.all([
    bcrypt.hash(parsed.adminPassword, 10),
    parsed.planId
      ? prisma.plan.findUnique({ where: { id: parsed.planId, active: true }, select: { id: true, trialDays: true } })
      : null,
  ]);
  if (parsed.planId && !plan) throw new ActionError("El plan elegido ya no está disponible");

  const now = new Date();
  const trialEndsAt = plan && plan.trialDays > 0
    ? new Date(now.getTime() + plan.trialDays * 24 * 60 * 60 * 1000)
    : null;

  const tenant = await prisma.$transaction(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        subdomain: parsed.subdomain,
        planId: plan?.id ?? null,
        billingStatus: trialEndsAt ? "TRIAL" : "SUSPENDED",
        trialEndsAt,
        nextBillingDate: trialEndsAt ?? now,
      },
    });
    await tx.settings.create({
      data: { tenantId: tenant.id, key: "store_name", value: parsed.storeName },
    });
    await tx.paymentMethodConfig.createMany({
      data: [
        { tenantId: tenant.id, type: "CASH_ON_DELIVERY", enabled: true },
        { tenantId: tenant.id, type: "TRANSFER", enabled: false },
        { tenantId: tenant.id, type: "MERCADOPAGO", enabled: false },
      ],
    });
    await tx.fulfillmentMethodConfig.createMany({
      data: [
        { tenantId: tenant.id, type: "DELIVERY", enabled: true },
        { tenantId: tenant.id, type: "PICKUP", enabled: false },
      ],
    });
    await tx.user.create({
      data: {
        tenantId: tenant.id,
        name: parsed.adminName,
        email: parsed.adminEmail,
        passwordHash,
        role: "ADMIN",
      },
    });
    await seedEstateCatalogDefaults(tx, tenant.id);
    return tenant;
  });

  redirect(`/platform/tiendas/${tenant.id}`);
  return { ok: true as const };
}
