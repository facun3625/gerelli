import "server-only";
import { prisma } from "@/lib/prisma";
import { mlFetch, MercadoLibreApiError } from "@/lib/mercadolibre/client";
import { getMercadoLibreSettings } from "@/lib/mercadolibre/settings";
import { resolveCategoryForPropertyType, getCategoryAttributes } from "@/lib/mercadolibre/categories";
import { buildAttributeValues, validateListingBeforePublish, type PropertyForMl } from "@/lib/mercadolibre/mapping";
import type { EstateListing } from "@/generated/prisma/client";

export class MercadoLibreValidationError extends Error {
  constructor(public issues: string[]) {
    super(issues.join(" / "));
  }
}

type MlItemResponse = { id: string; permalink: string; status: string };

async function resolveLocation(tenantId: string, property: PropertyForMl) {
  const match = await prisma.estateMlLocation.findUnique({
    where: { tenantId_city_neighborhood: { tenantId, city: property.city, neighborhood: property.neighborhood } },
  });
  if (!match) {
    throw new MercadoLibreValidationError([
      `Falta mapear "${property.city}${property.neighborhood ? " / " + property.neighborhood : ""}" a una ubicación de Mercado Libre — resolvelo en Configuración → Mercado Libre.`,
    ]);
  }
  return match;
}

async function buildPayload(tenantId: string, property: PropertyForMl, listing: EstateListing) {
  const preIssues = validateListingBeforePublish(property, listing);
  if (preIssues.length > 0) throw new MercadoLibreValidationError(preIssues.map((i) => i.message));

  const settings = await getMercadoLibreSettings(tenantId);
  const location = await resolveLocation(tenantId, property);
  const category = await resolveCategoryForPropertyType(tenantId, settings.siteId, property.propertyType);
  const attributes = await getCategoryAttributes(tenantId, category.id);
  const { attributes: attributeValues, unmappedRequired } = await buildAttributeValues(attributes, property, listing);

  if (unmappedRequired.length > 0) {
    throw new MercadoLibreValidationError(
      unmappedRequired.map((a) => `Mercado Libre pide completar "${a.name}" (${a.id}) y todavía no sabemos resolverlo automáticamente.`),
    );
  }

  return {
    categoryId: category.id,
    body: {
      title: property.title.slice(0, 60),
      category_id: category.id,
      price: Number(listing.price),
      currency_id: listing.currency,
      buying_mode: "classified" as const,
      listing_type_id: listing.mlListingTypeId ?? "silver",
      available_quantity: 1,
      // ML solo quiere UN id (barrio o ciudad) — si mandás el de barrio
      // completa estado y ciudad solo; mandar el de estado directamente
      // hace que rechace la publicación (ver src/lib/mercadolibre/locations.ts).
      // No mandamos address_line a propósito: EstateProperty.address es
      // privada (no se muestra en la web pública, ver estate/modules.ts) y
      // mandarla a un tercero rompería esa decisión. lat/long sí son
      // públicas (se usan en /mapa), así que van para el pin preciso.
      location: {
        ...(location.mlNeighborhoodId ? { neighborhood: { id: location.mlNeighborhoodId } } : { city: { id: location.mlCityId } }),
        ...(property.latitude != null && property.longitude != null
          ? { latitude: Number(property.latitude), longitude: Number(property.longitude) }
          : {}),
      },
      pictures: property.media.map((m) => ({ source: m.url })),
      attributes: attributeValues,
    },
  };
}

async function setDescription(tenantId: string, itemId: string, text: string) {
  if (!text.trim()) return;
  try {
    await mlFetch(tenantId, `/items/${itemId}/description`, { method: "POST", body: { plain_text: text.slice(0, 50_000) } });
  } catch {
    // La descripción es secundaria — si falla no abortamos una publicación
    // que ya quedó creada en Mercado Libre.
  }
}

async function persistSyncResult(listingId: string, data: {
  mlItemId?: string | null;
  mlPermalink?: string | null;
  mlCategoryId?: string | null;
  mlStatus?: string | null;
  mlLastError?: string | null;
}) {
  await prisma.estateListing.update({
    where: { id: listingId },
    data: { ...data, mlLastSyncedAt: new Date() },
  });
}

export async function publishListingToMercadoLibre(tenantId: string, listingId: string): Promise<void> {
  const listing = await prisma.estateListing.findFirst({
    where: { id: listingId, tenantId },
    include: { property: { include: { media: { orderBy: { position: "asc" } } } } },
  });
  if (!listing) throw new Error("Oferta no encontrada");

  try {
    const { categoryId, body } = await buildPayload(tenantId, listing.property, listing);
    const isUpdate = Boolean(listing.mlItemId);
    const response = isUpdate
      ? await mlFetch<MlItemResponse>(tenantId, `/items/${listing.mlItemId}`, { method: "PUT", body })
      : await mlFetch<MlItemResponse>(tenantId, "/items", { method: "POST", body });

    await setDescription(tenantId, response.id, listing.property.description);
    await persistSyncResult(listing.id, {
      mlItemId: response.id,
      mlPermalink: response.permalink,
      mlCategoryId: categoryId,
      mlStatus: response.status,
      mlLastError: null,
    });
  } catch (err) {
    const message = err instanceof MercadoLibreValidationError
      ? err.issues.join(" / ")
      : err instanceof MercadoLibreApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Error desconocido";
    await persistSyncResult(listing.id, { mlLastError: message });
    throw new Error(message);
  }
}

async function setListingStatus(tenantId: string, listingId: string, status: "paused" | "active" | "closed"): Promise<void> {
  const listing = await prisma.estateListing.findFirst({ where: { id: listingId, tenantId } });
  if (!listing?.mlItemId) throw new Error("Esta oferta todavía no se publicó en Mercado Libre");
  try {
    const response = await mlFetch<MlItemResponse>(tenantId, `/items/${listing.mlItemId}`, { method: "PUT", body: { status } });
    await persistSyncResult(listing.id, { mlStatus: response.status, mlLastError: null });
  } catch (err) {
    const message = err instanceof MercadoLibreApiError ? err.message : err instanceof Error ? err.message : "Error desconocido";
    await persistSyncResult(listing.id, { mlLastError: message });
    throw new Error(message);
  }
}

export const pauseListingOnMercadoLibre = (tenantId: string, listingId: string) => setListingStatus(tenantId, listingId, "paused");
export const reactivateListingOnMercadoLibre = (tenantId: string, listingId: string) => setListingStatus(tenantId, listingId, "active");
export const closeListingOnMercadoLibre = (tenantId: string, listingId: string) => setListingStatus(tenantId, listingId, "closed");
