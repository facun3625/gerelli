import { ActionForm } from "@/components/ui/action-form";
import { ChevronDownIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { commissionDueAt } from "@/lib/reseller-commission";
import { BILLING_STATUS_LABELS, BILLING_STATUS_COLORS } from "@/lib/billing-status";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  updateResellerSettings,
  createTier,
  deleteTier,
  markCommissionPaid,
  markAllCommissionsPaid,
  deactivateReseller,
  reactivateReseller,
} from "./actions";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" });

const VALID_TABS = new Set(["revendedores", "configuracion"]);

export default async function RevendedoresPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireSuperAdmin();
  const { tab } = await searchParams;
  const initialTab = tab && VALID_TABS.has(tab) ? tab : "revendedores";

  const [settings, tiers, resellers] = await Promise.all([
    prisma.resellerSettings.upsert({
      where: { id: "global" },
      update: {},
      create: { id: "global" },
    }),
    prisma.resellerCommissionTier.findMany({ orderBy: { minActiveStores: "asc" } }),
    prisma.user.findMany({
      // Ser revendedor es tener un código, no un rol — puede ser alguien
      // sin tienda todavía o admin de su propia tienda que además reparte
      // su código (ver lib/require-reseller.ts).
      where: { referralCode: { not: null } },
      include: {
        referredTenants: {
          select: { id: true, subdomain: true, billingStatus: true, createdAt: true, plan: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        },
        resellerCommissions: {
          include: { tenant: { select: { subdomain: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const now = new Date();
  let overdueTotal = 0;
  let overdueResellerCount = 0;
  for (const reseller of resellers) {
    const overdue = reseller.resellerCommissions.filter(
      (c) => c.status === "PENDING" && commissionDueAt(c.createdAt, settings.commissionPayoutDays) < now,
    );
    if (overdue.length > 0) {
      overdueResellerCount += 1;
      overdueTotal += overdue.reduce((sum, c) => sum + Number(c.amount), 0);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-semibold">Revendedores</h1>
        <p className="text-sm text-muted-foreground">Condiciones del programa y comisiones de cada socio.</p>
      </div>

      {overdueResellerCount > 0 && (
        <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
          Hay <strong>${overdueTotal.toLocaleString("es-AR")}</strong> vencido para pagar a{" "}
          {overdueResellerCount === 1 ? "1 revendedor" : `${overdueResellerCount} revendedores`} — mirá abajo cuál.
        </div>
      )}

      <Tabs defaultValue={initialTab}>
        <TabsList>
          <TabsTrigger value="revendedores">Revendedores</TabsTrigger>
          <TabsTrigger value="configuracion">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="revendedores" className="mt-4">
          <section className="rounded-2xl border bg-card p-6">
            <h2 className="text-sm font-semibold">Revendedores ({resellers.length})</h2>
            {resellers.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Todavía no se registró ningún revendedor.</p>
            ) : (
              <div className="mt-4 flex flex-col gap-3">
                {resellers.map((reseller) => {
                  const activeCount = reseller.referredTenants.filter((t) => t.billingStatus === "ACTIVE").length;
                  const pending = reseller.resellerCommissions.filter((c) => c.status === "PENDING");
                  const paid = reseller.resellerCommissions.filter((c) => c.status === "PAID");
                  const pendingTotal = pending.reduce((sum, c) => sum + Number(c.amount), 0);
                  const paidTotal = paid.reduce((sum, c) => sum + Number(c.amount), 0);

                  const pendingWithDue = pending
                    .map((c) => ({ commission: c, dueAt: commissionDueAt(c.createdAt, settings.commissionPayoutDays) }))
                    .sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
                  const hasOverdue = pendingWithDue.some((c) => c.dueAt < now);
                  const nextDue = pendingWithDue.find((c) => c.dueAt >= now);

                  return (
                    <details key={reseller.id} className="group rounded-xl border">
                      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                        <div>
                          <p className="font-medium">{reseller.name ?? reseller.email}</p>
                          <p className="text-xs text-muted-foreground">
                            {reseller.email} · código {reseller.referralCode}
                            {reseller.resellerDeactivatedAt && " (desactivado)"} · {reseller.referredTenants.length}{" "}
                            tiendas traídas ({activeCount} activas)
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-right text-xs">
                          <div>
                            <p className="text-muted-foreground">Pagado</p>
                            <p className="font-semibold">${paidTotal.toLocaleString("es-AR")}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Pendiente</p>
                            <p className={hasOverdue ? "font-semibold text-destructive" : "font-semibold text-amber-600 dark:text-amber-400"}>
                              ${pendingTotal.toLocaleString("es-AR")}
                            </p>
                            {hasOverdue ? (
                              <p className="text-destructive">vencido</p>
                            ) : nextDue ? (
                              <p className="text-muted-foreground">vence {dateFormatter.format(nextDue.dueAt)}</p>
                            ) : null}
                          </div>
                          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                        </div>
                      </summary>

                      <div className="flex flex-col gap-5 border-t p-4">
                        <div className="flex flex-wrap gap-3">
                          {pending.length > 0 && (
                            <ActionForm action={markAllCommissionsPaid.bind(null, reseller.id)}>
                              <button type="submit" className="text-xs font-medium text-primary hover:underline">
                                Marcar todo pagado
                              </button>
                            </ActionForm>
                          )}
                          {reseller.resellerDeactivatedAt ? (
                            <ActionForm action={reactivateReseller.bind(null, reseller.id)}>
                              <button type="submit" className="text-xs text-primary hover:underline">
                                Reactivar
                              </button>
                            </ActionForm>
                          ) : (
                            <ActionForm action={deactivateReseller.bind(null, reseller.id)}>
                              <button type="submit" className="text-xs text-destructive hover:underline">
                                Desactivar
                              </button>
                            </ActionForm>
                          )}
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Tiendas traídas</p>
                          {reseller.referredTenants.length === 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">Todavía no trajo ninguna inmobiliaria.</p>
                          ) : (
                            <div className="mt-2 flex flex-col gap-1.5">
                              {reseller.referredTenants.map((t) => (
                                <div key={t.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
                                  <span>
                                    {t.subdomain} · {t.plan?.name ?? "Sin plan"} · desde {dateFormatter.format(t.createdAt)}
                                  </span>
                                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${BILLING_STATUS_COLORS[t.billingStatus] ?? ""}`}>
                                    {BILLING_STATUS_LABELS[t.billingStatus] ?? t.billingStatus}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {pendingWithDue.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground">Comisiones pendientes</p>
                            <div className="mt-2 flex flex-col gap-1.5 rounded-lg bg-muted/50 p-3">
                              {pendingWithDue.map(({ commission: c, dueAt }) => {
                                const overdue = dueAt < now;
                                return (
                                  <div key={c.id} className="flex items-center justify-between text-xs">
                                    <span>
                                      {c.type === "ACTIVATION_BONUS" ? "Bono de activación" : `Comisión (${c.percentApplied}%)`} — tienda{" "}
                                      {c.tenant.subdomain} — ${Number(c.amount).toLocaleString("es-AR")}{" "}
                                      <span className={overdue ? "font-medium text-destructive" : "text-muted-foreground"}>
                                        · {overdue ? "vencida desde" : "vence"} {dateFormatter.format(dueAt)}
                                      </span>
                                    </span>
                                    <ActionForm action={markCommissionPaid.bind(null, c.id)}>
                                      <button type="submit" className="text-primary hover:underline">
                                        Marcar pagada
                                      </button>
                                    </ActionForm>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="text-xs font-semibold text-muted-foreground">Historial de pagos</p>
                          {paid.length === 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground">Todavía no se le pagó nada.</p>
                          ) : (
                            <div className="mt-2 flex flex-col gap-1.5">
                              {paid.map((c) => (
                                <div key={c.id} className="flex items-center justify-between text-xs">
                                  <span>
                                    {c.type === "ACTIVATION_BONUS" ? "Bono de activación" : `Comisión (${c.percentApplied}%)`} — tienda{" "}
                                    {c.tenant.subdomain} — ${Number(c.amount).toLocaleString("es-AR")}
                                  </span>
                                  <span className="text-muted-foreground">{c.paidAt ? dateFormatter.format(c.paidAt) : "—"}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="configuracion" className="mt-4 flex flex-col gap-6">
          <section className="rounded-2xl border bg-card p-6">
            <h2 className="text-sm font-semibold">Bono por activación</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Se paga una sola vez por tienda, cuando lleva esta cantidad de días desde que se creó siendo tienda
              referida. Estos mismos valores se muestran en la página pública de /revendedores.
            </p>
            <ActionForm action={updateResellerSettings} className="mt-4 flex flex-col gap-4">
              <div className="flex flex-wrap items-end gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Monto del bono</label>
                  <input
                    name="activationBonusAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={settings.activationBonusAmount.toString()}
                    className="w-40 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Días de pago seguido</label>
                  <input
                    name="activationBonusDays"
                    type="number"
                    min="1"
                    defaultValue={settings.activationBonusDays}
                    className="w-32 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-xs font-medium">Plazo de pago de comisiones</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Días desde que se genera una comisión (recurrente o bono) hasta que se considera vencida y hay que
                  pagarla. Aplica por igual a todo lo pendiente, sea cual sea el tipo.
                </p>
                <div className="mt-3 flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Días de plazo</label>
                  <input
                    name="commissionPayoutDays"
                    type="number"
                    min="1"
                    defaultValue={settings.commissionPayoutDays}
                    className="w-32 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <button type="submit" className="urbi-btn urbi-btn-primary h-[38px] self-start">
                Guardar
              </button>
            </ActionForm>
          </section>

          <section className="rounded-2xl border bg-card p-6">
            <h2 className="text-sm font-semibold">Escalones de comisión</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Desde cuántas tiendas activas de un revendedor se aplica cada porcentaje. El escalón que corresponde en
              cada cobro es el de mayor umbral que no supere la cantidad de tiendas activas en ese momento.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              {tiers.map((tier) => (
                <div key={tier.id} className="flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm">
                  <span>
                    Desde <strong>{tier.minActiveStores}</strong> tiendas activas → <strong>{tier.percent.toString()}%</strong>
                  </span>
                  <ActionForm action={deleteTier.bind(null, tier.id)}>
                    <button type="submit" className="text-xs text-destructive hover:underline">
                      Borrar
                    </button>
                  </ActionForm>
                </div>
              ))}
              <ActionForm action={createTier} className="flex items-end gap-3 rounded-xl border border-dashed p-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Desde tiendas activas</label>
                  <input name="minActiveStores" type="number" min="0" required className="w-32 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Porcentaje</label>
                  <input name="percent" type="number" min="0" max="100" step="0.1" required className="w-28 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <button type="submit" className="urbi-btn urbi-btn-secondary h-[38px]">
                  Agregar escalón
                </button>
              </ActionForm>
            </div>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
