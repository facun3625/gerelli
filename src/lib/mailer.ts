import { Resend } from "resend";

import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/settings";

export type EmailType =
  | "PASSWORD_RESET"
  | "SERVICE_INQUIRY"
  | "DEVELOPMENT_INQUIRY"
  | "ADMIN_INVITE"
  | "PAYMENT_REMINDER";

let warned = false;

// Remitente único de la app — se configura con RESEND_API_KEY/RESEND_FROM_EMAIL
// en el .env del servidor.
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
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !fromEmail) {
    if (!warned) {
      console.warn("Resend no está configurado (RESEND_API_KEY/RESEND_FROM_EMAIL) — no se van a enviar mails.");
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
