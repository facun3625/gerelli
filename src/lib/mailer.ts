import { Resend } from "resend";

import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/settings";

export type EmailType =
  | "PASSWORD_RESET"
  | "SERVICE_INQUIRY"
  | "DEVELOPMENT_INQUIRY"
  | "ADMIN_INVITE"
  | "PAYMENT_REMINDER"
  | "PROPERTY_SHARE"
  | "MARKETING_TEST";

let warned = false;

export function isMailerConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

async function fromAddress(tenantId: string) {
  const { storeName } = await getStoreSettings(tenantId);
  // Comillas: un nombre con coma o punto rompería el encabezado From.
  return `"${storeName.replace(/"/g, "")}" <${process.env.RESEND_FROM_EMAIL}>`;
}

// Remitente único de la app — se configura con RESEND_API_KEY/RESEND_FROM_EMAIL
// en el .env del servidor.
export async function sendMail({
  tenantId,
  to,
  subject,
  html,
  type,
  replyTo,
  headers,
}: {
  tenantId: string;
  to: string;
  subject: string;
  html: string;
  type: EmailType;
  replyTo?: string | null;
  headers?: Record<string, string>;
}) {
  if (!isMailerConfigured()) {
    if (!warned) {
      console.warn("Resend no está configurado (RESEND_API_KEY/RESEND_FROM_EMAIL) — no se van a enviar mails.");
      warned = true;
    }
    return;
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  try {
    const { error } = await resend.emails.send({
      from: await fromAddress(tenantId),
      to,
      subject,
      html,
      ...(replyTo ? { replyTo } : {}),
      ...(headers ? { headers } : {}),
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

export type BatchMail = { to: string; subject: string; html: string; headers?: Record<string, string> };

// Hasta 100 mails por llamada (límite de Resend). Devuelve el resultado
// del lote entero: Resend acepta o rechaza el lote completo.
export async function sendMailBatch(tenantId: string, mails: BatchMail[], replyTo?: string | null) {
  if (!isMailerConfigured()) throw new Error("El envío de mails no está configurado en el servidor");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = await fromAddress(tenantId);
  const { error } = await resend.batch.send(
    mails.map((m) => ({
      from,
      to: m.to,
      subject: m.subject,
      html: m.html,
      ...(replyTo ? { replyTo } : {}),
      ...(m.headers ? { headers: m.headers } : {}),
    })),
  );
  if (error) throw new Error(error.message);
}
