import { prisma } from "@/lib/prisma";
import { decryptSecret, maskSecret } from "@/lib/secret-box";

export const PLATFORM_BILLING_SETTINGS_ID = "global";

export async function getPlatformMercadoPagoCredentials() {
  const stored = await prisma.platformBillingSettings.findUnique({ where: { id: PLATFORM_BILLING_SETTINGS_ID } });
  const accessToken = process.env.MERCADOPAGO_PLATFORM_ACCESS_TOKEN?.trim()
    || process.env.MERCADOPAGO_ACCESS_TOKEN?.trim()
    || decryptSecret(stored?.accessTokenEnc);
  const webhookSecret = process.env.MERCADOPAGO_PLATFORM_WEBHOOK_SECRET?.trim()
    || process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()
    || decryptSecret(stored?.webhookSecretEnc);
  return {
    accessToken,
    webhookSecret,
    environment: accessToken?.startsWith("TEST-") ? "test" as const : accessToken ? "production" as const : "missing" as const,
  };
}

export async function getPlatformCredentialSummary() {
  const credentials = await getPlatformMercadoPagoCredentials();
  return {
    accessTokenMask: maskSecret(credentials.accessToken),
    webhookSecretMask: maskSecret(credentials.webhookSecret),
    environment: credentials.environment,
  };
}

export async function getPlatformBillingSettings() {
  // Prisma rechaza `update: {}` (sin ningún campo) — para el caso normal,
  // fila ya existente, "actualizarla" a sí misma es un no-op válido.
  return prisma.platformBillingSettings.upsert({
    where: { id: PLATFORM_BILLING_SETTINGS_ID },
    create: { id: PLATFORM_BILLING_SETTINGS_ID },
    update: { id: PLATFORM_BILLING_SETTINGS_ID },
  });
}

export async function getPlatformMarketingSettings() {
  const settings = await getPlatformBillingSettings();
  return {
    whatsappEnabled: settings.marketingWhatsappEnabled,
    whatsappNumber: settings.marketingWhatsappNumber,
    whatsappMessage: settings.marketingWhatsappMessage,
    instagramEnabled: settings.marketingInstagramEnabled,
    instagramUsername: settings.marketingInstagramUsername,
  };
}

export async function getSetupServiceSettings() {
  const settings = await getPlatformBillingSettings();
  return {
    enabled: settings.setupServiceEnabled,
    price: Number(settings.setupServicePrice),
    steps: settings.setupServiceSteps,
  };
}

export async function getPlatformTelegramSettings() {
  const settings = await getPlatformBillingSettings();
  const botToken = decryptSecret(settings.platformTelegramBotTokenEnc);
  const chatId = settings.platformTelegramChatId;
  return {
    configured: Boolean(botToken && chatId),
    botToken,
    chatId,
  };
}

export async function getPlatformResendSettings() {
  const settings = await getPlatformBillingSettings();
  const apiKey = decryptSecret(settings.resendApiKeyEnc);
  const fromEmail = settings.resendFromEmail;
  return {
    configured: Boolean(apiKey && fromEmail),
    apiKey,
    fromEmail,
  };
}

export function getRootUrl() {
  const rootDomain = process.env.ROOT_DOMAIN ?? "localhost:3010";
  return `${rootDomain.startsWith("localhost") ? "http" : "https"}://${rootDomain}`;
}

export function getMercadoPagoBackUrl(preferredUrl: string) {
  const configured = process.env.MERCADOPAGO_TEST_BACK_URL?.trim();
  const parsed = new URL(preferredUrl);
  const local = parsed.hostname === "localhost" || parsed.hostname.endsWith(".localhost") || parsed.hostname === "127.0.0.1";
  if (!local) return preferredUrl;

  // Mercado Pago exige un back_url público y rechaza localhost. En pruebas
  // locales puede configurarse un túnel HTTPS; si no existe, vuelve al sitio
  // público de Urbi y el estado se sincroniza manualmente desde el panel local.
  return configured || "https://urbi.com.ar";
}

export function addBillingPeriod(start: Date, cycle: "MONTHLY" | "ANNUAL") {
  const end = new Date(start);
  const originalDay = end.getDate();
  end.setDate(1);
  end.setMonth(end.getMonth() + (cycle === "ANNUAL" ? 12 : 1));
  const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
  end.setDate(Math.min(originalDay, lastDay));
  return end;
}
