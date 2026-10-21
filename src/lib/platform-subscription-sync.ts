import { getAuthorizedPayment, getSubscription } from "@/lib/mercadopago";
import { addBillingPeriod } from "@/lib/platform-billing";
import { prisma } from "@/lib/prisma";
import { generateCommissionsForPayment } from "@/lib/reseller-commission";

function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function syncPlatformSubscription(accessToken: string, subscriptionId: string) {
  const subscription = await getSubscription(accessToken, subscriptionId);
  const [pendingUser, tenant] = await Promise.all([
    prisma.user.findUnique({ where: { pendingSubscriptionId: subscription.id } }),
    prisma.tenant.findUnique({ where: { providerSubscriptionId: subscription.id } }),
  ]);

  if (pendingUser) {
    const belongsToUser = subscription.externalReference?.startsWith(`urbi:onboarding:${pendingUser.id}:`);
    if (belongsToUser) {
      await prisma.user.update({
        where: { id: pendingUser.id },
        data: {
          pendingSubscriptionStatus: subscription.status,
          ...(subscription.status === "authorized" ? { onboardingPaidAt: new Date() } : {}),
        },
      });
    }
  }

  if (tenant) {
    const keepPaidPeriod = tenant.nextBillingDate && tenant.nextBillingDate > new Date();
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        providerSubscriptionStatus: subscription.status,
        subscriptionSyncedAt: new Date(),
        ...(subscription.nextPaymentDate ? { nextBillingDate: subscription.nextPaymentDate } : {}),
        ...(subscription.status === "authorized"
          ? tenant.trialEndsAt && tenant.trialEndsAt > new Date()
            ? { billingStatus: "TRIAL" }
            : {}
          : subscription.status === "paused"
            ? { billingStatus: "PAST_DUE" }
            : ["canceled", "cancelled"].includes(subscription.status) && !keepPaidPeriod
              ? { billingStatus: "SUSPENDED" }
              : {}),
      },
    });
  }

  return subscription;
}

export async function syncPlatformAuthorizedPayment(accessToken: string, paymentId: string) {
  const payment = await getAuthorizedPayment(accessToken, paymentId);
  if (!payment.subscriptionId) return { payment, recorded: false };
  const tenant = await prisma.tenant.findUnique({ where: { providerSubscriptionId: payment.subscriptionId } });
  if (!tenant) return { payment, recorded: false };

  if (payment.status !== "approved") {
    if (["rejected", "canceled", "cancelled"].includes(payment.status)) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        // El vencimiento marca el comienzo real de la gracia. Sin esto una
        // fecha futura informada antes por la suscripción podía extenderla.
        data: { billingStatus: "PAST_DUE", nextBillingDate: new Date() },
      });
    }
    return { payment, recorded: false };
  }

  const existing = await prisma.billingPayment.findUnique({ where: { providerPaymentId: payment.id } });
  if (existing) return { payment, recorded: false };

  const periodEnd = addBillingPeriod(payment.paidAt, tenant.billingCycle ?? "MONTHLY");
  let billingPayment;
  try {
    billingPayment = await prisma.billingPayment.create({
      data: {
        tenantId: tenant.id,
        amount: payment.amount,
        periodStart: payment.paidAt,
        periodEnd,
        provider: "MERCADOPAGO",
        providerPaymentId: payment.id,
        providerSubscriptionId: payment.subscriptionId,
        note: "Cobro automático de Mercado Pago",
      },
    });
  } catch (error) {
    // Mercado Pago puede entregar el mismo evento en paralelo. La clave
    // única hace idempotente el cobro; el segundo webhook se considera OK.
    if (isUniqueConstraintError(error)) return { payment, recorded: false };
    throw error;
  }
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { billingStatus: "ACTIVE", nextBillingDate: periodEnd, trialEndsAt: null },
  });
  await generateCommissionsForPayment(tenant.id, billingPayment.id, payment.amount);
  return { payment, recorded: true };
}
