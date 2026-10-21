import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { getPostSaleContact } from "@/lib/require-post-sale-portal";
import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { PostSaleClaimChat } from "@/components/estate/post-sale-claim-chat";
import { PostSalePhotoGallery } from "@/components/estate/post-sale-photo-gallery";
import { warrantyStatus } from "@/lib/post-sale-warranty";
import { sendPostSaleClaimMessageOwner, markPostSaleClaimReadByOwner } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  NEW: "Nuevo",
  ASSIGNED: "Asignado",
  IN_PROGRESS: "En progreso",
  RESOLVED: "Resuelto",
  REJECTED: "Rechazado",
  CLOSED: "Cerrado",
};

export default async function PostSaleClaimPortalPage({
  params,
}: {
  params: Promise<{ unitId: string; claimId: string }>;
}) {
  const { unitId, claimId } = await params;
  const { tenant, session, contact } = await getPostSaleContact();
  if (!tenant) return null;
  if (!session) redirect(`/login?callbackUrl=/posventa/unidades/${unitId}/reclamos/${claimId}`);
  if (!contact) redirect("/posventa/completar-registro");

  const membership = await prisma.postSaleUnitMember.findFirst({
    where: { tenantId: tenant.id, unitId, contactId: contact.id },
  });
  if (!membership) notFound();

  const claim = await prisma.postSaleClaim.findFirst({
    where: { id: claimId, tenantId: tenant.id, unitId },
    include: { section: true, rubro: true, unit: true, messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!claim) notFound();

  await markPostSaleClaimReadByOwner(claim.id);

  const warranty = warrantyStatus(claim.unit.deliveredAt, claim.rubro.warrantyMonths);

  return (
    <div className="public-inner-page public-account-page flex flex-1 flex-col">
      <StoreHero />
      <main className="mx-auto w-full max-w-[1440px] flex-1 bg-background">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href={`/posventa/unidades/${unitId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            Volver a la unidad
          </Link>

          <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold sm:text-3xl">{claim.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {claim.section.name} / {claim.rubro.name}
              </p>
            </div>
            <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              {STATUS_LABEL[claim.status] ?? claim.status}
            </span>
          </div>

          {warranty.status !== "DESCONOCIDA" && (
            <span
              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                warranty.status === "VIGENTE" ? "bg-emerald-100 text-emerald-700" : "bg-destructive/10 text-destructive"
              }`}
            >
              {warranty.status === "VIGENTE" ? "En garantía" : "Fuera de garantía"}
            </span>
          )}

          {claim.description && (
            <p className="mt-4 text-sm text-muted-foreground">{claim.description}</p>
          )}

          {claim.photos.length > 0 && (
            <div className="mt-4">
              <PostSalePhotoGallery photos={claim.photos} />
            </div>
          )}

          <div className="mt-8">
            <h2 className="mb-3 text-lg font-semibold">Mensajes</h2>
            <PostSaleClaimChat
              claimId={claim.id}
              viewerSide="OWNER"
              messages={claim.messages.map((m) => ({
                id: m.id,
                sender: m.sender,
                senderName: m.senderName,
                body: m.body,
                createdAt: m.createdAt.toISOString(),
              }))}
              action={sendPostSaleClaimMessageOwner}
            />
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
