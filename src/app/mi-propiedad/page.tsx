import Link from "next/link";
import {
  HomeIcon,
  KeyRoundIcon,
  ReceiptTextIcon,
  FileTextIcon,
  BuildingIcon,
  CalendarIcon,
  TrendingUpIcon,
  WrenchIcon,
} from "lucide-react";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getOwnerPortalContact } from "@/lib/require-owner-portal";
import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { money, dateLabel, labels, chargeStatus, argentinaDayStart } from "@/lib/estate/modules";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const docTypeLabel: Record<string, string> = {
  SIGNED_CONTRACT: "Contrato firmado",
  INVENTORY: "Inventario",
  DELIVERY_ACT: "Acta de entrega",
  OTHER: "Otro",
};

const maintenancePriorityLabel: Record<string, string> = {
  LOW: "Baja",
  NORMAL: "Normal",
  HIGH: "Alta",
  URGENT: "Urgente",
};

const maintenanceStatusLabel: Record<string, string> = {
  OPEN: "Abierto",
  IN_PROGRESS: "En curso",
  DONE: "Resuelto",
};

function StatusBadge({ status }: { status: string }) {
  const isActive = status === "ACTIVE";
  const isEnded = status === "ENDED" || status === "TERMINATED";
  return (
    <span
      className={
        isActive
          ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
          : isEnded
            ? "rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
            : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
      }
    >
      {labels[status] ?? status}
    </span>
  );
}

