import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";

// No reusa requireTenantAdmin: su rama AGENT exige una fila EstateAgent con
// una sección de AGENT_MENU_SECTIONS que matchee el pathname, y esas
// secciones son todas de Inmobiliaria — un PostSaleManager sin EstateAgent
// siempre daría "No autorizado" ahí. Posventa tiene su propio gate.
//
// assignedDevelopmentIds null = sin filtro (ADMIN, ve todo). Con array =
// alcance de un PostSaleManager — las queries deben filtrar
// developmentId: { in: assignedDevelopmentIds } cuando no es null.
export async function requirePostSaleStaff() {
  const tenant = await getCurrentTenant();
  if (!tenant) throw new Error("Tienda no encontrada");

  const session = await auth();
  if (!session?.user || session.user.tenantId !== tenant.id) {
    throw new Error("No autorizado");
  }

  const plan = await prisma.plan.findUnique({
    where: { id: tenant.planId ?? "" },
    select: { allowPostSale: true },
  });
  if (!plan?.allowPostSale) throw new Error("No autorizado");

  if (session.user.role === "ADMIN") {
    return { session, tenant, manager: null, assignedDevelopmentIds: null as string[] | null };
  }

  if (session.user.role !== "AGENT") throw new Error("No autorizado");

  const manager = await prisma.postSaleManager.findFirst({
    where: { tenantId: tenant.id, userId: session.user.id, accessEnabled: true },
    select: { id: true, assignments: { select: { developmentId: true } } },
  });
  if (!manager) throw new Error("No autorizado");

  return {
    session,
    tenant,
    manager: { id: manager.id },
    assignedDevelopmentIds: manager.assignments.map((a) => a.developmentId),
  };
}
