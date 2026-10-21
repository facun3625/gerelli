import { auth } from "@/auth";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { agentSectionForPath, parseAgentPermissions } from "@/lib/agent-permissions";

export async function requireTenantAdmin() {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error("Tienda no encontrada");

  const session = await auth();
  if (session?.user.role === "ADMIN" && session.user.tenantId === tenant.id) {
    return { session, tenant };
  }
  if (session?.user.role !== "AGENT" || session.user.tenantId !== tenant.id) {
    throw new Error("No autorizado");
  }
  const pathname = (await headers()).get("x-pathname") ?? "";

  // Un administrador de Posventa (PostSaleManager) es un rol separado del
  // agente inmobiliario — puede no tener ficha de EstateAgent. Para rutas
  // de ese módulo alcanza con tener acceso habilitado ahí; no pasa por
  // AGENT_MENU_SECTIONS, que es específico de Inmobiliaria. El chequeo más
  // fino (qué desarrollos puede ver) lo hace requirePostSaleStaff() en las
  // páginas de Posventa — esto solo destraba el layout general de /admin.
  if (pathname.startsWith("/admin/postventa")) {
    const manager = await prisma.postSaleManager.findFirst({
      where: { tenantId: tenant.id, userId: session.user.id, accessEnabled: true },
      select: { id: true },
    });
    if (!manager) throw new Error("No autorizado");
    return { session, tenant };
  }

  const section = agentSectionForPath(pathname);
  const agent = await prisma.estateAgent.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id, accessEnabled: true },
    select: { permissions: true },
  });
  const permissions = parseAgentPermissions(agent?.permissions);
  if (!section || permissions[section] === "NONE") throw new Error("No autorizado");
  return { session, tenant, permissions };
}

export type PlanFeatures = {
  allowRealEstate: boolean;
  allowConsortium: boolean;
  allowPostSale: boolean;
  allowServices: boolean;
  allowStats: boolean;
  allowCustomDomain: boolean;
  allowAiAgent: boolean;
};

export async function requireTenantAdminWithPlan() {
  const access = await requireTenantAdmin();
  const { session, tenant } = access;
  const plan = await prisma.plan.findUnique({
    where: { id: tenant.planId ?? "" },
    select: {
      allowRealEstate: true,
      allowConsortium: true,
      allowPostSale: true,
      allowServices: true,
      allowStats: true,
      allowCustomDomain: true,
      allowAiAgent: true,
    },
  });
  const features: PlanFeatures = {
    // Los tenants sin plan son cuentas heredadas: conservan Inmobiliaria.
    allowRealEstate: plan?.allowRealEstate ?? true,
    allowConsortium: plan?.allowConsortium ?? false,
    allowPostSale: plan?.allowPostSale ?? false,
    allowServices: plan?.allowServices ?? false,
    allowStats: plan?.allowStats ?? false,
    allowCustomDomain: plan?.allowCustomDomain ?? false,
    allowAiAgent: plan?.allowAiAgent ?? false,
  };
  return {
    session,
    tenant,
    features,
    permissions: "permissions" in access ? access.permissions : undefined,
  };
}

// A diferencia de requireTenantAdminWithPlan, no pide sesión de admin — la
// usan tanto el layout público (para decidir si monta el widget) como la
// ruta /api/estate-ai (para el gate + el tope mensual), donde quien pega es
// un visitante anónimo del sitio del tenant.
export async function getTenantAiAgentAccess(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan: { select: { allowAiAgent: true, maxAiMessagesPerMonth: true } } },
  });
  return {
    allowed: tenant?.plan?.allowAiAgent ?? false,
    maxMessagesPerMonth: tenant?.plan?.maxAiMessagesPerMonth ?? null,
  };
}

// Para código que corre en el dominio raíz (urbi.com.ar), no en el
// subdominio de la tienda — ahí `getCurrentTenant()` no sirve porque
// depende del header de subdominio que pone proxy.ts. Se resuelve por
// session.user.tenantId (viaja en el JWT) en su lugar.
export async function requireOwnTenantAdmin() {
  const session = await auth();
  if (session?.user.role !== "ADMIN" || !session.user.tenantId) {
    throw new Error("No autorizado");
  }
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: session.user.tenantId } });
  return { session, tenant };
}
