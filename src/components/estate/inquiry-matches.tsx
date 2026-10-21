import { requireAgent } from "@/lib/require-agent";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { searchCriteriaSchema, matchingPropertyWhere, matchingListingWhere, describeSearch } from "@/lib/estate/search-criteria";
import { getSearchOptions } from "@/lib/estate/search-options";
import { money } from "@/lib/estate/modules";
import { InquirySearchEditor } from "./inquiry-search-editor";
import { canAccessInquiry } from "@/lib/agent-permissions";

export async function InquiryMatches({ tenantId, inquiryId, agentView = false }: { tenantId: string; inquiryId: string; agentView?: boolean }) {
  const agentScope = agentView ? await requireAgent() : null;
  if (agentScope && agentScope.tenant.id !== tenantId) return null;
  const inquiry = await prisma.estateInquiry.findFirst({ where: { id: inquiryId, tenantId }, include: { contact: true } });
  if (agentScope && (!inquiry || !canAccessInquiry(agentScope.permissions, agentScope.agent.id, inquiry))) return null;
  if (!inquiry || inquiry.searchCriteria == null) return null;
  const parsed = searchCriteriaSchema.safeParse(inquiry.searchCriteria);
  if (!parsed.success) return <p className="mb-6 text-sm text-destructive">No se pudieron interpretar los criterios de esta búsqueda.</p>;
  const criteria = parsed.data;
  const where = matchingPropertyWhere(tenantId, criteria);
  const [properties, count, options] = await Promise.all([
    prisma.estateProperty.findMany({ where, include: { listings: { where: matchingListingWhere(criteria) } }, orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.estateProperty.count({ where }),
    getSearchOptions(tenantId),
  ]);
  return <section className="mb-8 space-y-4 rounded-2xl border bg-muted/20 p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">Cruce de propiedades</h3><p className="mt-1 text-sm text-muted-foreground">{count} coincidencia{count === 1 ? "" : "s"} con los requisitos guardados. Se recalcula al abrir esta consulta.</p></div>{inquiry.contact.email && <a href={`mailto:${inquiry.contact.email}`} className="rounded-lg border bg-background px-3 py-2 text-sm font-medium">Contactar por email</a>}</div>
    <div className="flex flex-wrap gap-2">{describeSearch(criteria).map((label) => <span key={label} className="rounded-full border bg-background px-3 py-1 text-xs">{label}</span>)}</div>
    {!agentView && <InquirySearchEditor key={JSON.stringify(criteria)} id={inquiry.id} criteria={criteria} options={options} />}
    {properties.length ? <div className="divide-y rounded-xl border bg-background">{properties.map((property) => <div key={property.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><Link href={agentView ? `/propiedades/${property.id}` : `/admin/gestion/propiedades/${property.id}`} className="font-medium hover:underline">{property.title}</Link><p className="mt-1 text-xs text-muted-foreground">{property.code} · {property.city} · {property.propertyType} · {property.bedrooms} dorm. · {property.bathrooms} baños</p><p className="mt-1 text-sm">{property.listings.map((listing) => `${listing.operation === "SALE" ? "Venta" : listing.temporary ? "Alquiler temporario" : "Alquiler mensual"}: ${listing.price == null ? "Sin precio cargado" : money(listing.price, listing.currency)}`).join(" · ")}</p></div><Link href={`/propiedades/${property.id}`} target="_blank" className="text-sm text-primary underline">Ver publicación</Link></div>)}</div> : <p className="rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Todavía no hay propiedades publicadas y disponibles que cumplan todos los requisitos. La búsqueda queda guardada para próximos cruces.</p>}
    {count > properties.length && <p className="text-xs text-muted-foreground">Se muestran las 20 coincidencias más recientes de {count}. Podés ajustar los requisitos para acotar la búsqueda.</p>}
    <p className="text-xs text-muted-foreground">Los datos sin especificar no cumplen requisitos explícitos. El presupuesto se compara con el precio registrado, aunque no se publique. No se convierten monedas.</p>
  </section>;
}
