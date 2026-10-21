import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRightIcon,
  BadgeDollarSignIcon,
  CalendarDaysIcon,
  HandshakeIcon,
  StoreIcon,
  TrendingUpIcon,
} from "lucide-react";

import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BILLING_STATUS_COLORS, BILLING_STATUS_LABELS } from "@/lib/billing-status";
import { prisma } from "@/lib/prisma";
import { getResellerTierPercent } from "@/lib/reseller-commission";
import { JoinResellerButton } from "./join-reseller-button";

function formatDate(value: Date | null) {
  if (!value) return "Sin fecha definida";
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "short", year: "numeric" }).format(value);
}

export default async function MyAccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      tenant: {
        include: {
          plan: true,
          settings: { where: { key: "store_name" }, take: 1 },
        },
      },
    },
  });
  if (!user) redirect("/");
  if (user.role === "SUPER_ADMIN") redirect("/platform");

  const isReseller = Boolean(user.referralCode && !user.resellerDeactivatedAt);
  if (!user.tenant && !isReseller) redirect("/registro");

  const resellerStats = isReseller
    ? await Promise.all([
        prisma.tenant.count({ where: { referredByResellerId: user.id, billingStatus: "ACTIVE" } }),
        prisma.tenant.count({ where: { referredByResellerId: user.id } }),
        prisma.resellerCommission.aggregate({ where: { resellerId: user.id, status: "PENDING" }, _sum: { amount: true } }),
        getResellerTierPercent(user.id),
      ])
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Hola, {user.name?.split(" ")[0] ?? "¿cómo estás?"}</h1>
        <p className="text-sm text-muted-foreground">Todo lo relacionado con tu cuenta Urbi, en un solo lugar.</p>
      </div>

      {user.tenant && (() => {
        const tenant = user.tenant;
        const storeName = tenant.settings[0]?.value ?? tenant.subdomain;
        const relevantDate = tenant.billingStatus === "TRIAL" ? tenant.trialEndsAt : tenant.nextBillingDate;
        return (
          <Card className="overflow-hidden">
            <CardHeader className="flex-row items-center justify-between gap-4 border-b">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <StoreIcon className="size-5" />
                </span>
                <div className="min-w-0">
                  <CardTitle className="truncate">{storeName}</CardTitle>
                  <p className="truncate text-xs text-muted-foreground">{tenant.subdomain}.urbi.com.ar</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button render={<Link href="/mi-cuenta/tienda/plan" />} variant="outline" size="sm">
                  Cambiar plan
                </Button>
                <Button render={<Link href="/mi-cuenta/tienda" />} size="sm">
                  Ir a mi inmobiliaria <ArrowRightIcon className="size-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 pt-5 sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Plan actual</p>
                <p className="mt-1 font-semibold">{tenant.plan?.name ?? "Sin plan"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estado</p>
                <Badge className={`mt-1 ${BILLING_STATUS_COLORS[tenant.billingStatus] ?? ""}`}>
                  {BILLING_STATUS_LABELS[tenant.billingStatus] ?? tenant.billingStatus}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{tenant.billingStatus === "TRIAL" ? "Fin de la prueba" : "Próxima fecha"}</p>
                <p className="mt-1 flex items-center gap-1.5 font-semibold"><CalendarDaysIcon className="size-4 text-primary" />{formatDate(relevantDate)}</p>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {resellerStats && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4 border-b">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HandshakeIcon className="size-5" />
              </span>
              <div>
                <CardTitle>Socios comerciales</CardTitle>
                <p className="text-xs text-muted-foreground">Tu actividad como revendedor de Urbi</p>
              </div>
            </div>
            <Button render={<Link href="/socios" />} variant="outline" size="sm">
              Abrir módulo <ArrowRightIcon className="size-4" />
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 pt-5">
            <div className="rounded-xl border bg-muted/20 p-3">
              <StoreIcon className="mb-2 size-4 text-primary" />
              <p className="text-xs text-muted-foreground">Tiendas activas</p>
              <p className="mt-1 text-lg font-bold">{resellerStats[0]} / {resellerStats[1]}</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-3">
              <TrendingUpIcon className="mb-2 size-4 text-primary" />
              <p className="text-xs text-muted-foreground">Comisión actual</p>
              <p className="mt-1 text-lg font-bold">{resellerStats[3]}%</p>
            </div>
            <div className="rounded-xl border bg-muted/20 p-3">
              <BadgeDollarSignIcon className="mb-2 size-4 text-primary" />
              <p className="text-xs text-muted-foreground">Pendiente</p>
              <p className="mt-1 text-lg font-bold">${Number(resellerStats[2]._sum.amount ?? 0).toLocaleString("es-AR")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isReseller && !user.resellerDeactivatedAt && (
        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card to-primary/5">
          <CardContent className="flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <HandshakeIcon className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold">¿También querés recomendar Urbi?</h2>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Activá gratis tu perfil de socio comercial. Vas a recibir tu enlace, código y panel de comisiones sin perder el acceso a tu inmobiliaria.
                </p>
              </div>
            </div>
            <div className="w-full shrink-0 sm:w-auto">
              <JoinResellerButton />
            </div>
          </CardContent>
        </Card>
      )}

      {!isReseller && user.resellerDeactivatedAt && (
        <Card className="border-amber-500/25 bg-amber-500/5">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Tu perfil de socio comercial está pausado. Contactá a Urbi para solicitar su reactivación.
          </CardContent>
        </Card>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Tu cuenta puede administrar una inmobiliaria y participar del programa de socios al mismo tiempo. Cada módulo conserva sus funciones, pero comparte esta misma sesión y navegación.
      </p>
    </div>
  );
}
