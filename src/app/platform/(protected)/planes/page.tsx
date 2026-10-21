import { prisma } from "@/lib/prisma";
import { PlanRow } from "./plan-row";
import { NewPlanForm } from "./new-plan-form";

export default async function PlansPage() {
  const plans = await prisma.plan.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { tenants: true } } },
  });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Planes</h1>
        <p className="text-sm text-muted-foreground">
          Definí los planes que después se asignan a cada inmobiliaria desde su ficha.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {plans.map((p, index) => (
          <PlanRow
            key={p.id}
            isFirst={index === 0}
            isLast={index === plans.length - 1}
            plan={{
              id: p.id,
              name: p.name,
              priceMonthly: Number(p.priceMonthly),
              priceAnnual: p.priceAnnual === null ? null : Number(p.priceAnnual),
              trialDays: p.trialDays,
              maxPublishedProperties: p.maxPublishedProperties,
              maxProducts: p.maxProducts,
              maxAiMessagesPerMonth: p.maxAiMessagesPerMonth,
              allowRealEstate: p.allowRealEstate,
              allowConsortium: p.allowConsortium,
              allowPostSale: p.allowPostSale,
              allowCustomDomain: p.allowCustomDomain,
              allowServices: p.allowServices,
              allowStats: p.allowStats,
              allowAiAgent: p.allowAiAgent,
              featured: p.featured,
              description: p.description,
              active: p.active,
              tenantCount: p._count.tenants,
            }}
          />
        ))}
        {plans.length === 0 && (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Todavía no creaste ningún plan.
          </p>
        )}

        <NewPlanForm />
      </div>
    </div>
  );
}
