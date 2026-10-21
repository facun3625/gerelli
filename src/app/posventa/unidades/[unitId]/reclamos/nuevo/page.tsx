import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { getPostSaleContact } from "@/lib/require-post-sale-portal";
import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { PostSaleClaimForm } from "@/components/estate/post-sale-claim-form";
import { createPostSaleClaim } from "./actions";

export default async function NewPostSaleClaimPage({
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
    include: { unit: true },
  });
  if (!membership) notFound();

  const sections = await prisma.postSaleSection.findMany({
    where: { tenantId: tenant.id, developmentId: membership.unit.developmentId },
    orderBy: { order: "asc" },
    include: { rubros: { orderBy: [{ isCatchAll: "asc" }, { order: "asc" }] } },
  });

  return (
    <div className="public-inner-page public-form-page flex flex-1 flex-col">
      <StoreHero />
      <main className="mx-auto w-full max-w-[1440px] flex-1 bg-background">
        <div className="mx-auto w-full max-w-xl px-4 py-8 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold sm:text-3xl">Nuevo reclamo</h1>
          <p className="mt-2 text-sm text-muted-foreground">{membership.unit.label}</p>
          <div className="mt-8">
            <PostSaleClaimForm
              sections={sections}
              unitDeliveredAt={membership.unit.deliveredAt?.toISOString() ?? null}
              action={createPostSaleClaim.bind(null, unitId)}
              onDoneHref={`/posventa/unidades/${unitId}`}
            />
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
