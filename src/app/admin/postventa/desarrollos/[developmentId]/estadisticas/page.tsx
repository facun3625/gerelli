import { notFound } from "next/navigation";
import { Building2Icon, ClipboardListIcon, UserCheckIcon, UsersIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";

const STATUS_LABEL: Record<string, string> = {
  NEW: "Nuevo",
  ASSIGNED: "Asignado",
  IN_PROGRESS: "En progreso",
  RESOLVED: "Resuelto",
  REJECTED: "Rechazado",
  CLOSED: "Cerrado",
};

export default async function PostSaleDevelopmentStatsPage({
  params,
}: {
  params: Promise<{ developmentId: string }>;
}) {
  const { developmentId } = await params;
  const { tenant, assignedDevelopmentIds } = await requirePostSaleStaff();
  if (assignedDevelopmentIds && !assignedDevelopmentIds.includes(developmentId)) notFound();

  const development = await prisma.postSaleDevelopment.findFirst({
    where: { id: developmentId, tenantId: tenant.id },
    select: { id: true },
  });
  if (!development) notFound();

  const [totalUnits, unitsWithOwner, distinctOwners, claimsByStatus] = await Promise.all([
    prisma.postSaleUnit.count({ where: { tenantId: tenant.id, developmentId } }),
    prisma.postSaleUnit.count({
      where: { tenantId: tenant.id, developmentId, members: { some: {} } },
    }),
    prisma.postSaleUnitMember.findMany({
      where: { tenantId: tenant.id, unit: { developmentId } },
      select: { contactId: true },
      distinct: ["contactId"],
    }),
    prisma.postSaleClaim.groupBy({
      by: ["status"],
      where: { tenantId: tenant.id, developmentId },
      _count: { _all: true },
    }),
  ]);

  const totalClaims = claimsByStatus.reduce((sum, s) => sum + s._count._all, 0);
  const cards = [
    { label: "Unidades", value: totalUnits, icon: Building2Icon },
    { label: "Unidades con propietario", value: unitsWithOwner, icon: UserCheckIcon },
    { label: "Propietarios distintos", value: distinctOwners.length, icon: UsersIcon },
    { label: "Reclamos totales", value: totalClaims, icon: ClipboardListIcon },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border bg-card p-5">
            <c.icon className="size-5 text-primary" />
            <p className="mt-5 text-3xl font-semibold">{c.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Reclamos por estado</h2>
        <div className="mt-4 space-y-2">
          {claimsByStatus.map((s) => (
            <div key={s.status} className="flex items-center justify-between text-sm">
              <span>{STATUS_LABEL[s.status] ?? s.status}</span>
              <span className="font-semibold">{s._count._all}</span>
            </div>
          ))}
          {!claimsByStatus.length && (
            <p className="text-sm text-muted-foreground">Todavía no hay reclamos.</p>
          )}
        </div>
      </section>
    </div>
  );
}
