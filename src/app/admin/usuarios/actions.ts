"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ActionError, toUserError } from "@/lib/action-error";
import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/require-admin";
import { createPasswordResetToken } from "@/lib/password-reset";
import { getStoreSettings } from "@/lib/settings";
import { sendMail } from "@/lib/mailer";
import { adminInviteEmail } from "@/lib/email-templates";
import type { Role } from "@/generated/prisma/client";

export async function setUserRole(id: string, role: Role) {
  try {
    return await runSetUserRole(id, role);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el usuario");
  }
}

async function runSetUserRole(id: string, role: Role) {
  const { session, tenant } = await requireTenantAdmin();
  if (session.user.id === id) {
    throw new ActionError("No podés cambiar tu propio rol");
  }

  if (role === "CUSTOMER") {
    const target = await prisma.user.findUnique({ where: { id, tenantId: tenant.id } });
    if (target?.role === "ADMIN") {
      const adminCount = await prisma.user.count({ where: { tenantId: tenant.id, role: "ADMIN" } });
      if (adminCount <= 1) throw new ActionError("Tiene que quedar al menos un admin");
    }
  }

  await prisma.user.update({ where: { id, tenantId: tenant.id }, data: { role } });
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${id}`);
  return { ok: true as const };
}

export async function deleteUser(id: string) {
  try {
    return await runDeleteUser(id);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el usuario");
  }
}

async function runDeleteUser(id: string) {
  const { session, tenant } = await requireTenantAdmin();
  if (session.user.id === id) {
    throw new ActionError("No podés borrar tu propia cuenta");
  }

  const target = await prisma.user.findUnique({ where: { id, tenantId: tenant.id } });
  if (!target) throw new ActionError("Usuario no encontrado");

  const orderCount = await prisma.order.count({ where: { userId: id } });
  if (orderCount > 0) {
    throw new ActionError("No se puede borrar un usuario con pedidos asociados — perderías ese historial.");
  }

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { tenantId: tenant.id, role: "ADMIN" } });
    if (adminCount <= 1) throw new ActionError("Tiene que quedar al menos un admin");
  }

  await prisma.user.delete({ where: { id, tenantId: tenant.id } });
  revalidatePath("/admin/usuarios");
  return { ok: true as const };
}

const inviteAdminSchema = z.object({
  name: z.string().trim().max(200).optional(),
  email: z.email().trim().toLowerCase(),
});

// Crea un admin directo, sin que la persona se registre antes — reusa el
// mismo mecanismo de "restablecer contraseña" (VerificationToken +
// /restablecer-contrasena) en vez de armar un sistema de invitación aparte:
// el usuario nace sin passwordHash (igual que uno logueado solo con Google)
// y ese link es la única forma de ponerle una contraseña por primera vez.
export async function inviteAdmin(form: FormData) {
  try {
    return await runInviteAdmin(form);
  } catch (err) {
    return toUserError(err, "No se pudo invitar al administrador");
  }
}

async function runInviteAdmin(form: FormData) {
  const { tenant } = await requireTenantAdmin();
  const parsed = inviteAdminSchema.safeParse({
    name: form.get("name"),
    email: form.get("email"),
  });
  if (!parsed.success) throw new ActionError("Ingresá un email válido");
  const { name, email } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email } },
  });
  if (existing) throw new ActionError("Ya hay un usuario con ese email en esta tienda");

  await prisma.user.create({
    data: { tenantId: tenant.id, name: name || null, email, role: "ADMIN" },
  });

  const token = await createPasswordResetToken(tenant.id, email);
  const hdrs = await headers();
  const host = hdrs.get("host");
  // OJO: el mismo chequeo en recuperar-contrasena/actions.ts usa startsWith,
  // que falla para un subdominio de tenant en local (demo-inmo.localhost no
  // empieza con "localhost") — acá va con includes para no heredar eso.
  const protocol = host?.includes("localhost") || host?.includes("127.0.0.1") ? "http" : "https";
  const inviteUrl = `${protocol}://${host}/restablecer-contrasena?email=${encodeURIComponent(email)}&token=${token}`;

  try {
    const storeSettings = await getStoreSettings(tenant.id);
    await sendMail({
      tenantId: tenant.id,
      to: email,
      subject: `Te invitaron a administrar ${storeSettings.storeName}`,
      html: adminInviteEmail({ storeName: storeSettings.storeName, inviteUrl }),
      type: "ADMIN_INVITE",
    });
  } catch (e) {
    // El usuario ya quedó creado y el link es válido igual — si el mail no
    // sale (por ejemplo, sin Resend configurado en esta plataforma), el
    // link que devolvemos abajo es el respaldo para compartir a mano.
    console.error("No se pudo enviar el mail de invitación", e);
  }

  revalidatePath("/admin/usuarios");
  return { ok: true as const, inviteUrl };
}
