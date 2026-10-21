import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { PostSaleStaffClaimForm } from "@/components/estate/post-sale-staff-claim-form";
import { createPostSaleClaimByStaff } from "../actions";

export default async function NewPostSaleClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ desarrollo?: string }>;
}) {
  const { desarrollo: initialDevelopmentId } = await searchParams;
  const { tenant, assignedDevelopmentIds } = await requirePostSaleStaff();

  const developments = await prisma.postSaleDevelopment.findMany({
    where: {
      tenantId: tenant.id,
      ...(assignedDevelopmentIds ? { id: { in: assignedDevelopmentIds } } : {}),
    },
    orderBy: { name: "asc" },
    include: {
      units: {
        orderBy: { label: "asc" },
        include: { members: { include: { contact: true } } },
      },
      sections: {
        orderBy: { order: "asc" },
        include: { rubros: { orderBy: [{ isCatchAll: "asc" }, { order: "asc" }] } },
      },
    },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Posventa</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Generar reclamo</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Lo carga el staff en nombre de un propietario ya cargado en la unidad.
        </p>
      </header>

      <div className="max-w-2xl">
        <PostSaleStaffClaimForm
          developments={developments.map((d) => ({
            id: d.id,
            name: d.name,
            units: d.units.map((u) => ({
              id: u.id,
              label: u.label,
              deliveredAt: u.deliveredAt?.toISOString() ?? null,
              owners: u.members.map((m) => ({
                id: m.contactId,
                name: m.contact.name,
                taxId: m.contact.taxId,
              })),
            })),
            sections: d.sections,
          }))}
          initialDevelopmentId={initialDevelopmentId}
          action={createPostSaleClaimByStaff}
          onDoneHref={
            initialDevelopmentId
              ? `/admin/postventa/reclamos?desarrollo=${initialDevelopmentId}`
              : "/admin/postventa/reclamos"
          }
        />
      </div>
    </div>
  );
}
