"use server";

import { revalidatePath } from "next/cache";
import { requireTenantAdmin } from "@/lib/require-admin";
import { toUserError } from "@/lib/action-error";
import {
  publishListingToMercadoLibre,
  pauseListingOnMercadoLibre,
  reactivateListingOnMercadoLibre,
  closeListingOnMercadoLibre,
  getListingRequirements,
  saveListingOptions,
} from "@/lib/mercadolibre/publish";

async function withTenant<T>(listingId: string, run: (tenantId: string) => Promise<T>) {
  const { tenant } = await requireTenantAdmin();
  return run(tenant.id);
}

export async function publishToMercadoLibre(propertyId: string, listingId: string) {
  try {
    await withTenant(listingId, (tenantId) => publishListingToMercadoLibre(tenantId, listingId));
    revalidatePath(`/admin/gestion/propiedades/${propertyId}`);
    return { ok: true as const };
  } catch (err) {
    return toUserError(err, "No se pudo publicar en Mercado Libre");
  }
}

export async function pauseMercadoLibreListing(propertyId: string, listingId: string) {
  try {
    await withTenant(listingId, (tenantId) => pauseListingOnMercadoLibre(tenantId, listingId));
    revalidatePath(`/admin/gestion/propiedades/${propertyId}`);
    return { ok: true as const };
  } catch (err) {
    return toUserError(err, "No se pudo pausar la publicación");
  }
}

export async function reactivateMercadoLibreListing(propertyId: string, listingId: string) {
  try {
    await withTenant(listingId, (tenantId) => reactivateListingOnMercadoLibre(tenantId, listingId));
    revalidatePath(`/admin/gestion/propiedades/${propertyId}`);
    return { ok: true as const };
  } catch (err) {
    return toUserError(err, "No se pudo reactivar la publicación");
  }
}

export async function closeMercadoLibreListing(propertyId: string, listingId: string) {
  try {
    await withTenant(listingId, (tenantId) => closeListingOnMercadoLibre(tenantId, listingId));
    revalidatePath(`/admin/gestion/propiedades/${propertyId}`);
    return { ok: true as const };
  } catch (err) {
    return toUserError(err, "No se pudo cerrar la publicación");
  }
}

export async function getMercadoLibreRequirements(listingId: string) {
  try {
    const { tenant } = await requireTenantAdmin();
    return { ok: true as const, requirements: await getListingRequirements(tenant.id, listingId) };
  } catch (err) {
    return toUserError(err, "No se pudo consultar Mercado Libre");
  }
}

export async function saveMercadoLibreOptions(
  propertyId: string,
  listingId: string,
  options: { attributes: Record<string, string>; listingTypeId: string | null },
) {
  try {
    const { tenant } = await requireTenantAdmin();
    await saveListingOptions(tenant.id, listingId, options);
    revalidatePath(`/admin/gestion/propiedades/${propertyId}`);
    return { ok: true as const };
  } catch (err) {
    return toUserError(err, "No se pudo guardar");
  }
}
