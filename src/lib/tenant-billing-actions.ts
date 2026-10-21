"use server";

import { ActionError, toUserError } from "@/lib/action-error";
import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { canTenantReceiveOrders } from "@/lib/billing-status";
import { createSubscription, getSubscription, updateSubscriptionBilling } from "@/lib/mercadopago";
import { getMercadoPagoBackUrl, getPlatformBillingSettings, getPlatformMercadoPagoCredentials } from "@/lib/platform-billing";
import { prisma } from "@/lib/prisma";
import { requireOwnTenantAdmin } from "@/lib/require-admin";
import { syncPlatformSubscription } from "@/lib/platform-subscription-sync";

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost:3010";
const PLAN_PAGE_PATH = "/mi-cuenta/tienda/plan";

export async function startTenantSubscription(billingCycle: "MONTHLY" | "ANNUAL") {
  try {
    return await runStartTenantSubscription(billingCycle);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar la suscripción");
  }
}

async function runStartTenantSubscription(billingCycle: "MONTHLY" | "ANNUAL") {
  const { session, tenant } = await requireOwnTenantAdmin();
  const [freshTenant, settings, credentials] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenant.id }, include: { plan: true } }),
    getPlatformBillingSettings(),
    getPlatformMercadoPagoCredentials(),
  ]);
  if (!freshTenant?.plan) throw new ActionError("La tienda no tiene un plan asignado");
  if (!session.user.email) throw new ActionError("Tu cuenta no tiene un email válido para facturación");
  if (!settings.enabled || !credentials.accessToken) throw new ActionError("El cobro online todavía no está habilitado");
  if (billingCycle === "ANNUAL" && freshTenant.plan.priceAnnual === null) throw new ActionError("Este plan no ofrece pago anual");

  if (freshTenant.providerSubscriptionId) {
    const current = await getSubscription(credentials.accessToken, freshTenant.providerSubscriptionId);
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { providerSubscriptionStatus: current.status, subscriptionSyncedAt: new Date() },
    });
    if (current.status === "pending" && current.initPoint) redirect(current.initPoint);
    if (current.status === "authorized") redirect(PLAN_PAGE_PATH);
  }

  const amount = billingCycle === "ANNUAL" ? Number(freshTenant.plan.priceAnnual) : Number(freshTenant.plan.priceMonthly);
  if (!Number.isFinite(amount) || amount <= 0) throw new ActionError("El plan no tiene un precio válido");

  const remainingTrialDays = freshTenant.trialEndsAt && freshTenant.trialEndsAt > new Date()
    ? Math.max(1, Math.ceil((freshTenant.trialEndsAt.getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;
  const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
  const subscription = await createSubscription(credentials.accessToken, {
    reason: `Urbi · ${freshTenant.plan.name} · ${billingCycle === "ANNUAL" ? "Anual" : "Mensual"}`,
    externalReference: `urbi:tenant:${tenant.id}:${freshTenant.plan.id}:${billingCycle}:${randomBytes(12).toString("hex")}`,
    payerEmail: session.user.email,
    amount,
    frequency: billingCycle === "ANNUAL" ? 12 : 1,
    trialDays: remainingTrialDays,
    backUrl: getMercadoPagoBackUrl(`${protocol}://${ROOT_DOMAIN}${PLAN_PAGE_PATH}`),
  });
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      billingCycle,
      providerSubscriptionId: subscription.id,
      providerSubscriptionStatus: subscription.status,
      subscriptionStartedAt: new Date(),
      subscriptionSyncedAt: new Date(),
    },
  });
  if (!subscription.initPoint) throw new ActionError("Mercado Pago no devolvió el enlace de suscripción");
  redirect(subscription.initPoint);
  return { ok: true as const };
}

export async function refreshTenantSubscription() {
  try {
    return await runRefreshTenantSubscription();
  } catch (err) {
    return toUserError(err, "No se pudo actualizar la suscripción");
  }
}

async function runRefreshTenantSubscription() {
  const { tenant } = await requireOwnTenantAdmin();
  const credentials = await getPlatformMercadoPagoCredentials();
  if (!credentials.accessToken || !tenant.providerSubscriptionId) return;
  await syncPlatformSubscription(credentials.accessToken, tenant.providerSubscriptionId);
  revalidatePath(PLAN_PAGE_PATH);
  return { ok: true as const };
}

// Se aplica en el mismo click, igual que "Suscribirme" — sin pasos
// intermedios ni aprobación manual de nadie. Si ya hay una suscripción viva
// en Mercado Pago, se le actualiza el importe recurrente ahí mismo; ese
// importe nuevo rige recién desde el próximo cobro (Mercado Pago no
// prorratea ni cobra/devuelve la diferencia de los días ya usados del plan
// anterior).
export async function changePlan(planId: string) {
  try {
    return await runChangePlan(planId);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar la suscripción");
  }
}

async function runChangePlan(planId: string) {
  const { tenant } = await requireOwnTenantAdmin();
  const [freshTenant, plan] = await Promise.all([
    prisma.tenant.findUniqueOrThrow({
      where: { id: tenant.id },
      select: {
        planId: true,
        providerSubscriptionId: true,
        providerSubscriptionStatus: true,
        billingCycle: true,
        status: true,
        billingStatus: true,
        trialEndsAt: true,
      },
    }),
    prisma.plan.findUnique({ where: { id: planId, active: true } }),
  ]);
  if (!plan) throw new ActionError("Ese plan ya no está disponible");
  if (freshTenant.planId === plan.id) throw new ActionError("Ese ya es tu plan actual");
  // Sin esto, una tienda suspendida o cuyo trial ya venció podía cambiarse
  // sola a cualquier plan (dominio propio, push, stats) sin pagar nunca: acá
  // abajo solo se actualiza el importe de una suscripción que ya existe, no
  // se exige una nueva. canTenantReceiveOrders es el mismo criterio que ya
  // usa el resto de la app para "esta tienda está al día".
  if (!canTenantReceiveOrders(freshTenant)) {
    throw new ActionError("Regularizá tu suscripción antes de cambiar de plan");
  }

  if (freshTenant.providerSubscriptionId && ["authorized", "pending"].includes(freshTenant.providerSubscriptionStatus ?? "")) {
    const amount = freshTenant.billingCycle === "ANNUAL" ? Number(plan.priceAnnual) : Number(plan.priceMonthly);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new ActionError(freshTenant.billingCycle === "ANNUAL" ? "Este plan no ofrece pago anual" : "Este plan no tiene un precio válido");
    }
    const credentials = await getPlatformMercadoPagoCredentials();
    if (!credentials.accessToken) throw new ActionError("El cobro online todavía no está habilitado");
    const updated = await updateSubscriptionBilling(credentials.accessToken, freshTenant.providerSubscriptionId, {
      reason: `Urbi · ${plan.name} · ${freshTenant.billingCycle === "ANNUAL" ? "Anual" : "Mensual"}`,
      amount,
    });
    if (Math.abs(updated.amount - amount) > 0.01) {
      throw new ActionError("Mercado Pago no confirmó el nuevo importe; el plan no fue modificado");
    }
  }

  await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      planId: plan.id,
      subscriptionSyncedAt: freshTenant.providerSubscriptionId ? new Date() : undefined,
    },
  });
  revalidatePath(PLAN_PAGE_PATH);
  return { ok: true as const };
}
