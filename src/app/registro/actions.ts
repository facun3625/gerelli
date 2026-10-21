"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Guarda el código de un revendedor que la persona trajo consigo (por
// /registro?ref=CODIGO) mientras todavía se está registrando — se consume
// recién cuando de verdad crea la tienda (ver registro/datos/actions.ts).
// No valida el código acá a propósito: si es inválido o de un revendedor
// dado de baja, en ese momento simplemente no queda asociado a nadie, no
// hace falta bloquear ni avisar nada acá.
export async function savePendingReferralCode(code: string) {
  const session = await auth();
  if (!session?.user) return;

  await prisma.user.update({
    where: { id: session.user.id },
    data: { pendingReferralCode: code },
  }).catch(() => {});
}

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost:3010";

// Si alguien falla el login acá es, casi siempre, porque escribió mal el
// email/contraseña — pero también puede ser la dueña de una tienda real
// tocando "Iniciar sesión" desde la web pública sin saber que su login vive
// en el subdominio de su tienda, no acá (este formulario solo busca entre
// revendedores y gente sin tienda todavía). Si el email coincide con un
// ADMIN, le devolvemos el link correcto en vez de dejar que piense que se
// equivocó de contraseña.
export async function findAdminLoginLink(email: string): Promise<string | null> {
  const admin = await prisma.user.findFirst({
    where: { email, role: "ADMIN", tenantId: { not: null } },
    include: { tenant: true },
  });
  if (!admin?.tenant) return null;

  const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${admin.tenant.subdomain}.${ROOT_DOMAIN}/login`;
}
