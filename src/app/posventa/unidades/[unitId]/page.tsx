import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { PlusIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getPostSaleContact } from "@/lib/require-post-sale-portal";
import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { ClickableRow } from "@/components/estate/clickable-row";

const statusLabel: Record<string, string> = {
  NEW: "Nuevo",
  ASSIGNED: "Asignado",
  IN_PROGRESS: "En progreso",
  RESOLVED: "Resuelto",
  REJECTED: "Rechazado",
  CLOSED: "Cerrado",
};

export default async function PostSaleUnitPage({
  params,
}: {
  params: Promise<{ unitId: string }>;
}) {
  const { unitId } = await params;
  const { tenant, session, contact } = await getPostSaleContact();
  if (!tenant) return null;
  if (!session) redirect(`/login?callbackUrl=/posventa/unidades/${unitId}`);
  if (!contact) redirect("/posventa/completar-registro");

  const membership = await prisma.postSaleUnitMember.findFirst({
    where: { tenantId: tenant.id, unitId, contactId: contact.id },
    include: { unit: { include: { development: true } } },
  });
  if (!membership) notFound();

  // Todos los reclamos de la unidad, no solo los que generó este contacto —
  // cualquier miembro (dueño o inquilino invitado) la maneja en conjunto.
  const claims = await prisma.postSaleClaim.findMany({
    where: { tenantId: tenant.id, unitId },
    include: { section: true, rubro: true, messages: { where: { sender: { not: "OWNER" } }, select: { createdAt: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="public-inner-page public-account-page flex flex-1 flex-col">
      <StoreHero />
      <main className="mx-auto w-full max-w-[1440px] flex-1 bg-background">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">
            {membership.unit.development.name}
          </p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{membership.unit.label}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {membership.unit.development.address}, {membership.unit.development.city}
          </p>

          <div className="mt-8 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Reclamos</h2>
            <Link
              href={`/posventa/unidades/${unitId}/reclamos/nuevo`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              <PlusIcon className="size-4" />
              Nuevo reclamo
            </Link>
          </div>

          <div className="mt-4 flex flex-col gap-3">
            {claims.map((claim) => {
              const unread = claim.messages.filter(
                (m) => !claim.ownerLastReadAt || m.createdAt > claim.ownerLastReadAt,
              ).length;
              return (
                <ClickableRow
                  key={claim.id}
                  href={`/posventa/unidades/${unitId}/reclamos/${claim.id}`}
                  className="cursor-pointer rounded-2xl border bg-card p-5 transition-colors hover:border-primary/40"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{claim.title}</p>
                      {unread > 0 && (
                        <span className="flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                          {unread}
                        </span>
                      )}
                    </div>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                      {statusLabel[claim.status] ?? claim.status}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {claim.section.name} · {claim.rubro.name}
                  </p>
                </ClickableRow>
              );
            })}
            {!claims.length && (
              <p className="rounded-2xl border border-dashed p-10 text-center text-sm text-muted-foreground">
                Todavía no hiciste ningún reclamo para esta unidad.
              </p>
            )}
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
