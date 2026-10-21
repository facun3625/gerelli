import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";

// Espejo de requireAgent (src/lib/require-agent.ts) — mismo Role (AGENT),
// otra ficha (PostSaleProvider en vez de EstateAgent). Sin permisos por
// sección: un proveedor solo ve los reclamos que ya tiene derivados, no hay
// nada más que restringir.
export async function requireProvider() {
  const [session, tenant] = await Promise.all([auth(), getCurrentTenant()]);
  if (!session?.user) redirect("/login?callbackUrl=/proveedor");
  if (!tenant || session.user.tenantId !== tenant.id || session.user.role !== "AGENT") redirect("/");
  const provider = await prisma.postSaleProvider.findFirst({
    where: {
      tenantId: tenant.id,
      userId: session.user.id,
      accessEnabled: true,
      user: { role: "AGENT", tenantId: tenant.id },
    },
  });
  if (!provider) redirect("/login?callbackUrl=/proveedor&providerDisabled=1");
  return { provider, tenant, session };
}
