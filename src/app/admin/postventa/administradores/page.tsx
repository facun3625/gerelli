import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { ClickableRow } from "@/components/estate/clickable-row";
import { NewPostSaleManagerForm } from "@/components/estate/post-sale-manager-form";
import { createManager } from "./actions";

export default async function PostSaleManagersPage() {
  const { tenant, session } = await requirePostSaleStaff();
  const isAdmin = session.user.role === "ADMIN";

  const managers = await prisma.postSaleManager.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { assignments: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Posventa</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Administradores</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Personas del staff con acceso a Posventa, cada una limitada a los desarrollos que le
          asignes. Un mismo email puede ser a la vez agente inmobiliario y administrador de
          posventa.
        </p>
      </header>

      <div className="divide-y rounded-2xl border bg-card">
        {managers.map((m) => (
          <ClickableRow
            key={m.id}
            href={`/admin/postventa/administradores/${m.id}`}
            className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
          >
            <div>
              <p className="font-medium">{m.name}</p>
              <p className="text-xs text-muted-foreground">
                {m.email ?? "Sin email cargado"}
                {m.phone && ` · ${m.phone}`}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {m._count.assignments} desarrollo{m._count.assignments === 1 ? "" : "s"}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 font-semibold ${
                  m.accessEnabled ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                }`}
              >
                {m.accessEnabled ? "Acceso activo" : "Sin acceso"}
              </span>
            </div>
          </ClickableRow>
        ))}
        {!managers.length && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Todavía no hay administradores cargados.
          </p>
        )}
      </div>

      {isAdmin && <NewPostSaleManagerForm action={createManager} />}
    </div>
  );
}
