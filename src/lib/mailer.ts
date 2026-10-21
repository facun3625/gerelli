import { Resend } from "resend";

import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/settings";
import { getPlatformResendSettings } from "@/lib/platform-billing";

export type EmailType =
  | "ORDER_CONFIRMATION"
  | "PASSWORD_RESET"
  | "TEST_ORDER"
  | "SERVICE_INQUIRY"
  | "DEVELOPMENT_INQUIRY"
  | "ADMIN_INVITE"
  | "PAYMENT_REMINDER";

let warned = false;

// Un solo remitente para toda la plataforma (a diferencia del SMTP por
// tienda de antes) — se configura una vez desde /platform/configuracion
// (ver getPlatformResendSettings), no por tienda. Cada tienda no verifica su
// propio dominio, solo cambia el nombre que se ve en el "De:" más abajo.
export async function sendMail({
  tenantId,
  to,
  subject,
  html,
  type,
}: {
  tenantId: string;
  to: string;
  subject: string;
  html: string;
  type: EmailType;
}) {
  const { configured, apiKey, fromEmail } = await getPlatformResendSettings();
  if (!configured || !apiKey || !fromEmail) {
    if (!warned) {
      console.warn("Resend no está configurado (Platform → Configuración) — no se van a enviar mails.");
      warned = true;
    }
    return;
  }

  const resend = new Resend(apiKey);
  const { storeName } = await getStoreSettings(tenantId);

  try {
    const { error } = await resend.emails.send({
      from: `${storeName} <${fromEmail}>`,
      to,
      subject,
      html,
    });
    if (error) throw new Error(error.message);
    await prisma.emailLog.create({ data: { tenantId, to, subject, type, success: true } }).catch(() => {});
  } catch (err) {
    await prisma.emailLog
      .create({
        data: { tenantId, to, subject, type, success: false, error: err instanceof Error ? err.message : String(err) },
      })
      .catch(() => {});
    throw err;
  }
}
