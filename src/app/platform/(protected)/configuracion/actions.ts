"use server";

import { ActionError, toUserError } from "@/lib/action-error";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { Resend } from "resend";

import { PLATFORM_BILLING_SETTINGS_ID, getPlatformTelegramSettings, getPlatformResendSettings } from "@/lib/platform-billing";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { encryptSecret } from "@/lib/secret-box";
import {
  sendTelegram,
  buildNewTenantMessage,
  SAMPLE_NEW_TENANT_NOTIFICATION,
  buildNewResellerMessage,
  SAMPLE_NEW_RESELLER_NOTIFICATION,
  buildBotLeadMessage,
  SAMPLE_BOT_LEAD_NOTIFICATION,
} from "@/lib/telegram";

const whatsappSchema = z.object({
  enabled: z.boolean(),
  number: z.string().trim().transform((value) => value.replace(/\D/g, "")).pipe(
    z.string().min(8, "Ingresá un número completo, incluyendo código de país").max(15, "El número es demasiado largo"),
  ),
  message: z.string().trim().max(500, "El mensaje no puede superar los 500 caracteres"),
});

export async function saveMarketingWhatsapp(formData: FormData) {
  try {
    return await runSaveMarketingWhatsapp(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runSaveMarketingWhatsapp(formData: FormData) {
  await requireSuperAdmin();
  const parsed = whatsappSchema.parse({
    enabled: formData.get("enabled") === "true",
    number: formData.get("number"),
    message: formData.get("message"),
  });

  await prisma.platformBillingSettings.upsert({
    where: { id: PLATFORM_BILLING_SETTINGS_ID },
    create: {
      id: PLATFORM_BILLING_SETTINGS_ID,
      marketingWhatsappEnabled: parsed.enabled,
      marketingWhatsappNumber: parsed.number,
      marketingWhatsappMessage: parsed.message || null,
    },
    update: {
      marketingWhatsappEnabled: parsed.enabled,
      marketingWhatsappNumber: parsed.number,
      marketingWhatsappMessage: parsed.message || null,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/platform/configuracion");
  return { ok: true as const };
}

const instagramSchema = z.object({
  enabled: z.boolean(),
  username: z.string().trim().min(1, "Ingresá tu usuario de Instagram").max(60),
});

export async function saveMarketingInstagram(formData: FormData) {
  try {
    return await runSaveMarketingInstagram(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runSaveMarketingInstagram(formData: FormData) {
  await requireSuperAdmin();
  const parsed = instagramSchema.parse({
    enabled: formData.get("enabled") === "true",
    username: formData.get("username"),
  });

  await prisma.platformBillingSettings.upsert({
    where: { id: PLATFORM_BILLING_SETTINGS_ID },
    create: {
      id: PLATFORM_BILLING_SETTINGS_ID,
      marketingInstagramEnabled: parsed.enabled,
      marketingInstagramUsername: parsed.username.replace(/^@/, ""),
    },
    update: {
      marketingInstagramEnabled: parsed.enabled,
      marketingInstagramUsername: parsed.username.replace(/^@/, ""),
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/platform/configuracion");
  return { ok: true as const };
}

// ---------- Telegram (aviso al equipo de Urbi por tienda nueva) ----------

const platformTelegramSchema = z.object({
  botToken: z.string().optional(),
  chatId: z.string().min(1, "Ingresá el chat ID"),
});

export async function savePlatformTelegramSettings(formData: FormData) {
  try {
    return await runSavePlatformTelegramSettings(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runSavePlatformTelegramSettings(formData: FormData) {
  await requireSuperAdmin();
  const parsed = platformTelegramSchema.parse({
    botToken: formData.get("botToken") || undefined,
    chatId: formData.get("chatId"),
  });

  // El token es secreto: si el campo vino vacío es porque ya estaba
  // cargado y no lo tocaron — no lo pisamos.
  const existing = await prisma.platformBillingSettings.findUnique({ where: { id: PLATFORM_BILLING_SETTINGS_ID } });
  if (!parsed.botToken && !existing?.platformTelegramBotTokenEnc) {
    throw new ActionError("Ingresá el token del bot");
  }

  await prisma.platformBillingSettings.upsert({
    where: { id: PLATFORM_BILLING_SETTINGS_ID },
    create: {
      id: PLATFORM_BILLING_SETTINGS_ID,
      platformTelegramChatId: parsed.chatId,
      platformTelegramBotTokenEnc: parsed.botToken ? encryptSecret(parsed.botToken) : undefined,
    },
    update: {
      platformTelegramChatId: parsed.chatId,
      ...(parsed.botToken ? { platformTelegramBotTokenEnc: encryptSecret(parsed.botToken) } : {}),
    },
  });

  revalidatePath("/platform/configuracion");
  return { ok: true as const };
}

export async function removePlatformTelegramSettings() {
  try {
    return await runRemovePlatformTelegramSettings();
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runRemovePlatformTelegramSettings() {
  await requireSuperAdmin();
  await prisma.platformBillingSettings.updateMany({
    where: { id: PLATFORM_BILLING_SETTINGS_ID },
    data: { platformTelegramBotTokenEnc: null, platformTelegramChatId: null },
  });
  revalidatePath("/platform/configuracion");
  return { ok: true as const };
}

export type PlatformTelegramTestKind = "tienda" | "revendedor" | "bot";

const SAMPLE_MESSAGE_BY_KIND: Record<PlatformTelegramTestKind, string> = {
  tienda: buildNewTenantMessage(SAMPLE_NEW_TENANT_NOTIFICATION),
  revendedor: buildNewResellerMessage(SAMPLE_NEW_RESELLER_NOTIFICATION),
  bot: buildBotLeadMessage(SAMPLE_BOT_LEAD_NOTIFICATION),
};

// Manda el mismo formato exacto que va a recibir con un evento real (con
// datos de ejemplo) — así se puede validar cómo se va a ver cada tipo de
// aviso, no solo que el token/chat funcionan.
export async function sendTestPlatformTelegram(draftToken: string, draftChatId: string, kind: PlatformTelegramTestKind) {
  try {
    return await runSendTestPlatformTelegram(draftToken, draftChatId, kind);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runSendTestPlatformTelegram(draftToken: string, draftChatId: string, kind: PlatformTelegramTestKind) {
  await requireSuperAdmin();
  const saved = await getPlatformTelegramSettings();
  const token = draftToken.trim() || saved.botToken || "";
  const chatId = draftChatId.trim() || saved.chatId || "";
  if (!token || !chatId) throw new ActionError("Faltan el token o el chat ID");

  const message = `✅ <b>Prueba</b> — así se va a ver el aviso real:\n\n${SAMPLE_MESSAGE_BY_KIND[kind]}`;
  const result = await sendTelegram(token, chatId, message);
  if (!result.ok) throw new ActionError(result.error ?? "No se pudo enviar");
  return { ok: true as const };
}

// ---------- Resend (envío de mail para todas las tiendas) ----------

const platformResendSchema = z.object({
  apiKey: z.string().optional(),
  fromEmail: z.string().trim().email("Ingresá un email válido"),
});

export async function savePlatformResendSettings(formData: FormData) {
  try {
    return await runSavePlatformResendSettings(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runSavePlatformResendSettings(formData: FormData) {
  await requireSuperAdmin();
  const parsed = platformResendSchema.parse({
    apiKey: formData.get("apiKey") || undefined,
    fromEmail: formData.get("fromEmail"),
  });

  // La API key es secreta: si el campo vino vacío es porque ya estaba
  // cargada y no la tocaron — no la pisamos.
  const existing = await prisma.platformBillingSettings.findUnique({ where: { id: PLATFORM_BILLING_SETTINGS_ID } });
  if (!parsed.apiKey && !existing?.resendApiKeyEnc) {
    throw new ActionError("Ingresá la API key de Resend");
  }

  await prisma.platformBillingSettings.upsert({
    where: { id: PLATFORM_BILLING_SETTINGS_ID },
    create: {
      id: PLATFORM_BILLING_SETTINGS_ID,
      resendFromEmail: parsed.fromEmail,
      resendApiKeyEnc: parsed.apiKey ? encryptSecret(parsed.apiKey) : undefined,
    },
    update: {
      resendFromEmail: parsed.fromEmail,
      ...(parsed.apiKey ? { resendApiKeyEnc: encryptSecret(parsed.apiKey) } : {}),
    },
  });

  revalidatePath("/platform/configuracion");
  return { ok: true as const };
}

export async function removePlatformResendSettings() {
  try {
    return await runRemovePlatformResendSettings();
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runRemovePlatformResendSettings() {
  await requireSuperAdmin();
  await prisma.platformBillingSettings.updateMany({
    where: { id: PLATFORM_BILLING_SETTINGS_ID },
    data: { resendApiKeyEnc: null, resendFromEmail: null },
  });
  revalidatePath("/platform/configuracion");
  return { ok: true as const };
}

// A diferencia del mail real de una tienda (sendMail en lib/mailer.ts), acá
// no hay tenant — el "De:" queda genérico y no se registra en EmailLog
// (esa tabla es por tienda). Solo valida que la key y el dominio andan.
export async function sendTestPlatformResendEmail(draftApiKey: string, draftFromEmail: string) {
  try {
    return await runSendTestPlatformResendEmail(draftApiKey, draftFromEmail);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runSendTestPlatformResendEmail(draftApiKey: string, draftFromEmail: string) {
  const session = await requireSuperAdmin();
  const to = session.user.email;
  if (!to) throw new ActionError("Tu usuario no tiene email");

  const saved = await getPlatformResendSettings();
  const apiKey = draftApiKey.trim() || saved.apiKey || "";
  const fromEmail = draftFromEmail.trim() || saved.fromEmail || "";
  if (!apiKey || !fromEmail) throw new ActionError("Faltan la API key o el email de origen");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: `Plataforma <${fromEmail}>`,
    to,
    subject: "Mail de prueba",
    html: "<p>Si estás leyendo esto, Resend está bien configurado.</p>",
  });
  if (error) throw new ActionError(error.message);
  return { ok: true as const };
}

const setupServiceSchema = z.object({
  enabled: z.boolean(),
  price: z.coerce.number().min(0, "El precio no puede ser negativo"),
  steps: z
    .array(z.string().trim().min(1))
    .max(8, "No más de 8 pasos"),
});

export async function saveSetupServiceSettings(formData: FormData) {
  try {
    return await runSaveSetupServiceSettings(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar la configuración");
  }
}

async function runSaveSetupServiceSettings(formData: FormData) {
  await requireSuperAdmin();
  let steps: unknown;
  try {
    steps = JSON.parse(String(formData.get("steps") ?? "[]"));
  } catch {
    throw new ActionError("Pasos inválidos");
  }

  const parsed = setupServiceSchema.parse({
    enabled: formData.get("enabled") === "true",
    price: formData.get("price"),
    steps,
  });

  await prisma.platformBillingSettings.upsert({
    where: { id: PLATFORM_BILLING_SETTINGS_ID },
    create: {
      id: PLATFORM_BILLING_SETTINGS_ID,
      setupServiceEnabled: parsed.enabled,
      setupServicePrice: parsed.price,
      setupServiceSteps: parsed.steps,
    },
    update: {
      setupServiceEnabled: parsed.enabled,
      setupServicePrice: parsed.price,
      setupServiceSteps: parsed.steps,
    },
  });

  revalidatePath("/", "layout");
  revalidatePath("/platform/configuracion");
  return { ok: true as const };
}
