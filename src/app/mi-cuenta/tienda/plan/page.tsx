import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getPlatformBillingSettings, getPlatformCredentialSummary } from "@/lib/platform-billing";
import { PlanBillingTab } from "@/components/billing/plan-billing-tab";

export default async function MyStorePlanPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, tenantId: true },
  });
  if (!user?.tenantId || user.role !== "ADMIN") redirect("/mi-cuenta");

  const [tenant, availablePlans, platformBilling, credentialSummary] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: user.tenantId },
      include: { plan: true, requestedPlan: true, billingPayments: { orderBy: { paidAt: "desc" } } },
    }),
    prisma.plan.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    getPlatformBillingSettings(),
    getPlatformCredentialSummary(),
  ]);
  if (!tenant) redirect("/mi-cuenta");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Mi plan</h1>
        <p className="text-sm text-muted-foreground">Suscripción, cambios de plan e historial de pagos de tu inmobiliaria.</p>
      </div>
      <PlanBillingTab
        tenant={tenant}
        availablePlans={availablePlans.map((plan) => ({
          id: plan.id,
          name: plan.name,
          priceMonthly: Number(plan.priceMonthly),
          priceAnnual: plan.priceAnnual === null ? null : Number(plan.priceAnnual),
          description: plan.description,
          maxPublishedProperties: plan.maxPublishedProperties,
          maxProducts: plan.maxProducts,
          allowCustomDomain: plan.allowCustomDomain,
        }))}
        billingEnabled={platformBilling.enabled && Boolean(credentialSummary.accessTokenMask)}
      />
    </div>
  );
}
