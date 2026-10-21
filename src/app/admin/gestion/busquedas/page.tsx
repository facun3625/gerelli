import Link from "next/link";
import { inquiryChannelWhere } from "@/lib/estate/inquiry-channels";
import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/require-admin";
import { describeSearch, searchCriteriaSchema } from "@/lib/estate/search-criteria";
import { consultaStatusBadgeClass, labels } from "@/lib/estate/modules";

export default async function BusquedasPage({ searchParams }: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { tenant } = await requireTenantAdmin();
  const search = await searchParams;
  const page = Math.max(1, Math.min(10000, Math.floor(Number(search.page)) || 1));
  const inquiries = await prisma.estateInquiry.findMany({
    where: { tenantId: tenant.id, ...inquiryChannelWhere("searches") },
    include: { contact: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * 30,
    take: 31,
  });
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Búsquedas guardadas</h1>
        <p className="mt-2 text-sm text-muted-foreground">Requisitos enviados desde el formulario de alertas. Abrí una búsqueda para ver propiedades compatibles, editar los criterios y contactar al interesado.</p>
      </div>
      {inquiries.length ? (
        <div className="divide-y overflow-hidden rounded-2xl border bg-card">
          {inquiries.slice(0, 30).map((inquiry) => {
            const parsed = searchCriteriaSchema.safeParse(inquiry.searchCriteria);
            return (
              <Link key={inquiry.id} href={`/admin/gestion/consultas?channel=searches&edit=${inquiry.id}`} className="flex flex-col gap-3 p-5 transition-colors hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <h2 className="font-semibold">{inquiry.contact.name}</h2>
                  <p className="text-sm text-muted-foreground">{inquiry.contact.email}</p>
                  <p className="mt-2 text-sm">{parsed.success ? describeSearch(parsed.data).join(" · ") : inquiry.message}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs ${consultaStatusBadgeClass(inquiry.status)}`}>{labels[inquiry.status] ?? inquiry.status}</span>
                  <span className="text-sm font-medium text-primary">Ver coincidencias →</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-dashed p-8 text-center">
          <h2 className="font-semibold">Todavía no hay búsquedas guardadas en esta página</h2>
          <p className="text-sm text-muted-foreground">Las solicitudes del formulario de alertas aparecen acá. Las anteriores se conservan como texto libre y no generan coincidencias automáticas.</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link href="/alertas" target="_blank" className="text-primary underline">Abrir formulario de alertas</Link>
            <Link href="/admin/gestion/consultas" className="text-primary underline">Ver consultas inmobiliarias</Link>
          </div>
        </div>
      )}
      <nav aria-label="Paginación" className="flex justify-between text-sm">
        {page > 1 ? <Link href={`?page=${page - 1}`} className="underline">Anterior</Link> : <span />}
        {inquiries.length > 30 && <Link href={`?page=${page + 1}`} className="underline">Siguiente</Link>}
      </nav>
    </div>
  );
}
