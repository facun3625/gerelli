import { prisma } from "@/lib/prisma";
import type { EmailType } from "@/lib/mailer";

export const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  ORDER_CONFIRMATION: "Confirmación de pedido",
  SERVICE_INQUIRY: "Consulta de servicio",
  DEVELOPMENT_INQUIRY: "Consulta de emprendimiento",
  PASSWORD_RESET: "Recuperar contraseña",
  TEST_ORDER: "Prueba de plantilla",
  ADMIN_INVITE: "Invitación de administrador",
  PAYMENT_REMINDER: "Recordatorio de vencimiento",
};

export function getRecentEmailLogs(tenantId: string, limit = 40) {
  return prisma.emailLog.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: limit });
}
