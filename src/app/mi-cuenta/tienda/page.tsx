import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost:3010";

// La sesión de urbi.com.ar nunca se comparte directamente con la inmobiliaria.
// Este endpoint crea un pase corto, de un solo uso, únicamente después de
// que el dueño toca "Ir al panel de mi inmobiliaria" desde su cuenta central.
export default async function OpenStoreAdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { tenant: true },
  });
  if (!user?.tenant || user.role !== "ADMIN") redirect("/mi-cuenta");

  const token = randomBytes(32).toString("hex");
  await prisma.verificationToken.create({
    data: {
      identifier: `onboarding:${user.id}`,
      token,
      expires: new Date(Date.now() + 5 * 60 * 1000),
    },
  });

  const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
  redirect(`${protocol}://${user.tenant.subdomain}.${ROOT_DOMAIN}/login?callbackUrl=%2Fadmin&token=${token}`);
}
