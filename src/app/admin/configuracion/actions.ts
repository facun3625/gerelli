"use server";

import { ActionError, toUserError } from "@/lib/action-error";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTenantAdmin, getTenantAiAgentAccess } from "@/lib/require-admin";
import { saveUploadedFile } from "@/lib/storage";
import { saveTextSetting, saveImageSetting } from "@/lib/settings-storage";
import { getTelegramSettings } from "@/lib/settings";
import { sendTelegram } from "@/lib/telegram";
import { generateDomainToken, verificationRecordName, verifyDomainTxtRecord } from "@/lib/custom-domain";

// ---------- Editor de texto enriquecido (compartido) ----------

export async function uploadRichTextImage(formData: FormData) {
  try {
    return await runUploadRichTextImage(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runUploadRichTextImage(formData: FormData) {
  await requireTenantAdmin();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) throw new ActionError("Elegí una imagen");
  if (!file.type.startsWith("image/")) throw new ActionError("El archivo debe ser una imagen");
  return saveUploadedFile(file, "content");
}

export async function updatePopupConfig(formData: FormData) {
  try {
    return await runUpdatePopupConfig(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runUpdatePopupConfig(formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  const enabled = formData.get("enabled") === "true";
  const frequency = String(formData.get("frequency") ?? "ONCE");
  const html = String(formData.get("html") ?? "");

  await Promise.all([
    saveTextSetting(tenant.id, String(enabled), "popup_enabled"),
    saveTextSetting(tenant.id, frequency, "popup_frequency"),
    saveTextSetting(tenant.id, html, "popup_html"),
    saveTextSetting(tenant.id, String(Date.now()), "popup_version"),
  ]);
  revalidatePath("/");
  revalidatePath("/admin/configuracion");
  return { ok: true as const };
}

// ---------- Mensaje editable del mail de pedido ----------

export async function updateOrderEmailMessage(formData: FormData) {
  try {
    return await runUpdateOrderEmailMessage(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runUpdateOrderEmailMessage(formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  await saveTextSetting(tenant.id, String(formData.get("message") ?? ""), "order_email_message");
  revalidatePath("/admin/configuracion");
  return { ok: true as const };
}

// ---------- Telegram (aviso de pedido nuevo al grupo del equipo) ----------

const telegramSchema = z.object({
  botToken: z.string().optional(),
  chatId: z.string().min(1, "Ingresá el chat ID"),
});

export async function updateTelegramSettings(formData: FormData) {
  try {
    return await runUpdateTelegramSettings(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runUpdateTelegramSettings(formData: FormData) {
  const { tenant } = await requireTenantAdmin();

  const parsed = telegramSchema.parse({
    botToken: formData.get("botToken") || undefined,
    chatId: formData.get("chatId"),
  });

  // El token es secreto: si el campo vino vacío es porque ya estaba
  // cargado y no lo tocaron — no lo pisamos con "".
  const existingToken = (
    await prisma.settings.findUnique({ where: { tenantId_key: { tenantId: tenant.id, key: "telegram_bot_token" } } })
  )?.value;
  if (!parsed.botToken && !existingToken) {
    throw new ActionError("Ingresá el token del bot");
  }

  await Promise.all([
    saveTextSetting(tenant.id, parsed.chatId, "telegram_chat_id"),
    parsed.botToken ? saveTextSetting(tenant.id, parsed.botToken, "telegram_bot_token") : Promise.resolve(),
  ]);

  revalidatePath("/admin/configuracion");
  return { ok: true as const };
}

export async function removeTelegramSettings() {
  try {
    return await runRemoveTelegramSettings();
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runRemoveTelegramSettings() {
  const { tenant } = await requireTenantAdmin();
  await prisma.settings.deleteMany({ where: { tenantId: tenant.id, key: { in: ["telegram_bot_token", "telegram_chat_id"] } } });
  revalidatePath("/admin/configuracion");
  return { ok: true as const };
}

// ---------- Agente de ventas IA (solo tiendas con el plan habilitado) ----------

const aiAgentSchema = z.object({
  enabled: z.string().optional(),
  tone: z.string().max(500).optional(),
  rules: z.string().max(4000).optional(),
  greeting: z.string().max(500).optional(),
});

export async function updateAiAgentSettings(formData: FormData) {
  try {
    return await runUpdateAiAgentSettings(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runUpdateAiAgentSettings(formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  // Defensa aunque la pestaña ya esté gateada en la UI — un tenant sin el
  // plan no puede activar esto pisando el formulario a mano.
  const access = await getTenantAiAgentAccess(tenant.id);
  if (!access.allowed) throw new ActionError("Tu plan actual no incluye el agente de ventas IA");

  const parsed = aiAgentSchema.parse({
    enabled: formData.get("enabled") || undefined,
    tone: formData.get("tone") || undefined,
    rules: formData.get("rules") || undefined,
    greeting: formData.get("greeting") || undefined,
  });

  await Promise.all([
    saveTextSetting(tenant.id, parsed.enabled === "true" ? "true" : "false", "ai_agent_enabled"),
    saveTextSetting(tenant.id, parsed.tone ?? "", "ai_agent_tone"),
    saveTextSetting(tenant.id, parsed.rules ?? "", "ai_agent_rules"),
    saveTextSetting(tenant.id, parsed.greeting ?? "", "ai_agent_greeting"),
  ]);

  revalidatePath("/admin/configuracion");
  revalidatePath("/");
  return { ok: true as const };
}

export async function sendTestTelegram(draftToken: string, draftChatId: string) {
  try {
    return await runSendTestTelegram(draftToken, draftChatId);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runSendTestTelegram(draftToken: string, draftChatId: string) {
  const { tenant } = await requireTenantAdmin();
  const saved = await getTelegramSettings(tenant.id);
  const token = draftToken.trim() || saved.botToken || "";
  const chatId = draftChatId.trim() || saved.chatId || "";
  if (!token || !chatId) throw new ActionError("Faltan el token o el chat ID");

  const result = await sendTelegram(token, chatId, "✅ <b>Prueba</b>\nSi ves este mensaje, los avisos de pedidos están funcionando.");
  if (!result.ok) throw new ActionError(result.error ?? "No se pudo enviar");
  return { ok: true as const };
}

// ---------- Dominio propio (solo tiendas con el plan habilitado) ----------

const domainSchema = z
  .string()
  .min(3, "Ingresá un dominio válido")
  .regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/, "Formato de dominio inválido (ej: pedidos.mimarca.com)");

async function assertCustomDomainAllowed(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, include: { plan: true } });
  if (!tenant?.plan?.allowCustomDomain) {
    throw new ActionError("Tu plan actual no incluye dominio propio");
  }
}

export async function setCustomDomain(formData: FormData) {
  try {
    return await runSetCustomDomain(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runSetCustomDomain(formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  await assertCustomDomainAllowed(tenant.id);

  // safeParse en vez de parse: un ZodError crudo sin capturar llega al
  // cliente como el genérico "Minified React error #441" en producción,
  // en vez del mensaje de formato que sí tiene el schema.
  const parsed = domainSchema.safeParse(String(formData.get("domain") ?? "").trim().toLowerCase());
  if (!parsed.success) throw new ActionError(parsed.error.issues[0]?.message ?? "Dominio inválido");
  const domain = parsed.data;

  const existing = await prisma.tenant.findUnique({ where: { customDomain: domain } });
  if (existing && existing.id !== tenant.id) {
    throw new ActionError("Ese dominio ya está en uso por otra tienda");
  }

  const token = generateDomainToken();
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { customDomain: domain, customDomainToken: token, customDomainVerified: false },
  });
  revalidatePath("/admin/configuracion");
  return { ok: true as const };
}

export async function verifyCustomDomain() {
  try {
    return await runVerifyCustomDomain();
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runVerifyCustomDomain() {
  const { tenant: tenantSummary } = await requireTenantAdmin();
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantSummary.id } });
  if (!tenant?.customDomain || !tenant.customDomainToken) {
    throw new ActionError("Primero cargá un dominio");
  }

  const verified = await verifyDomainTxtRecord(tenant.customDomain, tenant.customDomainToken);
  if (!verified) {
    throw new ActionError(
      `No encontramos el registro TXT en ${verificationRecordName(tenant.customDomain)}. Puede tardar unos minutos en propagarse.`,
    );
  }

  await prisma.tenant.update({ where: { id: tenant.id }, data: { customDomainVerified: true } });
  revalidatePath("/admin/configuracion");
  return { ok: true as const };
}

export async function removeCustomDomain() {
  try {
    return await runRemoveCustomDomain();
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runRemoveCustomDomain() {
  const { tenant } = await requireTenantAdmin();
  await prisma.tenant.update({
    where: { id: tenant.id },
    data: { customDomain: null, customDomainToken: null, customDomainVerified: false },
  });
  revalidatePath("/admin/configuracion");
  return { ok: true as const };
}

// Pedido de "hacelo vos por mí" — el dueño no quiere lidiar con comprar el
// dominio y cargar los registros DNS. No compra nada solo: deja los datos
// de contacto y el super admin lo gestiona a mano desde /platform/dominios.
const domainRequestSchema = z.object({
  contactName: z.string().trim().min(1, "Ingresá tu nombre"),
  contactEmail: z.string().trim().email("Email inválido"),
  contactPhone: z.string().trim().optional(),
  domainOptions: z.array(z.string().trim().min(1)).min(1, "Ingresá al menos una opción de dominio").max(3),
  notes: z.string().trim().optional(),
});

export async function createDomainRequest(formData: FormData) {
  try {
    return await runCreateDomainRequest(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runCreateDomainRequest(formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  await assertCustomDomainAllowed(tenant.id);

  const parsed = domainRequestSchema.safeParse({
    contactName: formData.get("contactName"),
    contactEmail: formData.get("contactEmail"),
    contactPhone: formData.get("contactPhone") || undefined,
    domainOptions: JSON.parse(String(formData.get("domainOptions") ?? "[]")).filter(Boolean),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) throw new ActionError(parsed.error.issues[0]?.message ?? "Datos inválidos");

  await prisma.domainRequest.create({
    data: {
      tenantId: tenant.id,
      contactName: parsed.data.contactName,
      contactEmail: parsed.data.contactEmail,
      contactPhone: parsed.data.contactPhone || null,
      domainOptions: parsed.data.domainOptions,
      notes: parsed.data.notes || null,
    },
  });
  return { ok: true as const };
}

// ---------- SEO (solo tiendas con dominio propio verificado) ----------

const seoSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
});

// Mismo criterio que assertCustomDomainAllowed: no alcanza con que el plan
// lo permita, la tienda tiene que tener SU dominio ya verificado — el SEO
// personalizado apunta a esa dirección, no tiene sentido antes de eso.
async function assertSeoAllowed(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, include: { plan: true } });
  if (!tenant?.plan?.allowCustomDomain) {
    throw new ActionError("Tu plan actual no incluye dominio propio");
  }
  if (!tenant.customDomainVerified) {
    throw new ActionError("Primero verificá tu dominio propio");
  }
}

export async function updateSeoSettings(formData: FormData) {
  try {
    return await runUpdateSeoSettings(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runUpdateSeoSettings(formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  await assertSeoAllowed(tenant.id);

  const parsed = seoSchema.parse({
    title: formData.get("title") || undefined,
    description: formData.get("description") || undefined,
  });

  await Promise.all([
    saveTextSetting(tenant.id, parsed.title, "seo_title"),
    saveTextSetting(tenant.id, parsed.description, "seo_description"),
  ]);

  await saveImageSetting(tenant.id, formData.get("ogImage") as File | null, "seo_og_image_url");

  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function removeSeoImage() {
  try {
    return await runRemoveSeoImage();
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runRemoveSeoImage() {
  const { tenant } = await requireTenantAdmin();
  await prisma.settings.deleteMany({ where: { tenantId: tenant.id, key: "seo_og_image_url" } });
  revalidatePath("/", "layout");
  return { ok: true as const };
}
