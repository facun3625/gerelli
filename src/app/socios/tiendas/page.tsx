import { prisma } from "@/lib/prisma";
import { requireReseller } from "@/lib/require-reseller";
import { getResellerTierPercent } from "@/lib/reseller-commission";
import { BILLING_STATUS_LABELS, BILLING_STATUS_COLORS } from "@/lib/billing-status";

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost:3010";

export default async function SociosTiendasPage() {
  const { reseller } = await requireReseller();

  const [referredTenants, tierPercent] = await Promise.all([
    prisma.tenant.findMany({
      where: { referredByResellerId: reseller.id },
      include: { plan: true, settings: { where: { key: "store_name" } } },
      orderBy: { createdAt: "desc" },
    }),
    getResellerTierPercent(reseller.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Inmobiliarias referidas</h1>
        <p className="text-sm text-muted-foreground">Las tiendas que se crearon con tu código.</p>
      </div>

      <section className="rounded-2xl border bg-card p-6">
        {referredTenants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no trajiste ninguna inmobiliaria. Compartí tu código para empezar.</p>
        ) : (
          <ul className="flex flex-col divide-y">
            {referredTenants.map((tenant) => {
              const storeName = tenant.settings[0]?.value ?? tenant.subdomain;
              return (
                <li key={tenant.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{storeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {tenant.subdomain}.{ROOT_DOMAIN} · {tenant.plan?.name ?? "Sin plan"}
                      {tenant.billingStatus === "ACTIVE" && tenant.nextBillingDate && tenant.plan && (() => {
                        // El próximo cobro es el anual si la inmobiliaria factura
                        // anual — usar siempre el precio mensual acá
                        // subestimaba mucho la estimación de un referido anual.
                        const nextChargePrice = tenant.billingCycle === "ANNUAL" && tenant.plan.priceAnnual !== null
                          ? Number(tenant.plan.priceAnnual)
                          : Number(tenant.plan.priceMonthly);
                        return (
                          <>
                            {" "}· próximo cobro estimado{" "}
                            {new Date(tenant.nextBillingDate).toLocaleDateString("es-AR")} · ~$
                            {((nextChargePrice * tierPercent) / 100).toLocaleString("es-AR")}
                          </>
                        );
                      })()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${BILLING_STATUS_COLORS[tenant.billingStatus] ?? ""}`}
                  >
                    {BILLING_STATUS_LABELS[tenant.billingStatus] ?? tenant.billingStatus}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
