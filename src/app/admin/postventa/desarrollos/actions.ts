"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { ActionError, toUserError } from "@/lib/action-error";

// Dar de alta un desarrollo es una acción estructural (crea la jerarquía que
// después un PostSaleManager solo administra) — solo el admin de la cuenta,
// igual que el catálogo default.
async function requireAdmin() {
  const { tenant, session } = await requirePostSaleStaff();
  if (session.user.role !== "ADMIN") {
    throw new ActionError("Solo un administrador puede hacer esto");
  }
  return { tenant };
}

const developmentSchema = z.object({
  name: z.string().trim().min(1, "Ingresá un nombre").max(120),
  address: z.string().trim().min(1, "Ingresá una dirección").max(200),
  city: z.string().trim().min(1, "Ingresá una ciudad").max(120),
});

export async function createDevelopment(form: FormData) {
  let developmentId: string;
  try {
    const { tenant } = await requireAdmin();
    const parsed = developmentSchema.parse({
      name: form.get("name"),
      address: form.get("address"),
      city: form.get("city"),
    });

    developmentId = await prisma.$transaction(async (tx) => {
      const development = await tx.postSaleDevelopment.create({
        data: { tenantId: tenant.id, ...parsed },
      });

      // Copia (no referencia) el catálogo default del tenant a este
      // desarrollo — editable después sin tocar el default.
      const defaultSections = await tx.postSaleSection.findMany({
        where: { tenantId: tenant.id, developmentId: null },
        orderBy: { order: "asc" },
        include: { rubros: { orderBy: { order: "asc" } } },
      });
      for (const section of defaultSections) {
        const instance = await tx.postSaleSection.create({
          data: {
            tenantId: tenant.id,
            developmentId: development.id,
            name: section.name,
            order: section.order,
          },
        });
        if (section.rubros.length) {
          await tx.postSaleRubro.createMany({
            data: section.rubros.map((r) => ({
              tenantId: tenant.id,
              sectionId: instance.id,
              name: r.name,
              order: r.order,
              isCatchAll: r.isCatchAll,
              warrantyMonths: r.warrantyMonths,
            })),
          });
        }
      }

      return development.id;
    });
  } catch (err) {
    return toUserError(err, "No se pudo crear el desarrollo");
  }
  revalidatePath("/admin/postventa/desarrollos");
  // Server-side redirect() acá dispara un re-render de todo el árbol de
  // layouts (incluido AdminLayout) dentro de la MISMA respuesta de la
  // server action, y ese re-render pierde el header x-tenant-subdomain que
  // pone proxy.ts — getCurrentTenant() da null ahí ("Tienda no
  // encontrada"). Por eso se devuelve el id y el cliente navega con
  // router.push, mismo patrón que el resto del admin (ver
  // agent-access-editor.tsx).
  return { ok: true as const, id: developmentId };
}

// Los propietarios (PostSaleContact) NO pertenecen a un desarrollo — el
// mismo DNI puede tener unidades en varios. Por eso el borrado es manual y
// explícito (no un simple .delete() con cascada completa): solo se borra lo
// que es propio de ESTE desarrollo — reclamos, membresías de sus unidades y
// las unidades — y el contacto del propietario queda intacto aunque se
// quede sin unidades acá, por si tiene otras en otro desarrollo. El
// catálogo instancia (Sección/Rubro) y las asignaciones de manager sí
// cascadean solos a nivel de base (onDelete: Cascade en el schema).
export async function deleteDevelopment(developmentId: string) {
  try {
    const { tenant } = await requireAdmin();
    const development = await prisma.postSaleDevelopment.findFirst({
      where: { id: developmentId, tenantId: tenant.id },
      select: { id: true },
    });
    if (!development) throw new ActionError("Desarrollo no encontrado");

    await prisma.$transaction(async (tx) => {
      await tx.postSaleClaim.deleteMany({ where: { tenantId: tenant.id, developmentId } });
      await tx.postSaleUnitMember.deleteMany({
        where: { tenantId: tenant.id, unit: { developmentId } },
      });
      await tx.postSaleUnit.deleteMany({ where: { tenantId: tenant.id, developmentId } });
      await tx.postSaleDevelopment.delete({ where: { id: developmentId, tenantId: tenant.id } });
    });
  } catch (err) {
    return toUserError(err, "No se pudo eliminar el desarrollo");
  }
  revalidatePath("/admin/postventa/desarrollos");
  revalidatePath("/admin/postventa");
  return { ok: true as const };
}

