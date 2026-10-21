import { ActionForm } from "@/components/ui/action-form";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/format";
import { TenantStatusToggle } from "./tenant-status-toggle";
import { TenantCategorySelect } from "../tenant-category-select";
import { BillingPanel } from "./billing-panel";
import { DeleteTenantButton } from "./delete-tenant-button";
import { ApplyPromotionForm } from "./apply-promotion-form";
import { CustomDomainOverrideForm } from "./custom-domain-override-form";
import { impersonateTenant } from "./actions";

const dateFormatter = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = await params;

  const [tenant, plans] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: { where: { role: "ADMIN" } },
        plan: true,
        requestedPlan: true,
        promotionRedemption: { include: { promotionCode: true } },
        billingPayments: { orderBy: { paidAt: "desc" }, take: 10 },
        _count: { select: { products: true, orders: true } },
      },
    }),
    prisma.plan.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
  ]);
  if (!tenant) notFound();

  const [storeNameRow, revenue] = await Promise.all([
    prisma.settings.findUnique({ where: { tenantId_key: { tenantId: tenant.id, key: "store_name" } } }),
    prisma.order.aggregate({
      where: { tenantId: tenant.id, status: { not: "CANCELLED" } },
      _sum: { total: true },
    }),
  ]);
  const storeName = storeNameRow?.value ?? tenant.subdomain;

  return (
    <div className="flex flex-col gap-4">
      <Button render={<Link href="/platform/tiendas" />} variant="ghost" size="sm" className="self-start">
        <ArrowLeftIcon className="size-4" />
        Tiendas
      </Button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{storeName}</h1>
          <p className="text-sm text-muted-foreground">{tenant.subdomain}</p>
        </div>
        <div className="flex items-center gap-2">
          <TenantCategorySelect tenantId={tenant.id} category={tenant.category} />
          <Badge variant={tenant.status === "ACTIVE" ? "default" : "secondary"}>
            {tenant.status === "ACTIVE" ? "Activa" : "Suspendida"}
          </Badge>
          {tenant.users.length > 0 && (
            // <ActionForm> nativo a propósito, sin onClick ni try/catch: la acción
            // redirige al terminar, y ese redirect() throwea un NEXT_REDIRECT
            // interno que un catch genérico del lado del cliente mostraría
            // como si fuera un error real (mismo bug que ya arreglamos hoy
            // en date-editor.tsx).
            <ActionForm action={impersonateTenant.bind(null, tenant.id)}>
              <Button type="submit" variant="outline" size="sm">
                Entrar como admin
              </Button>
            </ActionForm>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Productos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{tenant._count.products}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Pedidos</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{tenant._count.orders}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">Facturado (ventas)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatPrice(Number(revenue._sum.total ?? 0))}</CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <span className="text-muted-foreground">Alta: {dateFormatter.format(tenant.createdAt)}</span>
        {tenant.users.map((u) => (
          <span key={u.id} className="text-muted-foreground">
            Admin: {u.name} ({u.email})
          </span>
        ))}
        {tenant.promotionRedemption && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            Promoción: {tenant.promotionRedemption.promotionCode.code}
            <Badge variant="secondary" className="text-[0.65rem]">
              Bonificada hasta {dateFormatter.format(tenant.promotionRedemption.endsAt)}
            </Badge>
          </span>
        )}
      </div>

      <ApplyPromotionForm tenantId={tenant.id} hasRedemption={Boolean(tenant.promotionRedemption)} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-normal text-muted-foreground">Dominio propio</CardTitle>
        </CardHeader>
        <CardContent>
          <CustomDomainOverrideForm
            tenantId={tenant.id}
            customDomain={tenant.customDomain}
            customDomainVerified={tenant.customDomainVerified}
          />
        </CardContent>
      </Card>

      <BillingPanel
        tenantId={tenant.id}
        plans={plans.map((p) => ({ id: p.id, name: p.name, priceMonthly: Number(p.priceMonthly) }))}
        currentPlanId={tenant.planId}
        billingStatus={tenant.billingStatus}
        trialEndsAt={tenant.trialEndsAt?.toISOString() ?? null}
        nextBillingDate={tenant.nextBillingDate?.toISOString() ?? null}
        billingNotes={tenant.billingNotes}
        requestedPlan={tenant.requestedPlan ? { id: tenant.requestedPlan.id, name: tenant.requestedPlan.name } : null}
        payments={tenant.billingPayments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          periodStart: p.periodStart.toISOString(),
          periodEnd: p.periodEnd.toISOString(),
          paidAt: p.paidAt.toISOString(),
          note: p.note,
        }))}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-destructive">Zona de riesgo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <TenantStatusToggle tenantId={tenant.id} status={tenant.status} />
          <DeleteTenantButton tenantId={tenant.id} subdomain={tenant.subdomain} />
        </CardContent>
      </Card>
    </div>
  );
}
