import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// "Ser revendedor" es tener un código, no un rol — así alguien puede ser
// admin de su propia tienda Y además repartir su código, sin que una cosa
// le saque la otra (ver becomeReseller en registro/elegir/actions.ts).
//
// Misma razón que requireOnboardingUser para reverificar contra la base: la
// sesión es JWT y no se refresca sola, así que si a alguien recién le
// generaron el código (o lo dieron de baja) su token viejo puede no
// reflejarlo todavía.
export async function requireReseller() {
  const session = await auth();
  if (!session?.user) redirect("/registro");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !user.referralCode || user.resellerDeactivatedAt) redirect("/registro");

  return { ...session, user: { ...session.user, id: user.id }, reseller: user };
}
