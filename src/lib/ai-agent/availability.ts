import { getTenantAiAgentAccess } from "@/lib/require-admin";
import { getAiAgentSettings } from "@/lib/settings";

// Hace falta el plan Y que el propio tenant lo haya activado — se usa tanto
// en el layout público (para decidir si monta el widget, sin flash) como
// podría reusarse en cualquier otro lugar que necesite la misma pregunta.
export async function isAiAgentAvailable(tenantId: string): Promise<boolean> {
  const [access, settings] = await Promise.all([
    getTenantAiAgentAccess(tenantId),
    getAiAgentSettings(tenantId),
  ]);
  return access.allowed && settings.enabled;
}
