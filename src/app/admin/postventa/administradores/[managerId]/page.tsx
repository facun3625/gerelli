import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { PostSaleManagerAccessForm } from "@/components/estate/post-sale-manager-access-form";
import { PostSaleManagerDevelopmentsForm } from "@/components/estate/post-sale-manager-developments-form";
import { PostSaleManagerDeleteButton } from "@/components/estate/post-sale-manager-row-actions";
import { saveManagerAccess, setManagerDevelopments } from "../actions";

export default async function PostSaleManagerDetailPage({
  params,
}: {
  params: Promise<{ managerId: string }>;
}) {
  const { managerId } = await params;
  const { tenant, session } = await requirePostSaleStaff();
  if (session.user.role !== "ADMIN") notFound();

  const [manager, developments] = await Promise.all([
    prisma.postSaleManager.findFirst({
      where: { id: managerId, tenantId: tenant.id },
      include: { user: { select: { email: true } }, assignments: { select: { developmentId: true } } },
    }),
    prisma.postSaleDevelopment.findMany({
      where: { tenantId: tenant.id },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!manager) notFound();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <Link
        href="/admin/postventa/administradores"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" />
        Volver a administradores
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{manager.name}</h1>
          {manager.phone && <p className="mt-1 text-sm text-muted-foreground">{manager.phone}</p>}
        </div>
        <PostSaleManagerDeleteButton id={manager.id} name={manager.name} />
      </header>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Acceso</h2>
        <PostSaleManagerAccessForm
          managerId={manager.id}
          email={manager.user?.email ?? manager.email ?? ""}
          enabled={manager.accessEnabled}
          hasAccount={Boolean(manager.userId)}
          action={saveManagerAccess}
        />
      </section>

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Desarrollos asignados</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Solo va a ver y poder gestionar los desarrollos que marques acá.
        </p>
        <PostSaleManagerDevelopmentsForm
          managerId={manager.id}
          developments={developments}
          assignedIds={manager.assignments.map((a) => a.developmentId)}
          action={setManagerDevelopments}
        />
      </section>
    </div>
  );
}
