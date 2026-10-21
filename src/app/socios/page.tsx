import Link from "next/link";
import QRCode from "qrcode";
import { StoreIcon, BadgeDollarSignIcon, ClockIcon, TrendingUpIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireReseller } from "@/lib/require-reseller";
import { getResellerTierPercent } from "@/lib/reseller-commission";
import { CopyLinkButton } from "./socio-tools";

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost:3010";

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border bg-card p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className="text-lg font-bold">{value}</p>
      </div>
    </div>
  );
}

export default async function SociosResumenPage() {
  const { reseller } = await requireReseller();

  const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
  const referralLink = `${protocol}://${ROOT_DOMAIN}/registro?ref=${reseller.referralCode}`;

  // QR generado acá mismo, sin depender de ningún servicio externo — nada
  // de mandarle el código de nadie a una API de terceros.
  const qrDataUrl = await QRCode.toDataURL(referralLink, {
    width: 320,
    margin: 1,
    color: { dark: "#133453", light: "#ffffff" },
  });

  const [activeCount, totalCount, commissions, tierPercent] = await Promise.all([
    prisma.tenant.count({ where: { referredByResellerId: reseller.id, billingStatus: "ACTIVE" } }),
    prisma.tenant.count({ where: { referredByResellerId: reseller.id } }),
    prisma.resellerCommission.findMany({ where: { resellerId: reseller.id } }),
    getResellerTierPercent(reseller.id),
  ]);

  const paidTotal = commissions.filter((c) => c.status === "PAID").reduce((sum, c) => sum + Number(c.amount), 0);
  const pendingTotal = commissions.filter((c) => c.status === "PENDING").reduce((sum, c) => sum + Number(c.amount), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Resumen</h1>
        <p className="text-sm text-muted-foreground">Tu código, tus inmobiliarias y lo que llevás ganado.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={StoreIcon} label="Tiendas activas" value={`${activeCount} / ${totalCount}`} />
        <StatCard icon={TrendingUpIcon} label="Tu escalón" value={`${tierPercent}%`} />
        <StatCard icon={BadgeDollarSignIcon} label="Cobrado" value={`$${paidTotal.toLocaleString("es-AR")}`} />
        <StatCard icon={ClockIcon} label="Pendiente" value={`$${pendingTotal.toLocaleString("es-AR")}`} />
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-sm font-semibold">Tu código</h2>
        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* eslint-disable-next-line @next/next/no-img-element -- data URI generado en el servidor, no un asset optimizable por next/image */}
          <img src={qrDataUrl} alt={`Código QR de ${reseller.referralCode}`} className="size-40 shrink-0 rounded-xl border p-2" />
          <div className="flex flex-1 flex-col gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Código</p>
              <p className="font-mono text-lg font-bold tracking-wider">{reseller.referralCode}</p>
            </div>
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {referralLink}
              </p>
              <CopyLinkButton link={referralLink} />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Compartí el link o el QR. Cualquier tienda que se cree a través de tu código queda asociada a vos.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/socios/tiendas" className="rounded-2xl border bg-card p-5 transition-colors hover:border-primary/50">
          <p className="font-semibold">Ver tiendas referidas →</p>
          <p className="mt-1 text-sm text-muted-foreground">Estado y próximos cobros de cada inmobiliaria que trajiste.</p>
        </Link>
        <Link href="/socios/comisiones" className="rounded-2xl border bg-card p-5 transition-colors hover:border-primary/50">
          <p className="font-semibold">Ver comisiones →</p>
          <p className="mt-1 text-sm text-muted-foreground">Historial completo, pagadas y pendientes.</p>
        </Link>
      </div>

      {/* Directo a elegir plan, no a /registro/elegir — ya está claro qué
      quiere con solo haber clickeado esto desde acá. */}
      <Link
        href="/registro/plan"
        className="rounded-2xl border border-dashed p-5 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
      >
        ¿Además querés vender vos? <span className="font-semibold text-foreground">Creá tu propia tienda</span> — no hace falta dejar de ser socio.
      </Link>
    </div>
  );
}
