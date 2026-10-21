import { prisma } from "@/lib/prisma";
import { DomainRequestRow } from "./domain-request-row";

export default async function DomainRequestsPage() {
  const requests = await prisma.domainRequest.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { tenant: { select: { subdomain: true } } },
  });

  const storeNames = requests.length
    ? await prisma.settings.findMany({
        where: { tenantId: { in: requests.map((r) => r.tenantId) }, key: "store_name" },
        select: { tenantId: true, value: true },
      })
    : [];
  const storeNameByTenant = new Map(storeNames.map((s) => [s.tenantId, s.value]));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold">Solicitudes de dominio</h1>
        <p className="text-sm text-muted-foreground">
          Tiendas que pidieron que Urbi compre y configure su dominio propio en vez de hacerlo ellas mismas.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {requests.map((r) => (
          <DomainRequestRow
            key={r.id}
            request={{
              id: r.id,
              contactName: r.contactName,
              contactEmail: r.contactEmail,
              contactPhone: r.contactPhone,
              domainOptions: r.domainOptions,
              notes: r.notes,
              status: r.status,
              createdAt: r.createdAt.toISOString(),
              tenant: {
                subdomain: r.tenant.subdomain,
                storeName: storeNameByTenant.get(r.tenantId) ?? r.tenant.subdomain,
              },
            }}
          />
        ))}
        {requests.length === 0 && (
          <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Todavía no hay solicitudes de dominio.
          </p>
        )}
      </div>
    </div>
  );
}
