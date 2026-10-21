import { Building2Icon } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { inputClass } from "@/components/estate/form-field-class";
import { NewDevelopmentForm } from "@/components/estate/new-development-form";
import { ClickableRow } from "@/components/estate/clickable-row";
import { PostSaleDevelopmentRowActions } from "@/components/estate/post-sale-development-row-actions";
import { createDevelopment } from "./actions";

export default async function PostSaleDevelopmentsPage() {
  const { tenant, session, assignedDevelopmentIds } = await requirePostSaleStaff();
  const isAdmin = session.user.role === "ADMIN";

  const developments = await prisma.postSaleDevelopment.findMany({
    where: {
      tenantId: tenant.id,
      ...(assignedDevelopmentIds ? { id: { in: assignedDevelopmentIds } } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { units: true } } },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Posventa</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Desarrollos</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Torres o edificios entregados. Cada desarrollo copia el catálogo por defecto al crearse.
        </p>
      </header>

      <div className="space-y-3">
        {developments.map((d) => (
          <ClickableRow
            key={d.id}
            href={`/admin/postventa/desarrollos/${d.id}`}
            className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border bg-card p-5 transition hover:border-primary/40"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Building2Icon className="size-5" />
              </span>
              <div>
                <p className="font-medium">{d.name}</p>
                <p className="text-sm text-muted-foreground">
                  {d.address}, {d.city}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-sm text-muted-foreground">{d._count.units} unidades</p>
              {isAdmin && <PostSaleDevelopmentRowActions id={d.id} name={d.name} />}
            </div>
          </ClickableRow>
        ))}
        {!developments.length && (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Todavía no hay desarrollos cargados.
          </p>
        )}
      </div>

      {isAdmin && <NewDevelopmentForm action={createDevelopment} inputClass={inputClass} />}
    </div>
  );
}
