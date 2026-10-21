import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/require-admin";

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost:3010";

// Reverso de mi-cuenta/tienda/page.tsx: desde el admin de la tienda, un pase
// efímero de un solo uso que abre el panel de Urbi (dominio raíz) ya
// logueado, sin pedir la contraseña de nuevo. Pensado para abrirse en una
// pestaña aparte (ver el pill de plan en admin-topbar.tsx).
export default async function OpenUrbiAccountPage() {
  const { session } = await requireTenantAdmin();

  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: { identifier: `onboarding:${session.user.id}`, token, expires: new Date(Date.now() + 5 * 60 * 1000) },
  });

  const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
  redirect(`${protocol}://${ROOT_DOMAIN}/entrar?callbackUrl=%2Fmi-cuenta%2Ftienda%2Fplan&token=${token}`);
}
