import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { PostSaleProviderAccessForm } from "@/components/estate/post-sale-provider-access-form";
import { PostSaleProviderDeleteButton } from "@/components/estate/post-sale-provider-delete-button";
import { saveProviderAccess } from "../actions";

export default async function PostSaleProviderDetailPage({
  params,
}: {
  params: Promise<{ providerId: string }>;
}) {
  const { providerId } = await params;
  const { tenant, session } = await requirePostSaleStaff();
  if (session.user.role !== "ADMIN") notFound();

  const provider = await prisma.postSaleProvider.findFirst({
    where: { id: providerId, tenantId: tenant.id },
    include: { user: { select: { email: true } } },
  });
  if (!provider) notFound();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        href="/admin/postventa/proveedores"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Volver a proveedores
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{provider.name}</h1>
          {provider.specialty && <p className="mt-1 text-sm text-muted-foreground">{provider.specialty}</p>}
        </div>
        <PostSaleProviderDeleteButton id={provider.id} name={provider.name} />
      </header>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Acceso</h2>
        <PostSaleProviderAccessForm
          providerId={provider.id}
          email={provider.user?.email ?? provider.email ?? ""}
          enabled={provider.accessEnabled}
          hasAccount={Boolean(provider.userId)}
          action={saveProviderAccess}
        />
      </section>
    </div>
  );
}
