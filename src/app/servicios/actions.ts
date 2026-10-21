"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { getStoreSettings, getTelegramSettings } from "@/lib/settings";
import { sendMail } from "@/lib/mailer";
import { sendTelegram } from "@/lib/telegram";

export type InquiryState = { ok: boolean; message: string };
const escape = (value: string) => value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
export async function sendServiceInquiry(serviceId: string, _previous: InquiryState, formData: FormData): Promise<InquiryState> {
  const tenant = await getCurrentTenant();
  if (!tenant) return { ok: false, message: "Tienda no encontrada." };
  const service = await prisma.service.findFirst({ where: { id: serviceId, tenantId: tenant.id, active: true }, include: { fields: { orderBy: { order: "asc" } } } });
  if (!service) return { ok: false, message: "El servicio ya no está disponible." };
  const values: { label: string; value: string }[] = [];
  for (const field of service.fields) {
    const value = String(formData.get(field.id) ?? "").trim();
    if (field.required && !value) return { ok: false, message: `Completá “${field.label}”.` };
    if (field.type === "EMAIL" && value && !z.email().safeParse(value).success) return { ok: false, message: "Ingresá un email válido." };
    if (field.type === "SELECT" && value && !field.options.includes(value)) return { ok: false, message: "Una opción elegida no es válida." };
    values.push({ label: field.label, value: value || "—" });
  }
  // La base es la fuente principal: la consulta queda guardada antes de
  // intentar cualquier aviso externo.
  const inquiry = await prisma.serviceInquiry.create({
    data: {
      tenantId: tenant.id,
      serviceId: service.id,
      serviceTitle: service.title,
      answers: values,
      events: { create: { status: "NEW" } },
    },
  });
  const [store, telegram] = await Promise.all([getStoreSettings(tenant.id), getTelegramSettings(tenant.id)]);
  const text = [`🔔 <b>Nueva consulta de servicio</b>`, `<b>${escape(service.title)}</b>`, "", ...values.map(v => `<b>${escape(v.label)}:</b> ${escape(v.value)}`)].join("\n");
  let telegramSent = false;
  let emailSent = false;
  const errors: string[] = [];
  await Promise.all([
    telegram.configured ? sendTelegram(telegram.botToken!, telegram.chatId!, text).then(result => { telegramSent = result.ok; if (!result.ok) errors.push(`Telegram: ${result.error ?? "falló"}`); }) : Promise.resolve(),
    store.email ? sendMail({ tenantId: tenant.id, to: store.email, subject: `Consulta por ${service.title} — ${store.storeName}`, html: `<h2>Nueva consulta por ${escape(service.title)}</h2>${values.map(v => `<p><strong>${escape(v.label)}:</strong> ${escape(v.value)}</p>`).join("")}`, type: "SERVICE_INQUIRY" }).then(() => { emailSent = true; }).catch(error => { errors.push(`Mail: ${error instanceof Error ? error.message : "falló"}`); }) : Promise.resolve(),
  ]);
  await prisma.serviceInquiry.update({ where: { id: inquiry.id }, data: { telegramSent, emailSent, notificationError: errors.join(" · ") || null } });
  return { ok: true, message: "¡Consulta enviada! Te vamos a contactar pronto." };
}
