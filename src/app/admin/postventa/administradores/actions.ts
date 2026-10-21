"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { ActionError, toUserError } from "@/lib/action-error";

// Gestionar administradores es una acción estructural — solo el ADMIN de la
// cuenta, igual que el resto de las pantallas de alta de Posventa.
async function requireAdmin() {
  const { tenant, session } = await requirePostSaleStaff();
  if (session.user.role !== "ADMIN") {
    throw new ActionError("Solo un administrador puede hacer esto");
  }
  return { tenant };
}

const managerSchema = z.object({
  name: z.string().trim().min(1, "Ingresá un nombre").max(120),
  email: z.email("Ingresá un email válido").max(254).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional(),
});

export async function createManager(form: FormData) {
  try {
    const { tenant } = await requireAdmin();
    const parsed = managerSchema.parse({
      name: form.get("name"),
      email: form.get("email") || "",
      phone: form.get("phone") || undefined,
    });
    await prisma.postSaleManager.create({
      data: { tenantId: tenant.id, name: parsed.name, email: parsed.email || null, phone: parsed.phone },
    });
  } catch (err) {
    return toUserError(err, "No se pudo crear el administrador");
  }
  revalidatePath("/admin/postventa/administradores");
  return { ok: true as const };
}

export async function deleteManager(managerId: string) {
  try {
    const { tenant } = await requireAdmin();
    await prisma.postSaleManager.delete({ where: { id: managerId, tenantId: tenant.id } });
  } catch (err) {
    return toUserError(err, "No se pudo eliminar el administrador");
  }
  revalidatePath("/admin/postventa/administradores");
  return { ok: true as const };
}

// Espejo de saveAgentAccess (src/app/admin/gestion/agent-access-actions.ts)
// — mismo criterio de acceso (email+password propios, no comparten el
// login con el agente inmobiliario aunque sea la misma persona).
export async function saveManagerAccess(managerId: string, form: FormData) {
  try {
    const { tenant } = await requireAdmin();
    const manager = await prisma.postSaleManager.findFirst({ where: { id: managerId, tenantId: tenant.id } });
    if (!manager) throw new ActionError("Administrador no encontrado");
    const enabled = form.get("enabled") === "on";
    if (!enabled) {
      await prisma.postSaleManager.update({
        where: { id: manager.id, tenantId: tenant.id },
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
      if (!manager.userId && !password) throw new ActionError("Ingresá una contraseña para crear el acceso");
      const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
      await prisma.$transaction(async (tx) => {
        const existing = await tx.user.findUnique({ where: { tenantId_email: { tenantId: tenant.id, email } } });
        if (existing && existing.id !== manager.userId) {
          throw new ActionError("Ese email ya pertenece a otra cuenta. Usá otro email para el administrador.");
        }
        const user = manager.userId
          ? await tx.user.update({
              where: { id: manager.userId, tenantId: tenant.id, role: "AGENT" },
              data: { email, name: manager.name, passwordHash },
            })
          : await tx.user.create({
              data: { tenantId: tenant.id, role: "AGENT", email, name: manager.name, passwordHash },
            });
        await tx.postSaleManager.update({
          where: { id: manager.id, tenantId: tenant.id },
          data: { userId: user.id, accessEnabled: true },
        });
      });
    }
  } catch (err) {
    return toUserError(err, "No se pudo guardar el acceso del administrador");
  }
  revalidatePath("/admin/postventa/administradores");
  revalidatePath(`/admin/postventa/administradores/${managerId}`);
  return { ok: true as const };
}

export async function setManagerDevelopments(managerId: string, developmentIds: string[]) {
  try {
    const { tenant } = await requireAdmin();
    const manager = await prisma.postSaleManager.findFirst({ where: { id: managerId, tenantId: tenant.id } });
    if (!manager) throw new ActionError("Administrador no encontrado");

    // Valida que los ids elegidos sean desarrollos reales de este tenant
    // antes de reemplazar las asignaciones — un id inventado no debería
    // poder colarse acá.
    const validIds = developmentIds.length
      ? (
          await prisma.postSaleDevelopment.findMany({
            where: { tenantId: tenant.id, id: { in: developmentIds } },
            select: { id: true },
          })
        ).map((d) => d.id)
      : [];

    await prisma.$transaction([
      prisma.postSaleManagerBuilding.deleteMany({ where: { tenantId: tenant.id, managerId } }),
      ...(validIds.length
        ? [
            prisma.postSaleManagerBuilding.createMany({
              data: validIds.map((developmentId) => ({ tenantId: tenant.id, managerId, developmentId })),
            }),
          ]
        : []),
    ]);
  } catch (err) {
    return toUserError(err, "No se pudieron guardar los desarrollos asignados");
  }
  revalidatePath(`/admin/postventa/administradores/${managerId}`);
  return { ok: true as const };
}
