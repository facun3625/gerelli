import Link from "next/link";
import { notFound } from "next/navigation";
import { PlusIcon, UploadIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { PostSaleDevelopmentSidebar } from "@/components/estate/post-sale-development-sidebar";

export default async function PostSaleDevelopmentLayout({
  params,
  children,
}: {
  params: Promise<{ developmentId: string }>;
  children: React.ReactNode;
}) {
  const { developmentId } = await params;
  const { tenant, assignedDevelopmentIds } = await requirePostSaleStaff();
  if (assignedDevelopmentIds && !assignedDevelopmentIds.includes(developmentId)) notFound();

  const development = await prisma.postSaleDevelopment.findFirst({
    where: { id: developmentId, tenantId: tenant.id },
    select: { name: true, address: true, city: true },
  });
  if (!development) notFound();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/postventa/desarrollos"
            className="text-xs font-semibold uppercase tracking-[.2em] text-primary hover:underline"
          >
            Posventa · Desarrollos
          </Link>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{development.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {development.address}, {development.city}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/postventa/desarrollos/${developmentId}/nueva-unidad`}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            <PlusIcon className="size-4" />
            Agregar unidad
          </Link>
          <Link
            href={`/admin/postventa/desarrollos/${developmentId}/importar`}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold hover:bg-muted"
          >
            <UploadIcon className="size-4" />
            Agregar unidades
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[220px_1fr]">
        <PostSaleDevelopmentSidebar developmentId={developmentId} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
