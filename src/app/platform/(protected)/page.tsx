import Link from "next/link";
import { ArrowRightIcon, StoreIcon, WalletIcon, TrendingUpIcon, HourglassIcon, ClockIcon, EyeIcon, GlobeIcon, AlertTriangleIcon, BanIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getPlatformStats } from "@/lib/platform-stats";
import { SalesBarChart } from "@/app/admin/estadisticas/sales-bar-chart";

const relativeFormatter = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function PlatformDashboard() {
  const [stats, recentDemoVisits] = await Promise.all([
    getPlatformStats(),
    prisma.demoVisit.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const kpis = [
    { label: "Cobrado (30 días)", value: formatPrice(stats.revenueLast30Days), icon: WalletIcon },
    { label: "Recurrente estimado (MRR)", value: formatPrice(stats.mrr), icon: TrendingUpIcon },
    { label: "Tiendas totales", value: stats.totalTenants, icon: StoreIcon },
    { label: "En trial", value: stats.trialTenants, icon: HourglassIcon },
    { label: "Nuevas este mes", value: stats.newTenantsThisMonth, icon: ClockIcon },
    { label: "Visitas al sitio (30 días)", value: stats.siteVisitsLast30Days, icon: GlobeIcon },
    { label: "Visitas a la demo (30 días)", value: stats.demoVisitsLast30Days, icon: EyeIcon },
  ];

  const billingBreakdown = [
    { label: "Al día", value: stats.activeTenants, className: "bg-emerald-500/15 text-emerald-500" },
    { label: "En trial", value: stats.trialTenants, className: "bg-blue-500/15 text-blue-500" },
    { label: "Vencidas", value: stats.pastDueTenants, className: "bg-amber-500/15 text-amber-500" },
    { label: "Suspendidas", value: stats.suspendedTenants, className: "bg-destructive/15 text-destructive" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Resumen</h1>
          <p className="text-sm text-muted-foreground">Lo que le pasa al negocio de Urbi, no a las tiendas.</p>
        </div>
        <Button render={<Link href="/platform/tiendas" />} variant="outline" size="sm">
          Ver tiendas
          <ArrowRightIcon className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-sm font-normal text-muted-foreground">{k.label}</CardTitle>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <k.icon className="size-4 text-primary" />
              </span>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{k.value}</CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Altas por mes</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesBarChart
              data={stats.signupsByMonth.map((b) => ({
                key: b.key,
                label: b.label,
                value: b.value,
                valueLabel: `${b.value} ${b.value === 1 ? "tienda" : "tiendas"}`,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Estado de facturación</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {billingBreakdown.map((b) => (
              <div key={b.label} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">{b.label}</span>
                <span className={`flex min-w-8 items-center justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${b.className}`}>
                  {b.value}
                </span>
              </div>
            ))}
            {(stats.pastDueTenants > 0 || stats.suspendedTenants > 0) && (
              <Link
                href="/platform/tiendas?billing=PAST_DUE"
                className="mt-1 flex items-center gap-1.5 text-xs font-medium text-amber-500 hover:underline"
              >
                <AlertTriangleIcon className="size-3.5" />
                Hay tiendas que necesitan atención
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-medium">Visitas al sitio (30 días)</CardTitle>
          <Link href="/platform/trafico" className="text-xs font-medium text-primary hover:underline">
            Ver detalle
          </Link>
        </CardHeader>
        <CardContent>
          <SalesBarChart
            data={stats.siteVisitsByDay.map((b) => ({
              key: b.key,
              label: b.label,
              value: b.value,
              valueLabel: `${b.value} ${b.value === 1 ? "visita" : "visitas"}`,
            }))}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Visitas a la demo (30 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesBarChart
              data={stats.demoVisitsByDay.map((b) => ({
                key: b.key,
                label: b.label,
                value: b.value,
                valueLabel: `${b.value} ${b.value === 1 ? "visita" : "visitas"}`,
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-sm font-medium">Últimos emails</CardTitle>
            <Link href="/platform/demo" className="text-xs font-medium text-primary hover:underline">
              Ver todas
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {recentDemoVisits.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía nadie probó la demo.</p>
            ) : (
              recentDemoVisits.map((v) => (
                <div key={v.id} className="flex flex-col gap-0.5 text-sm">
                  <span className="truncate font-medium">{v.email}</span>
                  <span className="text-xs text-muted-foreground">{relativeFormatter.format(v.createdAt)}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {stats.totalTenants === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
          <BanIcon className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Todavía no hay tiendas creadas en la plataforma.</p>
          <Button render={<Link href="/platform/nueva" />} size="sm">
            Crear la primera tienda
          </Button>
        </div>
      )}
    </div>
  );
}