function EmptyState({
  title,
  description,
  ctaHref,
  ctaLabel,
}: {
  title: string;
  description: string;
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center gap-4 px-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-muted">
        <KeyRoundIcon className="size-6 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {ctaHref && ctaLabel && (
        <Link
          href={ctaHref}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {ctaLabel}
        </Link>
      )}
    </main>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function MiPropiedadPage() {
  const { tenant, session, contact } = await getOwnerPortalContact();

  if (!tenant) return null;

  if (!session) {
    return (
      <div className="public-inner-page public-account-page flex flex-1 flex-col">
        <StoreHero />
        <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col bg-background">
          <EmptyState
            title="Mi propiedad"
            description="Iniciá sesión para ver tus propiedades, contratos y cobros."
            ctaHref="/login?callbackUrl=/mi-propiedad"
            ctaLabel="Ingresar"
          />
        </div>
        <StoreFooter />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="public-inner-page public-account-page flex flex-1 flex-col">
        <StoreHero />
        <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col bg-background">
          <EmptyState
            title="Sin acceso al portal"
            description="Esta cuenta no tiene el portal de propietario habilitado. Si creés que es un error, consultá con la inmobiliaria."
            ctaHref="/mi-propiedad/activar"
            ctaLabel="Activar mi cuenta"
          />
        </div>
        <StoreFooter />
      </div>
    );
  }

  // ── Datos del propietario ──────────────────────────────────────────────────

  // Propiedades de las que es dueño
  const properties = await prisma.estateProperty.findMany({
    where: { ownerId: contact.id, tenantId: tenant.id },
    include: {
      listings: true,
      maintenance: {
        where: { status: { not: "DONE" } },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const propertyIds = properties.map((p) => p.id);

  // Contratos vigentes (como propietario, la propiedad le pertenece)
  const [contracts, maintenanceAll] = await Promise.all([
    propertyIds.length
      ? prisma.estateContract.findMany({
          where: { propertyId: { in: propertyIds }, tenantId: tenant.id },
          include: {
            property: { select: { title: true, address: true, city: true } },
            contact: { select: { name: true, phone: true, email: true } },
            charges: {
              include: { receipts: true },
              orderBy: { dueAt: "desc" },
              take: 24, // últimos 2 años aprox.
            },
            documents: {
              where: { visibility: { in: ["OWNER", "BOTH_PARTIES"] } },
              orderBy: { createdAt: "desc" },
            },
          },
          orderBy: { startsAt: "desc" },
        })
      : Promise.resolve([]),
    propertyIds.length
      ? prisma.estateMaintenance.findMany({
          where: { propertyId: { in: propertyIds }, tenantId: tenant.id },
          orderBy: { createdAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  // Resumen financiero global (solo contratos ACTIVE)
  const now = argentinaDayStart();
  const activeContracts = contracts.filter((c) => c.status === "ACTIVE");
  const totalPendingBalance = activeContracts.reduce((sum, contract) => {
    const contractPending = contract.charges.reduce((s, charge) => {
      if (charge.cancelled) return s;
      const paid = charge.receipts.reduce((n, r) => n.plus(r.amount), new Prisma.Decimal(0));
      const balance = charge.amount.minus(paid);
      return balance.greaterThan(0) ? s.plus(balance) : s;
    }, new Prisma.Decimal(0));
    return sum.plus(contractPending);
  }, new Prisma.Decimal(0));

  const overdueChargesCount = activeContracts.reduce((n, contract) => {
    return (
      n +
      contract.charges.filter((charge) => {
        if (charge.cancelled) return false;
        const paid = charge.receipts.reduce((acc, r) => acc.plus(r.amount), new Prisma.Decimal(0));
        const balance = charge.amount.minus(paid);
        return balance.greaterThan(0) && charge.dueAt < now;
      }).length
    );
  }, 0);

  const openMaintenanceCount = maintenanceAll.filter((m) => m.status !== "DONE").length;

  return (
    <div className="public-inner-page public-account-page flex flex-1 flex-col">
      <StoreHero />
      <main className="mx-auto w-full max-w-[1440px] flex-1 bg-background">
        <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">

          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">Mi propiedad</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Hola, {contact.name}. Acá podés ver el estado de tus propiedades y contratos.
              </p>
            </div>
          </div>

          {/* ── Resumen general ──────────────────────────────────────────── */}
          {properties.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border bg-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BuildingIcon className="size-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Propiedades</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{properties.length}</p>
              </div>
              <div className="rounded-2xl border bg-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileTextIcon className="size-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Contratos</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{activeContracts.length}</p>
                <p className="text-xs text-muted-foreground">activos</p>
              </div>
              <div className="rounded-2xl border bg-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ReceiptTextIcon className="size-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Saldo pendiente</span>
                </div>
                <p className={`mt-2 text-xl font-bold ${totalPendingBalance.greaterThan(0) ? (overdueChargesCount > 0 ? "text-destructive" : "text-amber-600") : "text-emerald-600"}`}>
                  {totalPendingBalance.equals(0)
                    ? "Al día"
                    : `$${totalPendingBalance.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`}
                </p>
                {overdueChargesCount > 0 && (
                  <p className="text-xs text-destructive">{overdueChargesCount} vencido{overdueChargesCount > 1 ? "s" : ""}</p>
                )}
              </div>
              <div className="rounded-2xl border bg-card p-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <WrenchIcon className="size-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Mantenimiento</span>
                </div>
                <p className={`mt-2 text-2xl font-bold ${openMaintenanceCount > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                  {openMaintenanceCount}
                </p>
                <p className="text-xs text-muted-foreground">abiertos</p>
              </div>
            </div>
          )}

          {/* ── Sin propiedades ──────────────────────────────────────────── */}
          {properties.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              Todavía no tenés propiedades registradas como propietario.
            </p>
          ) : (
            <div className="mt-8 flex flex-col gap-10">
              {properties.map((property) => {
                const propertyContracts = contracts.filter((c) => c.propertyId === property.id);
                const propertyMaintenance = maintenanceAll.filter(
                  (m) => m.propertyId === property.id,
                );
                const listing = property.listings[0];

                return (
                  <section
                    key={property.id}
                    className="overflow-hidden rounded-2xl border bg-card"
                  >
                    {/* ── Encabezado propiedad ───────────────────────────── */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b bg-muted/40 px-5 py-4">
                      <div className="flex items-start gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <HomeIcon className="size-5 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-base font-semibold">{property.title}</h2>
                          <p className="text-sm text-muted-foreground">
                            {[property.address, property.city].filter(Boolean).join(", ")}
                          </p>
                          {listing && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {listing.operation === "RENT" ? "Alquiler" : "Venta"} ·{" "}
                              {listing.showPrice && listing.price
                                ? money(listing.price, listing.currency)
                                : "Precio a consultar"}{" "}
                              ·{" "}
                              <span
                                className={
                                  listing.status === "AVAILABLE"
                                    ? "text-emerald-600"
                                    : "text-amber-600"
                                }
                              >
                                {listing.status === "AVAILABLE"
                                  ? "Disponible"
                                  : listing.status === "RESERVED"
                                    ? "Reservada"
                                    : "Alquilada/Vendida"}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${property.published ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
                        >
                          {property.published ? "Publicada" : "Sin publicar"}
                        </span>
                      </div>
                    </div>

                    <div className="divide-y">
                      {/* ── Contratos ──────────────────────────────────── */}
                      <div className="px-5 py-4">
                        <div className="mb-3 flex items-center gap-2">
                          <FileTextIcon className="size-4 text-muted-foreground" />
                          <h3 className="text-sm font-semibold">Contratos</h3>
                        </div>
                        {propertyContracts.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No hay contratos vinculados a esta propiedad.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-4">
                            {propertyContracts.map((contract) => {
                              const activeCharges = contract.charges.filter(
                                (c) => !c.cancelled,
                              );
                              const totalCharged = activeCharges.reduce(
                                (s, c) => s.plus(c.amount),
                                new Prisma.Decimal(0),
                              );
                              const totalReceived = activeCharges.reduce((s, c) => {
                                return s.plus(
                                  c.receipts.reduce(
                                    (n, r) => n.plus(r.amount),
                                    new Prisma.Decimal(0),
                                  ),
                                );
                              }, new Prisma.Decimal(0));
                              const contractBalance = totalCharged.minus(totalReceived);

                              return (
                                <div
                                  key={contract.id}
                                  className="rounded-xl border bg-background p-4"
                                >
                                  {/* Encabezado contrato */}
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div>
                                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                                        {contract.reference}
                                      </p>
                                      <p className="mt-0.5 text-sm font-medium">
                                        Inquilino:{" "}
                                        <span className="font-semibold">
                                          {contract.contact.name}
                                        </span>
                                        {contract.contact.phone && (
                                          <span className="ml-1 text-muted-foreground">
                                            · {contract.contact.phone}
                                          </span>
                                        )}
                                      </p>
                                      <p className="mt-0.5 text-xs text-muted-foreground">
                                        <CalendarIcon className="mr-1 inline size-3" />
                                        {dateLabel(contract.startsAt)} –{" "}
                                        {dateLabel(contract.endsAt)} ·{" "}
                                        {money(contract.amount, contract.currency)} / mes
                                      </p>
                                    </div>
                                    <StatusBadge status={contract.status} />
                                  </div>

                                  {/* Resumen cobros del contrato */}
                                  {activeCharges.length > 0 && (
                                    <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-muted/50 p-3 text-center">
                                      <div>
                                        <p className="text-xs text-muted-foreground">Facturado</p>
                                        <p className="text-sm font-semibold">
                                          {money(totalCharged, contract.currency)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Cobrado</p>
                                        <p className="text-sm font-semibold text-emerald-600">
                                          {money(totalReceived, contract.currency)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Saldo</p>
                                        <p
                                          className={`text-sm font-semibold ${contractBalance.greaterThan(0) ? "text-destructive" : "text-emerald-600"}`}
                                        >
                                          {contractBalance.greaterThan(0)
                                            ? money(contractBalance, contract.currency)
                                            : "Al día"}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {/* Detalle de cobros */}
                                  {contract.charges.length > 0 && (
                                    <div className="mt-3">
                                      <div className="mb-2 flex items-center gap-1.5">
                                        <ReceiptTextIcon className="size-3.5 text-muted-foreground" />
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                          Cobros
                                        </p>
                                      </div>
                                      <ul className="flex flex-col divide-y rounded-xl border text-sm">
                                        {contract.charges.map((charge) => {
                                          const paid = charge.receipts.reduce(
                                            (n, r) => n.plus(r.amount),
                                            new Prisma.Decimal(0),
                                          );
                                          const balance = charge.amount.minus(paid);
                                          const status = chargeStatus(charge, balance, paid);
                                          const statusClass =
                                            charge.cancelled
                                              ? "bg-muted text-muted-foreground"
                                              : status === "Pagada"
                                                ? "bg-emerald-100 text-emerald-700"
                                                : status === "Vencida"
                                                  ? "bg-destructive/10 text-destructive"
                                                  : status === "Pago parcial"
                                                    ? "bg-amber-100 text-amber-700"
                                                    : "bg-amber-50 text-amber-700";

                                          return (
                                            <li
                                              key={charge.id}
                                              className="flex flex-wrap items-center gap-2 px-3 py-2.5"
                                            >
                                              <span className="min-w-0 flex-1 truncate font-medium">
                                                {charge.concept} · {charge.period}
                                              </span>
                                              <span className="text-xs text-muted-foreground">
                                                Vence {dateLabel(charge.dueAt)}
                                              </span>
                                              <span className="font-semibold">
                                                {money(charge.amount, charge.currency)}
                                              </span>
                                              <span
                                                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass}`}
                                              >
                                                {status}
                                              </span>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    </div>
                                  )}

                                  {/* Documentos */}
                                  {contract.documents.length > 0 && (
                                    <div className="mt-3">
                                      <div className="mb-2 flex items-center gap-1.5">
                                        <FileTextIcon className="size-3.5 text-muted-foreground" />
                                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                          Documentos
                                        </p>
                                      </div>
                                      <ul className="flex flex-col divide-y rounded-xl border">
                                        {contract.documents.map((doc) => (
                                          <li key={doc.id} className="px-3 py-2.5 text-sm">
                                            <a
                                              href={doc.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="font-medium text-primary hover:underline"
                                            >
                                              {doc.title}
                                            </a>
                                            <p className="text-xs text-muted-foreground">
                                              {docTypeLabel[doc.type] ?? doc.type}
                                            </p>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* ── Mantenimiento ──────────────────────────────── */}
                      {propertyMaintenance.length > 0 && (
                        <div className="px-5 py-4">
                          <div className="mb-3 flex items-center gap-2">
                            <WrenchIcon className="size-4 text-muted-foreground" />
                            <h3 className="text-sm font-semibold">Mantenimiento</h3>
                          </div>
                          <ul className="flex flex-col divide-y rounded-xl border">
                            {propertyMaintenance.map((m) => (
                              <li
                                key={m.id}
                                className="flex flex-wrap items-start gap-3 px-3 py-3 text-sm"
                              >
                                <div className="flex-1">
                                  <p className="font-medium">{m.title}</p>
                                  {m.description && (
                                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                                      {m.description}
                                    </p>
                                  )}
                                  {m.supplier && (
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      Proveedor: {m.supplier}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                  <span
                                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                      m.status === "DONE"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : m.status === "IN_PROGRESS"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {maintenanceStatusLabel[m.status] ?? m.status}
                                  </span>
                                  <span
                                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                      m.priority === "URGENT"
                                        ? "bg-destructive/10 text-destructive"
                                        : m.priority === "HIGH"
                                          ? "bg-orange-100 text-orange-700"
                                          : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {maintenancePriorityLabel[m.priority] ?? m.priority}
                                  </span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          {/* ── Enlace resaltado a activar portal ────────────────────────── */}
          <div className="mt-10 rounded-2xl border border-dashed bg-muted/30 px-5 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              ¿No ves tus propiedades?{" "}
              <a
                href={`mailto:?subject=Portal%20propietario`}
                className="text-primary underline underline-offset-2 hover:opacity-80"
              >
                Contactá a la inmobiliaria
              </a>{" "}
              para que habiliten tu acceso.
            </p>
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
