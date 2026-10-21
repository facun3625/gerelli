import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { ClickableRow } from "@/components/estate/clickable-row";
import { NewPostSaleProviderForm } from "@/components/estate/post-sale-provider-form";
import { createProvider } from "./actions";

export default async function PostSaleProvidersPage() {
  const { tenant } = await requirePostSaleStaff();

  const providers = await prisma.postSaleProvider.findMany({
    where: { tenantId: tenant.id },
    include: { _count: { select: { claims: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Posventa</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Proveedores</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Contratistas, constructoras subcontratadas o cualquier tercero al que se le puede
          derivar un reclamo para resolverlo. Pueden tener su propio login para ver y actualizar
          solo lo que se les derivó.
        </p>
      </header>

      <div className="divide-y rounded-2xl border bg-card">
        {providers.map((p) => (
          <ClickableRow
            key={p.id}
            href={`/admin/postventa/proveedores/${p.id}`}
            className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/40"
          >
            <div>
              <p className="font-medium">
                {p.name}
                {p.specialty && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{p.specialty}</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {[p.phone, p.email].filter(Boolean).join(" · ") || "Sin contacto cargado"}
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {p._count.claims} reclamo{p._count.claims === 1 ? "" : "s"}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 font-semibold ${
                  p.accessEnabled ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                }`}
              >
                {p.accessEnabled ? "Acceso activo" : "Sin acceso"}
              </span>
            </div>
          </ClickableRow>
        ))}
        {!providers.length && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Todavía no hay proveedores cargados.
          </p>
        )}
      </div>

      <NewPostSaleProviderForm action={createProvider} />
    </div>
  );
}
