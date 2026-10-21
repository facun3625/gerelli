import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";

// Mismo criterio que getPortalContact() (el portal del inquilino de
// Inmobiliaria): no tira error si falta sesión o vínculo — cada página
// decide qué mostrar (login, pantalla de completar DNI, o el portal).
// Se resuelve siempre contra la base, nunca contra el JWT (session), porque
// el token puede quedar viejo si el vínculo se creó hace un rato.
export async function getPostSaleContact() {
  const tenant = await getCurrentTenant();
  if (!tenant) return { tenant: null, session: null, contact: null };

  const session = await auth();
  if (!session?.user || session.user.tenantId !== tenant.id) {
    return { tenant, session: null, contact: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { postSaleContactId: true },
  });
  if (!user?.postSaleContactId) return { tenant, session, contact: null };

  const contact = await prisma.postSaleContact.findFirst({
    where: { id: user.postSaleContactId, tenantId: tenant.id },
  });
  return { tenant, session, contact };
}
