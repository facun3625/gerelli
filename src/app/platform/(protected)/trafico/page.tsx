import { GlobeIcon, UsersIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSiteVisitStats } from "@/lib/site-visit-stats";
import { resolveDateRange } from "@/lib/date-range";
import { TrafficFilterBar } from "./traffic-filter-bar";

function BreakdownCard({ title, items, emptyLabel }: { title: string; items: { label: string; value: number }[]; emptyLabel: string }) {
  const total = items.reduce((sum, i) => sum + i.value, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyLabel}</p>
        ) : (
          items.slice(0, 8).map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-muted-foreground">{item.label}</span>
              <span className="flex shrink-0 items-center gap-2">
                <span className="font-semibold">{item.value}</span>
                <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">
                  {total > 0 ? `${Math.round((item.value / total) * 100)}%` : ""}
                </span>
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default async function SiteTrafficPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const range = resolveDateRange(params);
  const stats = await getSiteVisitStats(range);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Tráfico del sitio</h1>
        <p className="text-sm text-muted-foreground">De dónde viene y cómo navega quien visita urbi.com.ar — {range.label.toLowerCase()}.</p>
      </div>

      <TrafficFilterBar />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-sm font-normal text-muted-foreground">Visitas totales</CardTitle>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <GlobeIcon className="size-4 text-primary" />
            </span>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.totalVisits}</CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <CardTitle className="text-sm font-normal text-muted-foreground">Visitantes distintos</CardTitle>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <UsersIcon className="size-4 text-primary" />
            </span>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{stats.uniqueVisitors}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <BreakdownCard title="Por país" items={stats.byCountry} emptyLabel="Sin datos todavía." />
        <BreakdownCard title="Por ciudad" items={stats.byCity} emptyLabel="Sin datos todavía." />
        <BreakdownCard title="Por origen" items={stats.bySource} emptyLabel="Sin datos todavía." />
        <BreakdownCard title="Por dispositivo" items={stats.byDevice} emptyLabel="Sin datos todavía." />
        <BreakdownCard title="Por página" items={stats.byPage} emptyLabel="Sin datos todavía." />
        <BreakdownCard title="Por navegador" items={stats.byBrowser} emptyLabel="Sin datos todavía." />
        <BreakdownCard title="Por sistema operativo" items={stats.byOs} emptyLabel="Sin datos todavía." />
      </div>
    </div>
  );
}
