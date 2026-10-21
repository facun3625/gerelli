"use server";

import { headers } from "next/headers";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { ActionError, toUserError } from "@/lib/action-error";
import { LOGIN_RULE, LOGIN_IP_RULE, clientIp, isRateLimited, recordFailure } from "@/lib/rate-limit";

// Segundo paso del alta del propietario: ya entró con Google (session
// existe), acá se cruza el DNI contra un PostSaleContact OWNER del tenant
// actual. A propósito NO se cruza también por email — el Gmail personal del
// propietario puede no ser el que cargó la constructora.
export async function linkPostSaleAccountByDni(form: FormData) {
  try {
    const tenant = await getCurrentTenant();
    if (!tenant) throw new ActionError("Tienda no encontrada");

    const session = await auth();
    if (!session?.user || session.user.tenantId !== tenant.id) {
      throw new ActionError("Iniciá sesión con Google para continuar");
    }

    const taxId = String(form.get("taxId") ?? "").trim();
    if (!taxId) throw new ActionError("Ingresá tu DNI");

    const hdrs = await headers();
    const accountKey = `postsale-dni:${tenant.id}:${session.user.id}`;
    const ipKey = `postsale-dni-ip:${clientIp(hdrs)}`;
    const [accountBlocked, ipBlocked] = await Promise.all([
      isRateLimited(accountKey, LOGIN_RULE),
      isRateLimited(ipKey, LOGIN_IP_RULE),
    ]);
    if (accountBlocked || ipBlocked) {
      throw new ActionError("Demasiados intentos. Probá de nuevo en un rato.");
    }

    const contact = await prisma.postSaleContact.findFirst({
      where: { tenantId: tenant.id, taxId, kind: "OWNER" },
    });
    if (!contact) {
      await Promise.all([recordFailure(accountKey), recordFailure(ipKey)]);
      throw new ActionError(
        "No encontramos una unidad asociada a ese DNI. Consultá con la constructora.",
      );
    }

    const existingLink = await prisma.user.findUnique({ where: { postSaleContactId: contact.id } });
    if (existingLink && existingLink.id !== session.user.id) {
      throw new ActionError(
        "Ese DNI ya tiene una cuenta vinculada — iniciá sesión con esa cuenta de Google.",
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { postSaleContactId: contact.id },
      }),
      // La carga masiva puede no traer nombre/email — Google los da
      // verificados en el login, así que completan lo que faltaba sin pisar
      // un dato que la constructora haya cargado a propósito.
      prisma.postSaleContact.update({
        where: { id: contact.id },
        data: {
          name: contact.name ?? session.user.name ?? undefined,
          email: contact.email ?? session.user.email ?? undefined,
        },
      }),
    ]);
  } catch (err) {
    return toUserError(err, "No se pudo completar el registro");
  }
  // redirect() acá pierde el header x-tenant-subdomain durante el re-render
  // interno del árbol de destino (ver nota en desarrollos/actions.ts) — el
  // cliente navega con router.push en su lugar.
  return { ok: true as const };
}
