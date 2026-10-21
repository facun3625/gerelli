"use server";

import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getPostSaleContact } from "@/lib/require-post-sale-portal";
import { ActionError, toUserError } from "@/lib/action-error";
import { uploadClaimPhotos } from "@/lib/post-sale-photos";

const schema = z.object({
  sectionId: z.string().min(1, "Elegí una sección"),
  rubroId: z.string().min(1, "Elegí un rubro"),
  title: z.string().trim().min(1, "Contanos brevemente qué pasa").max(120),
  description: z.string().trim().max(4000).optional(),
});

export async function createPostSaleClaim(unitId: string, form: FormData) {
  try {
    const { tenant, contact } = await getPostSaleContact();
    if (!tenant || !contact) throw new ActionError("Iniciá sesión para hacer un reclamo");

    const membership = await prisma.postSaleUnitMember.findFirst({
      where: { tenantId: tenant.id, unitId, contactId: contact.id },
      include: { unit: true },
    });
    if (!membership) throw new ActionError("No tenés acceso a esta unidad");

    const parsed = schema.parse({
      sectionId: form.get("sectionId"),
      rubroId: form.get("rubroId"),
      title: form.get("title"),
      description: form.get("description") || undefined,
    });

    // sectionId/rubroId deben ser instancias de ESTE desarrollo (no del
    // catálogo default ni de otro desarrollo) — se valida acá, no en la base.
    const [section, rubro] = await Promise.all([
      prisma.postSaleSection.findFirst({
        where: { id: parsed.sectionId, tenantId: tenant.id, developmentId: membership.unit.developmentId },
      }),
      prisma.postSaleRubro.findFirst({
        where: { id: parsed.rubroId, tenantId: tenant.id, sectionId: parsed.sectionId },
      }),
    ]);
    if (!section || !rubro) throw new ActionError("La sección o el rubro elegido no es válido");

    const photos = await uploadClaimPhotos(form, tenant.id);

    await prisma.postSaleClaim.create({
      data: {
        tenantId: tenant.id,
        developmentId: membership.unit.developmentId,
        unitId,
        contactId: contact.id,
        sectionId: parsed.sectionId,
        rubroId: parsed.rubroId,
        title: parsed.title,
        description: parsed.description ?? "",
        photos,
        events: { create: { status: "NEW" } },
      },
    });
  } catch (err) {
    return toUserError(err, "No se pudo crear el reclamo");
  }
  // redirect() server-side pierde el tenant durante el re-render interno
  // (ver nota en desarrollos/actions.ts) — navega el cliente en su lugar.
  return { ok: true as const };
}
