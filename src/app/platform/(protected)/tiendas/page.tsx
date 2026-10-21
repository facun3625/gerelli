import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BILLING_STATUS_COLORS, BILLING_STATUS_LABELS } from "@/lib/billing-status";
import { formatPrice } from "@/lib/format";
import { TenantsFilterBar } from "./tenants-filter-bar";
import { TenantCategorySelect } from "./tenant-category-select";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; billing?: string; category?: string }>;
}) {
  const params = await searchParams;

  const tenants = await prisma.tenant.findMany({
    where: {
      ...(params.q ? { subdomain: { contains: params.q, mode: "insensitive" as const } } : {}),
      ...(params.billing ? { billingStatus: params.billing as never } : {}),
      ...(params.category ? { category: params.category as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      plan: true,
      requestedPlan: true,
      _count: { select: { products: true, orders: true } },
    },
  });

  const pendingRequestsCount = tenants.filter((t) => t.requestedPlan).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">Tiendas</h1>
          <p className="text-sm text-muted-foreground">
            {tenants.length} {tenants.length === 1 ? "tienda" : "tiendas"}
          </p>
        </div>
        <Button render={<Link href="/platform/nueva" />} size="sm">
          Nueva inmobiliaria
        </Button>
      </div>

      {pendingRequestsCount > 0 && (
        <div className="rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-600 dark:text-amber-400">
          {pendingRequestsCount === 1
            ? "1 tienda pidió cambiar de plan"
            : `${pendingRequestsCount} tiendas pidieron cambiar de plan`}{" "}
          — mirá la columna "Plan" en la tabla.
        </div>
      )}

      <TenantsFilterBar />

      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tienda</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Facturación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Productos</TableHead>
              <TableHead>Pedidos</TableHead>
              <TableHead>Alta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">
                  <Link href={`/platform/tiendas/${t.id}`} className="hover:underline">
                    {t.subdomain}
                  </Link>
                </TableCell>
                <TableCell>
                  <TenantCategorySelect tenantId={t.id} category={t.category} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  <div className="flex flex-col gap-1">
                    <span>{t.plan ? `${t.plan.name} · ${formatPrice(Number(t.plan.priceMonthly))}/mes` : "Sin plan"}</span>
                    {t.requestedPlan && (
                      <Link
                        href={`/platform/tiendas/${t.id}`}
                        className="w-fit rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-600 hover:bg-amber-500/25 dark:text-amber-400"
                      >
                        Pidió {t.requestedPlan.name} →
                      </Link>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${BILLING_STATUS_COLORS[t.billingStatus]}`}>
                    {BILLING_STATUS_LABELS[t.billingStatus]}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={t.status === "ACTIVE" ? "default" : "secondary"}>
                    {t.status === "ACTIVE" ? "Activa" : "Suspendida"}
                  </Badge>
                </TableCell>
                <TableCell>{t._count.products}</TableCell>
                <TableCell>{t._count.orders}</TableCell>
                <TableCell className="text-muted-foreground">{dateFormatter.format(t.createdAt)}</TableCell>
              </TableRow>
            ))}

            {tenants.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  {params.q || params.billing ? "No hay tiendas que coincidan con la búsqueda." : "Todavía no hay tiendas creadas."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