const unitSchema = z.object({
  label: z.string().trim().min(1, "Ingresá una etiqueta (ej: Torre A - 4B)").max(80),
  floor: z.string().trim().max(40).optional(),
  deliveredAt: z.string().trim().max(10).optional(),
});

export async function createUnit(developmentId: string, form: FormData) {
  try {
    const { tenant } = await requireAdmin();
    const parsed = unitSchema.parse({
      label: form.get("label"),
      floor: form.get("floor") || undefined,
      deliveredAt: form.get("deliveredAt") || undefined,
    });
    const development = await prisma.postSaleDevelopment.findFirst({
      where: { id: developmentId, tenantId: tenant.id },
    });
    if (!development) throw new ActionError("Desarrollo no encontrado");
    await prisma.postSaleUnit.create({
      data: {
        tenantId: tenant.id,
        developmentId,
        label: parsed.label,
        floor: parsed.floor,
        deliveredAt: parsed.deliveredAt ? new Date(parsed.deliveredAt) : undefined,
      },
    });
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "P2002") {
      return { error: "Ya existe una unidad con esa etiqueta en este desarrollo" };
    }
    return toUserError(err, "No se pudo crear la unidad");
  }
  revalidatePath(`/admin/postventa/desarrollos/${developmentId}`);
  return { ok: true as const };
}

const ownerSchema = z.object({
  name: z.string().trim().min(1, "Ingresá un nombre").max(120),
  taxId: z.string().trim().min(1, "Ingresá el DNI del propietario").max(40),
  email: z.email("Ingresá un email válido").max(254).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
});

export async function addOwnerToUnit(unitId: string, form: FormData) {
  try {
    const { tenant } = await requireAdmin();
    const parsed = ownerSchema.parse({
      name: form.get("name"),
      taxId: form.get("taxId"),
      email: form.get("email") || "",
      phone: form.get("phone") || undefined,
    });
    const unit = await prisma.postSaleUnit.findFirst({
      where: { id: unitId, tenantId: tenant.id },
      select: { id: true, developmentId: true },
    });
    if (!unit) throw new ActionError("Unidad no encontrada");

    await prisma.$transaction(async (tx) => {
      // Un mismo DNI puede ser dueño de varias unidades — reusamos el
      // contacto si ya existe en vez de duplicarlo.
      const existing = await tx.postSaleContact.findFirst({
        where: { tenantId: tenant.id, taxId: parsed.taxId, kind: "OWNER" },
      });
      const contact =
        existing ??
        (await tx.postSaleContact.create({
          data: {
            tenantId: tenant.id,
            kind: "OWNER",
            name: parsed.name,
            taxId: parsed.taxId,
            email: parsed.email || null,
            phone: parsed.phone,
          },
        }));

      const alreadyMember = await tx.postSaleUnitMember.findFirst({
        where: { tenantId: tenant.id, unitId, contactId: contact.id },
      });
      if (alreadyMember) throw new ActionError("Ese propietario ya está cargado en esta unidad");

      await tx.postSaleUnitMember.create({
        data: { tenantId: tenant.id, unitId, contactId: contact.id },
      });
    });
    revalidatePath(`/admin/postventa/desarrollos/${unit.developmentId}`);
    return { ok: true as const };
  } catch (err) {
    return toUserError(err, "No se pudo cargar el propietario");
  }
}

export async function removeOwnerFromUnit(developmentId: string, unitMemberId: string) {
  try {
    const { tenant } = await requireAdmin();
    await prisma.postSaleUnitMember.delete({
      where: { id: unitMemberId, tenantId: tenant.id },
    });
  } catch (err) {
    return toUserError(err, "No se pudo quitar el propietario");
  }
  revalidatePath(`/admin/postventa/desarrollos/${developmentId}`);
  return { ok: true as const };
}
