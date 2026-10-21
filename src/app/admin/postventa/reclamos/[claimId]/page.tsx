import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { PostSaleClaimStatusForm } from "@/components/estate/post-sale-claim-status-form";
import { PostSaleClaimChat } from "@/components/estate/post-sale-claim-chat";
import { PostSalePhotoGallery } from "@/components/estate/post-sale-photo-gallery";
import { PostSaleClaimAssignment } from "@/components/estate/post-sale-claim-assignment";
import { warrantyStatus } from "@/lib/post-sale-warranty";
import {
  updatePostSaleClaimStatus,
  sendPostSaleClaimMessageStaff,
  markPostSaleClaimReadByStaff,
  assignPostSaleClaimManager,
  assignPostSaleClaimProvider,
} from "../actions";

const STATUS_LABEL: Record<string, string> = {
  NEW: "Nuevo",
  ASSIGNED: "Asignado",
  IN_PROGRESS: "En progreso",
  RESOLVED: "Resuelto",
  REJECTED: "Rechazado",
  CLOSED: "Cerrado",
};

export default async function PostSaleClaimDetailPage({
  params,
}: {
  params: Promise<{ claimId: string }>;
}) {
  const { claimId } = await params;
  const { tenant, assignedDevelopmentIds } = await requirePostSaleStaff();

  const claim = await prisma.postSaleClaim.findFirst({
    where: { id: claimId, tenantId: tenant.id },
    include: {
      development: true,
      unit: true,
      section: true,
      rubro: true,
      contact: true,
      manager: true,
      provider: true,
      events: { orderBy: { createdAt: "asc" } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!claim) notFound();
  if (assignedDevelopmentIds && !assignedDevelopmentIds.includes(claim.developmentId)) notFound();

  await markPostSaleClaimReadByStaff(claim.id, tenant.id);

  const [assignableManagers, providers] = await Promise.all([
    prisma.postSaleManager.findMany({
      where: { tenantId: tenant.id, assignments: { some: { developmentId: claim.developmentId } } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.postSaleProvider.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const backHref = `/admin/postventa/reclamos?desarrollo=${claim.developmentId}`;
  const warranty = warrantyStatus(claim.unit.deliveredAt, claim.rubro.warrantyMonths);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Volver a reclamos
      </Link>

      <header>
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">
          {claim.development.name} · {claim.unit.label}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{claim.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {claim.section.name} / {claim.rubro.name}
          {claim.contact.name && ` · ${claim.contact.name}`}
          {claim.contact.taxId && ` · DNI ${claim.contact.taxId}`}
        </p>
        <span
          className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
            warranty.status === "VIGENTE"
              ? "bg-emerald-100 text-emerald-700"
              : warranty.status === "VENCIDA"
                ? "bg-destructive/10 text-destructive"
                : "bg-muted text-muted-foreground"
          }`}
        >
          {warranty.status === "VIGENTE"
            ? "En garantía"
            : warranty.status === "VENCIDA"
              ? "Fuera de garantía"
              : "Garantía sin datos suficientes"}
        </span>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          {claim.description && (
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="mb-2 text-sm font-semibold">Descripción</h2>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{claim.description}</p>
            </section>
          )}

          {claim.photos.length > 0 && (
            <section className="rounded-2xl border bg-card p-5">
              <h2 className="mb-3 text-sm font-semibold">Fotos</h2>
              <PostSalePhotoGallery photos={claim.photos} />
            </section>
          )}

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Estado</h2>
            <PostSaleClaimStatusForm
              claimId={claim.id}
              currentStatus={claim.status}
              action={updatePostSaleClaimStatus}
            />
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Asignación</h2>
            <PostSaleClaimAssignment
              claimId={claim.id}
              managers={assignableManagers.map((m) => ({ id: m.id, label: m.name }))}
              currentManagerId={claim.assignedManagerId}
              providers={providers.map((p) => ({ id: p.id, label: p.name }))}
              currentProviderId={claim.assignedProviderId}
              assignManagerAction={assignPostSaleClaimManager}
              assignProviderAction={assignPostSaleClaimProvider}
            />
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">Historial</h2>
            <ol className="space-y-3">
              {claim.events.map((event) => (
                <li key={event.id} className="border-l-2 pl-3 text-sm">
                  <p className="font-medium">{STATUS_LABEL[event.status] ?? event.status}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("es-AR", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "America/Argentina/Cordoba",
                    }).format(event.createdAt)}
                  </p>
                  {event.notes && <p className="mt-1 text-muted-foreground">{event.notes}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <section className="sticky top-6 rounded-2xl border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Mensajes</h2>
          <PostSaleClaimChat
            claimId={claim.id}
            viewerSide="STAFF"
            messages={claim.messages.map((m) => ({
              id: m.id,
              sender: m.sender,
              senderName: m.senderName,
              body: m.body,
              createdAt: m.createdAt.toISOString(),
            }))}
            action={sendPostSaleClaimMessageStaff}
          />
        </section>
      </div>
    </div>
  );
}
