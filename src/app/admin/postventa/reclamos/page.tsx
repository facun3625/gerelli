import Link from "next/link";
import { PlusIcon } from "lucide-react";
import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { PostSaleClaimsList } from "@/components/estate/post-sale-claims-list";
import { PostSaleClaimsFilters } from "@/components/estate/post-sale-claims-filters";
import { updatePostSaleClaimStatus } from "./actions";

export default async function PostSaleClaimsPage({
  searchParams,
}: {
  searchParams: Promise<{ desarrollo?: string; q?: string }>;
}) {
  const { desarrollo: developmentId, q } = await searchParams;
  const { tenant, assignedDevelopmentIds } = await requirePostSaleStaff();

  const developmentScope = assignedDevelopmentIds
    ? { in: developmentId ? assignedDevelopmentIds.filter((id) => id === developmentId) : assignedDevelopmentIds }
    : developmentId
      ? { in: [developmentId] }
      : undefined;

  const query = q?.trim();
  const searchOr: Prisma.PostSaleClaimWhereInput[] | undefined = query
    ? [
        { title: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { unit: { label: { contains: query, mode: "insensitive" } } },
        { contact: { name: { contains: query, mode: "insensitive" } } },
        { contact: { taxId: { contains: query, mode: "insensitive" } } },
        { development: { name: { contains: query, mode: "insensitive" } } },
        { section: { name: { contains: query, mode: "insensitive" } } },
        { rubro: { name: { contains: query, mode: "insensitive" } } },
      ]
    : undefined;

  const [claims, filteredDevelopment, developments] = await Promise.all([
    prisma.postSaleClaim.findMany({
      where: {
        tenantId: tenant.id,
        ...(developmentScope ? { developmentId: developmentScope } : {}),
        ...(searchOr ? { OR: searchOr } : {}),
      },
      include: {
        development: true,
        unit: true,
        section: true,
        rubro: true,
        contact: true,
        messages: { where: { sender: { not: "STAFF" } }, select: { createdAt: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    developmentId
      ? prisma.postSaleDevelopment.findFirst({ where: { id: developmentId, tenantId: tenant.id }, select: { name: true } })
      : null,
    prisma.postSaleDevelopment.findMany({
      where: {
        tenantId: tenant.id,
        ...(assignedDevelopmentIds ? { id: { in: assignedDevelopmentIds } } : {}),
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Posventa</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Reclamos</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            {filteredDevelopment
              ? `Reclamos de ${filteredDevelopment.name}.`
              : "Reclamos de todos los desarrollos."}
          </p>
        </div>
        <Link
          href={developmentId ? `/admin/postventa/reclamos/nuevo?desarrollo=${developmentId}` : "/admin/postventa/reclamos/nuevo"}
          className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <PlusIcon className="size-4" />
          Generar reclamo
        </Link>
      </header>

      <PostSaleClaimsFilters developments={developments} />

      <PostSaleClaimsList
        claims={claims.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          status: c.status,
          createdAt: c.createdAt.toISOString(),
          developmentName: c.development.name,
          unitLabel: c.unit.label,
          sectionName: c.section.name,
          rubroName: c.rubro.name,
          contactName: c.contact.name,
          photos: c.photos,
          unread: c.messages.filter((m) => !c.staffLastReadAt || m.createdAt > c.staffLastReadAt).length,
        }))}
        updateStatusAction={updatePostSaleClaimStatus}
        emptyMessage={
          query || developmentId ? "No encontramos reclamos con ese filtro." : "Todavía no hay reclamos."
        }
      />
    </div>
  );
}
