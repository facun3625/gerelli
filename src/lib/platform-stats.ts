import { prisma } from "@/lib/prisma";

export type PlatformStats = {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  pastDueTenants: number;
  suspendedTenants: number;
  mrr: number;
  revenueLast30Days: number;
  newTenantsThisMonth: number;
  signupsByMonth: { key: string; label: string; value: number }[];
  demoVisitsLast30Days: number;
  demoVisitsByDay: { key: string; label: string; value: number }[];
  siteVisitsLast30Days: number;
  siteVisitsByDay: { key: string; label: string; value: number }[];
};

const dayFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit" });

// Bucketea una lista de timestamps en los últimos 30 días, uno por día,
// completando con 0 los días sin ningún registro — usado para demo y sitio.
function bucketByDay(now: Date, timestamps: { createdAt: Date }[]) {
  const buckets = new Map<string, { label: string; value: number }>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets.set(key, { label: dayFormatter.format(d), value: 0 });
  }
  for (const t of timestamps) {
    const key = t.createdAt.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    if (bucket) bucket.value += 1;
  }
  return [...buckets.entries()].map(([key, v]) => ({ key, ...v }));
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  // DEMO y PROMOCION (ver TenantCategory, tildado a mano desde
  // /platform/tiendas/[tenantId]) no son negocio real — no deben inflar
  // ninguna de estas cuentas.
  const REAL_TENANT = { category: "CLIENTE" as const };

  const [
    totalTenants,
    trialTenants,
    pastDueTenants,
    suspendedBillingTenants,
    activePlans,
    paymentsLast30Days,
    newTenantsThisMonth,
    recentTenants,
    demoVisitsLast30Days,
    siteVisitsLast30Days,
  ] = await Promise.all([
    prisma.tenant.count({ where: REAL_TENANT }),
    prisma.tenant.count({ where: { ...REAL_TENANT, billingStatus: "TRIAL" } }),
    prisma.tenant.count({ where: { ...REAL_TENANT, billingStatus: "PAST_DUE" } }),
    prisma.tenant.count({ where: { ...REAL_TENANT, billingStatus: "SUSPENDED" } }),
    prisma.tenant.findMany({
      where: { ...REAL_TENANT, billingStatus: "ACTIVE", plan: { isNot: null } },
      select: { plan: { select: { priceMonthly: true } } },
    }),
    // Plata que efectivamente entró (BillingPayment, creado por el webhook
    // de Mercado Pago o a mano desde /platform/tiendas) — a diferencia del
    // MRR de abajo, que es una proyección sobre el plan asignado, esto es
    // lo que YA le pagaron a Urbi.
    prisma.billingPayment.findMany({
      where: { paidAt: { gte: thirtyDaysAgo }, tenant: REAL_TENANT },
      select: { amount: true },
    }),
    prisma.tenant.count({ where: { ...REAL_TENANT, createdAt: { gte: startOfMonth } } }),
    prisma.tenant.findMany({
      where: { ...REAL_TENANT, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    }),
    prisma.demoVisit.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
    prisma.siteVisit.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { createdAt: true },
    }),
  ]);

  const mrr = activePlans.reduce((sum, t) => sum + Number(t.plan?.priceMonthly ?? 0), 0);
  const revenueLast30Days = paymentsLast30Days.reduce((sum, p) => sum + Number(p.amount), 0);
  const activeTenants = totalTenants - trialTenants - pastDueTenants - suspendedBillingTenants;

  const monthFormatter = new Intl.DateTimeFormat("es-AR", { month: "short" });
  const monthBuckets = new Map<string, { label: string; value: number }>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthBuckets.set(key, { label: monthFormatter.format(d), value: 0 });
  }
  for (const t of recentTenants) {
    const key = `${t.createdAt.getFullYear()}-${t.createdAt.getMonth()}`;
    const bucket = monthBuckets.get(key);
    if (bucket) bucket.value += 1;
  }

  return {
    totalTenants,
    activeTenants: Math.max(0, activeTenants),
    trialTenants,
    pastDueTenants,
    suspendedTenants: suspendedBillingTenants,
    mrr,
    revenueLast30Days,
    newTenantsThisMonth,
    signupsByMonth: [...monthBuckets.entries()].map(([key, v]) => ({ key, ...v })),
    demoVisitsLast30Days: demoVisitsLast30Days.length,
    demoVisitsByDay: bucketByDay(now, demoVisitsLast30Days),
    siteVisitsLast30Days: siteVisitsLast30Days.length,
    siteVisitsByDay: bucketByDay(now, siteVisitsLast30Days),
  };
}
