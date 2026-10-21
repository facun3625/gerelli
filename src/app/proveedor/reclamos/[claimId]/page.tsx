import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requireProvider } from "@/lib/require-provider";
import { warrantyStatus } from "@/lib/post-sale-warranty";
import { PostSaleClaimStatusForm } from "@/components/estate/post-sale-claim-status-form";
import { PostSaleClaimChat } from "@/components/estate/post-sale-claim-chat";
import { PostSalePhotoGallery } from "@/components/estate/post-sale-photo-gallery";
import {
  sendPostSaleClaimMessageProvider,
  updatePostSaleClaimStatusByProvider,
  markPostSaleClaimReadByProvider,
} from "../../actions";

export default async function ProviderClaimDetailPage({
  params,
}: {
  params: Promise<{ claimId: string }>;
}) {
  const { claimId } = await params;
  const { provider, tenant } = await requireProvider();

  const claim = await prisma.postSaleClaim.findFirst({
    where: { id: claimId, tenantId: tenant.id, assignedProviderId: provider.id },
    include: {
      development: true,
      unit: true,
      section: true,
      rubro: true,
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!claim) notFound();

  await markPostSaleClaimReadByProvider(claim.id);

  const warranty = warrantyStatus(claim.unit.deliveredAt, claim.rubro.warrantyMonths);

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <Link href="/proveedor" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeftIcon className="size-4" />
        Volver a reclamos
      </Link>

      <header>
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">
          {claim.development.name} · {claim.unit.label}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{claim.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {claim.section.name} / {claim.rubro.name}
        </p>
        {warranty.status !== "DESCONOCIDA" && (
          <span
            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
              warranty.status === "VIGENTE" ? "bg-emerald-100 text-emerald-700" : "bg-destructive/10 text-destructive"
            }`}
          >
            {warranty.status === "VIGENTE" ? "En garantía" : "Fuera de garantía"}
          </span>
        )}
      </header>

      {claim.description && <p className="text-sm text-muted-foreground">{claim.description}</p>}

      {claim.photos.length > 0 && <PostSalePhotoGallery photos={claim.photos} />}

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Estado</h2>
        <PostSaleClaimStatusForm
          claimId={claim.id}
          currentStatus={claim.status}
          action={updatePostSaleClaimStatusByProvider}
          statusOptions={["ASSIGNED", "IN_PROGRESS", "RESOLVED"]}
        />
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Mensajes</h2>
        <PostSaleClaimChat
          claimId={claim.id}
          viewerSide="PROVIDER"
          messages={claim.messages.map((m) => ({
            id: m.id,
            sender: m.sender,
            senderName: m.senderName,
            body: m.body,
            createdAt: m.createdAt.toISOString(),
          }))}
          action={sendPostSaleClaimMessageProvider}
        />
      </section>
    </main>
  );
}
