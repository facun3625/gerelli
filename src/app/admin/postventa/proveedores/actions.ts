"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { ActionError, toUserError } from "@/lib/action-error";

// Proveedores es tenant-wide (no por desarrollo) — cualquiera con acceso a
// Posventa puede cargarlos, no solo el ADMIN (a diferencia de
// Administradores, que sí es exclusivo del dueño de la cuenta).
const providerSchema = z.object({
  name: z.string().trim().min(1, "Ingresá un nombre").max(120),
  phone: z.string().trim().max(40).optional(),
  email: z.email("Ingresá un email válido").max(254).optional().or(z.literal("")),
  specialty: z.string().trim().max(120).optional(),
});

export async function createProvider(form: FormData) {
  try {
    const { tenant } = await requirePostSaleStaff();
    const parsed = providerSchema.parse({
      name: form.get("name"),
      phone: form.get("phone") || undefined,
      email: form.get("email") || "",
      specialty: form.get("specialty") || undefined,
    });
    await prisma.postSaleProvider.create({
      data: {
        tenantId: tenant.id,
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email || null,
        specialty: parsed.specialty ?? "",
      },
    });
  } catch (err) {
    return toUserError(err, "No se pudo crear el proveedor");
  }
  revalidatePath("/admin/postventa/proveedores");
  return { ok: true as const };
}

export async function deleteProvider(providerId: string) {
  try {
    const { tenant, session } = await requirePostSaleStaff();
    if (session.user.role !== "ADMIN") {
      throw new ActionError("Solo un administrador puede eliminar proveedores");
    }
    await prisma.postSaleProvider.delete({ where: { id: providerId, tenantId: tenant.id } });
  } catch (err) {
    return toUserError(err, "No se pudo eliminar el proveedor");
  }
  revalidatePath("/admin/postventa/proveedores");
  return { ok: true as const };
}

// Espejo de saveManagerAccess/saveAgentAccess — mismo criterio de login
// propio (email+password), rol AGENT compartido, ficha distinta.
export async function saveProviderAccess(providerId: string, form: FormData) {
  try {
    const { tenant, session } = await requirePostSaleStaff();
    if (session.user.role !== "ADMIN") throw new ActionError("Solo un administrador puede modificar accesos de proveedores");
    const provider = await prisma.postSaleProvider.findFirst({ where: { id: providerId, tenantId: tenant.id } });
    if (!provider) throw new ActionError("Proveedor no encontrado");
    const enabled = form.get("enabled") === "on";
    if (!enabled) {
      await prisma.postSaleProvider.update({
        where: { id: provider.id, tenantId: tenant.id },
        data: { accessEnabled: false },
      });
    } else {
      const email = z
        .email("Ingresá un email válido")
        .max(254)
        .parse(String(form.get("email") ?? "").trim().toLowerCase());
      const password = z
        .union([
          z.literal(""),
          z.string().min(12, "La contraseña debe tener al menos 12 caracteres").max(72, "La contraseña puede tener hasta 72 caracteres"),
        ])
        .parse(String(form.get("password") ?? ""));
      if (!provider.userId && !password) throw new ActionError("Ingresá una contraseña para crear el acceso");
      const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
      await prisma.$transaction(async (tx) => {
        const existing = await tx.user.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email } } });
        if (existing && existing.id !== provider.userId) {
          throw new ActionError("Ese email ya pertenece a otra cuenta. Usá otro email para el proveedor.");
        }
        const user = provider.userId
          ? await tx.user.update({
              where: { id: provider.userId, tenantId: tenant.id, role: "AGENT" },
              data: { email, name: provider.name, passwordHash },
            })
          : await tx.user.create({
              data: { tenantId: tenant.id, role: "AGENT", email, name: provider.name, passwordHash },
            });
        await tx.postSaleProvider.update({
          where: { id: provider.id, tenantId: tenant.id },
          data: { userId: user.id, accessEnabled: true },
        });
      });
    }
  } catch (err) {
    return toUserError(err, "No se pudo guardar el acceso del proveedor");
  }
  revalidatePath("/admin/postventa/proveedores");
  revalidatePath(`/admin/postventa/proveedores/${providerId}`);
  return { ok: true as const };
}
