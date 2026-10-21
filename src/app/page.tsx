import { BRAND } from "@/lib/brand";
import { EstateCatalog } from "@/components/estate/catalog";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { UrbiLanding } from "@/components/marketing/urbi-landing";
import { canTenantReceiveOrders } from "@/lib/billing-status";
import { getResellerSettings, getCommissionTiers } from "@/lib/reseller-commission";
import { getSetupServiceSettings } from "@/lib/platform-billing";
import { trackSiteVisit } from "@/lib/site-visit";
export default async function Home() {
 const tenant=await getCurrentTenant();
  if (!tenant) {
    await trackSiteVisit("/");

    const [publicPlans, resellerSettings, resellerTiers, setupService] = await Promise.all([
      prisma.plan.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
      getResellerSettings(),
      getCommissionTiers(),
      getSetupServiceSettings(),
    ]);
    // Organization schema: lo que le permite a Google entender que "Urbi" es
    // una marca (no una palabra suelta) — habilita el logo en el panel de
    // conocimiento y el buscador interno en los resultados. Sin sameAs a
    // propósito: no hay redes sociales reales todavía, e inventar links
    // rotos es peor que no tener la propiedad.
    const organizationJsonLd = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Urbi",
      url: `${process.env.ROOT_DOMAIN?.startsWith("localhost") ? "http" : "https"}://${process.env.ROOT_DOMAIN ?? "localhost:3010"}`,
      logo: BRAND.icon,
      description: BRAND.description,
    };
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <UrbiLanding
          plans={publicPlans.map((plan) => ({
            id: plan.id,
            name: plan.name,
            priceMonthly: Number(plan.priceMonthly),
            priceAnnual: plan.priceAnnual === null ? null : Number(plan.priceAnnual),
            trialDays: plan.trialDays,
            description: plan.description,
            maxPublishedProperties: plan.maxPublishedProperties,
            maxProducts: plan.maxProducts,
            allowCustomDomain: plan.allowCustomDomain,
            allowAiAgent: plan.allowAiAgent,
            featured: plan.featured,
          }))}
          resellerSettings={{
            activationBonusAmount: Number(resellerSettings.activationBonusAmount),
            activationBonusDays: resellerSettings.activationBonusDays,
          }}
          resellerTiers={resellerTiers.map((tier) => ({ minActiveStores: tier.minActiveStores, percent: Number(tier.percent) }))}
          setupService={setupService}
        />
      </>
    );
  }

 if(!canTenantReceiveOrders(tenant))return <main className="p-12 text-center"><h1 className="text-2xl font-semibold">Sitio temporalmente no disponible</h1><p className="mt-3">Volvé a intentarlo más tarde.</p></main>;
 return <EstateCatalog tenantId={tenant.id} />;
}
