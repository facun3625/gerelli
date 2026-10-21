import { estatePlanFeatureLines } from "@/lib/plan-features";
import { ActionForm } from "@/components/ui/action-form";
import type { BillingPayment, Plan, Tenant } from "@/generated/prisma/client";
import { BILLING_STATUS_LABELS, BILLING_STATUS_COLORS } from "@/lib/billing-status";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { changePlan, refreshTenantSubscription, startTenantSubscription } from "@/lib/tenant-billing-actions";

type TenantWithBilling = Tenant & {
  plan: Plan | null;
  requestedPlan: Plan | null;
  billingPayments: BillingPayment[];
};

type AvailablePlan = {
  id: string;
  name: string;
  priceMonthly: number;
  priceAnnual: number | null;
  description: string | null;
  maxPublishedProperties: number | null;
  maxProducts: number | null;
  allowCustomDomain: boolean;
};

export function PlanBillingTab({ tenant, availablePlans, billingEnabled }: { tenant: TenantWithBilling; availablePlans: AvailablePlan[]; billingEnabled: boolean }) {
  const dateFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const needsSubscription = tenant.billingStatus !== "ACTIVE";
  const trialActive = tenant.billingStatus === "TRIAL" && Boolean(tenant.trialEndsAt && new Date(tenant.trialEndsAt) > new Date());
  const hasAuthorizedSubscription = tenant.providerSubscriptionStatus === "authorized";

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Plan actual</p>
            <p className="text-lg font-semibold">{tenant.plan?.name ?? "Sin plan asignado"}</p>
            {tenant.plan && (
              <p className="text-sm text-muted-foreground">
                ${Number(tenant.plan.priceMonthly).toLocaleString("es-AR")} / mes
              </p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${BILLING_STATUS_COLORS[tenant.billingStatus] ?? ""}`}
          >
            {BILLING_STATUS_LABELS[tenant.billingStatus] ?? tenant.billingStatus}
          </span>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-muted-foreground">Próximo vencimiento</p>
          <p className="text-sm">{tenant.nextBillingDate ? dateFormatter.format(new Date(tenant.nextBillingDate)) : "Sin registrar"}</p>
        </div>
        {trialActive && (
          <p className="mt-4 rounded-lg bg-blue-500/10 px-3 py-2 text-sm text-blue-600 dark:text-blue-400">
            Tu plan incluye prueba hasta el <strong>{dateFormatter.format(new Date(tenant.trialEndsAt!))}</strong>. Ese día corresponde el primer pago de la suscripción.
          </p>
        )}
        {tenant.billingStatus === "PAST_DUE" && (
          <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            No pudimos renovar tu suscripción. Tu inmobiliaria mantiene su sitio disponible durante el período de gracia; regularizá el pago para evitar la suspensión.
          </p>
        )}
        {tenant.billingStatus === "SUSPENDED" && (
          <p className="mt-4 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            La inmobiliaria conserva todos sus datos, pero su sitio no está disponible hasta regularizar la suscripción.
          </p>
        )}

        {needsSubscription && (
          <div className="mt-4 rounded-xl border p-4">
            <p className="text-sm font-semibold">{hasAuthorizedSubscription ? "Medio de pago vinculado" : "Activá tu suscripción"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {hasAuthorizedSubscription && trialActive
                ? `Tu suscripción ya está autorizada. El primer cobro está previsto al finalizar la prueba, el ${dateFormatter.format(new Date(tenant.trialEndsAt!))}.`
                : trialActive
                ? `Podés vincular ahora tu medio de pago. Mercado Pago programará el primer cobro para el ${dateFormatter.format(new Date(tenant.trialEndsAt!))}; no se cobra antes.`
                : "Este plan no tiene una prueba vigente. Mercado Pago procesará el primer cobro cuando confirmes la suscripción."}
            </p>
            {billingEnabled ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {!hasAuthorizedSubscription && (
                  <>
                    <ActionForm action={startTenantSubscription.bind(null, "MONTHLY")}>
                      <button className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">Suscribirme mensual</button>
                    </ActionForm>
                    {tenant.plan?.priceAnnual !== null && (
                      <ActionForm action={startTenantSubscription.bind(null, "ANNUAL")}>
                        <button className="rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-muted">Suscribirme anual</button>
                      </ActionForm>
                    )}
                  </>
                )}
                {tenant.providerSubscriptionId && (
                  <ActionForm action={refreshTenantSubscription}>
                    <button className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted">Verificar estado</button>
                  </ActionForm>
                )}
              </div>
            ) : (
              <p className="mt-3 text-xs font-medium text-amber-600">El cobro online todavía no fue habilitado por Urbi.</p>
            )}
            {tenant.providerSubscriptionStatus && <p className="mt-2 text-xs text-muted-foreground">Estado en Mercado Pago: {tenant.providerSubscriptionStatus}</p>}
          </div>
        )}
        {/* `Tenant.billingNotes` NO va acá: son notas internas del super
        admin sobre este cliente (ver billing-panel.tsx, "Notas internas") —
        mostrárselas al dueño de la inmobiliaria sería exponerle comentarios
        privados sobre su propia cuenta. Si en algún momento hace falta un
        campo de "forma de pago" visible para el cliente, tiene que ser uno
        nuevo y separado de este. */}

        {availablePlans.some((plan) => plan.id !== tenant.planId) && (
          <details className="group mt-4 overflow-hidden rounded-xl border bg-muted/20">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted/60 [&::-webkit-details-marker]:hidden">
              Ver otros planes
              <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
            </summary>
            <div className="grid gap-3 border-t p-4 md:grid-cols-2 xl:grid-cols-3">
              {availablePlans.filter((plan) => plan.id !== tenant.planId).map((plan) => {
                return (
                  <article key={plan.id} className="flex h-full flex-col rounded-xl border bg-background p-4 shadow-sm">
                    <h3 className="font-semibold">{plan.name}</h3>
                    <p className="mt-3 text-2xl font-bold">${plan.priceMonthly.toLocaleString("es-AR")}<span className="text-xs font-normal text-muted-foreground"> / mes</span></p>
                    {plan.priceAnnual !== null && <p className="mt-1 text-xs font-medium text-primary">o ${plan.priceAnnual.toLocaleString("es-AR")} al año</p>}
                    <ul className="mt-4 flex flex-col gap-2 border-t pt-4">
                      {estatePlanFeatureLines(plan).map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />{feature}</li>
                      ))}
                    </ul>
                    <ActionForm action={changePlan.bind(null, plan.id)} className="mt-auto pt-5">
                      <button type="submit" className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90">Cambiar a {plan.name}</button>
                    </ActionForm>
                    {tenant.providerSubscriptionId && ["authorized", "pending"].includes(tenant.providerSubscriptionStatus ?? "") && (
                      <p className="mt-2 text-center text-[0.65rem] text-muted-foreground">
                        Se aplica ahora; el nuevo importe se cobra recién en tu próximo vencimiento.
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          </details>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Historial de pagos</p>
        {tenant.billingPayments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todavía no hay pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Fecha</th>
                  <th className="px-3 py-2 font-medium">Período</th>
                  <th className="px-3 py-2 font-medium">Monto</th>
                  <th className="px-3 py-2 font-medium">Nota</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tenant.billingPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-3 py-2">{dateFormatter.format(new Date(payment.paidAt))}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {dateFormatter.format(new Date(payment.periodStart))} – {dateFormatter.format(new Date(payment.periodEnd))}
                    </td>
                    <td className="px-3 py-2 font-medium">${Number(payment.amount).toLocaleString("es-AR")}</td>
                    <td className="px-3 py-2 text-muted-foreground">{payment.note ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
