import { prisma } from "@/lib/prisma";
import { requireProvider } from "@/lib/require-provider";
import { AccountMenu } from "@/components/account-menu";
import { ClickableRow } from "@/components/estate/clickable-row";

const STATUS_LABEL: Record<string, string> = {
  NEW: "Nuevo",
  ASSIGNED: "Asignado",
  IN_PROGRESS: "En progreso",
  RESOLVED: "Resuelto",
  REJECTED: "Rechazado",
  CLOSED: "Cerrado",
};

export default async function ProviderPage() {
  const { provider, tenant } = await requireProvider();

  const claims = await prisma.postSaleClaim.findMany({
    where: { tenantId: tenant.id, assignedProviderId: provider.id },
    include: {
      development: true,
      unit: true,
      section: true,
      rubro: true,
      messages: { where: { sender: { not: "PROVIDER" } }, select: { createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reclamos derivados</h1>
          <p className="mt-1 text-sm text-muted-foreground">{provider.name}</p>
        </div>
        <AccountMenu />
      </header>

      <div className="divide-y rounded-2xl border">
        {claims.map((claim) => {
          const unread = claim.messages.filter(
            (m) => !claim.providerLastReadAt || m.createdAt > claim.providerLastReadAt,
          ).length;
          return (
            <ClickableRow
              key={claim.id}
              href={`/proveedor/reclamos/${claim.id}`}
              className="block cursor-pointer space-y-1 p-4 transition-colors hover:bg-muted/40"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium">
                  {claim.title}
                  {unread > 0 && (
                    <span className="flex min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                      {unread}
                    </span>
                  )}
                </span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {STATUS_LABEL[claim.status] ?? claim.status}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {claim.development.name} · {claim.unit.label} · {claim.section.name}/{claim.rubro.name}
              </p>
            </ClickableRow>
          );
        })}
        {!claims.length && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            No tenés reclamos derivados todavía.
          </p>
        )}
      </div>
    </main>
  );
}
