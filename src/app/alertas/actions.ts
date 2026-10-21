"use server";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { canTenantReceiveOrders } from "@/lib/billing-status";
import { isRateLimited, recordFailure, clientIp } from "@/lib/rate-limit";
import { ActionError, toUserError } from "@/lib/action-error";

import { searchCriteriaSchema, describeSearch } from "@/lib/estate/search-criteria";
import { getSearchOptions } from "@/lib/estate/search-options";

export async function subscribeToAlerts(form: FormData) {
  const tenant = await getCurrentTenant();
  try {
    if (!tenant || !canTenantReceiveOrders(tenant))
      throw new ActionError("El sitio no está disponible");
    const data = z
      .object({
        name: z.string().trim().min(2).max(150),
        email: z.email().max(254),
        website: z.literal(""),
      })
      .parse(Object.fromEntries(form));
    const key = `estate-alert:${tenant.id}:${clientIp(await headers())}`;
    if (await isRateLimited(key, { limit: 5, windowMinutes: 60 }))
      throw new ActionError("Ya recibimos varias solicitudes. Intentá más tarde.");
    await recordFailure(key);
    const criteria = searchCriteriaSchema.parse(Object.fromEntries(form));
    const options = await getSearchOptions(tenant.id);
    if (criteria.city && !options.cities.includes(criteria.city))
      throw new ActionError("Elegí una ciudad del listado");
    if (criteria.propertyType && !options.propertyTypes.includes(criteria.propertyType))
      throw new ActionError("Elegí un tipo de propiedad del listado");
    await prisma.$transaction(async (tx) => {
      const contact = await tx.estateContact.create({
        data: { tenantId: tenant.id, name: data.name, email: data.email, roles: ["PROSPECT"] },
      });
      await tx.estateInquiry.create({
        data: {
          tenantId: tenant.id,
          contactId: contact.id,
          searchCriteria: criteria,
          message: `Búsqueda de propiedades: ${describeSearch(criteria).join(" · ")}.`,
          source: "ALERTA",
        },
      });
    });
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (error) {
    return toUserError(error, "No pudimos registrar tu solicitud");
  }
}
