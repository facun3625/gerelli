"use server";

import { ActionError, toUserError } from "@/lib/action-error";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { testMercadoPagoConnection } from "@/lib/mercadopago";
import { getPlatformMercadoPagoCredentials, PLATFORM_BILLING_SETTINGS_ID } from "@/lib/platform-billing";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { encryptSecret } from "@/lib/secret-box";

const settingsSchema = z.object({
  enabled: z.boolean(),
  graceDays: z.coerce.number().int().min(0).max(60),
});

export async function saveBillingSettings(formData: FormData) {
  try {
    return await runSaveBillingSettings(formData);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar la facturación");
  }
}

async function runSaveBillingSettings(formData: FormData) {
  await requireSuperAdmin();
  const parsed = settingsSchema.parse({
    enabled: formData.get("enabled") === "true",
    graceDays: formData.get("graceDays"),
  });
  const credentials = await getPlatformMercadoPagoCredentials();
  if (parsed.enabled && !credentials.accessToken) {
    throw new ActionError("No podés habilitar cobros hasta configurar el Access Token en el servidor");
  }
  if (parsed.enabled && credentials.accessToken) {
    await testMercadoPagoConnection(credentials.accessToken);
  }
  await prisma.platformBillingSettings.upsert({
    where: { id: PLATFORM_BILLING_SETTINGS_ID },
    create: { id: PLATFORM_BILLING_SETTINGS_ID, ...parsed },
    update: parsed,
  });
  revalidatePath("/platform/facturacion");
  return { ok: true as const };
}

export async function testBillingConnection() {
  try {
    return await runTestBillingConnection();
  } catch (err) {
    return toUserError(err, "No se pudo actualizar la facturación");
  }
}

async function runTestBillingConnection() {
  await requireSuperAdmin();
  const credentials = await getPlatformMercadoPagoCredentials();
  if (!credentials.accessToken) throw new ActionError("Falta el Access Token de Mercado Pago");
  return testMercadoPagoConnection(credentials.accessToken);
}

export async function saveBillingCredentials(formData: FormData) {
  try {
    return await runSaveBillingCredentials(formData);
  } catch (err) {
    return toUserError(err, "No se pudo actualizar la facturación");
  }
}

async function runSaveBillingCredentials(formData: FormData) {
  await requireSuperAdmin();
  const accessToken = String(formData.get("accessToken") ?? "").trim();
  const webhookSecret = String(formData.get("webhookSecret") ?? "").trim();
  if (!accessToken && !webhookSecret) throw new ActionError("Ingresá al menos una credencial para actualizar");
  if (accessToken && !/^(TEST-|APP_USR-)/.test(accessToken)) {
    throw new ActionError("El Access Token no tiene el formato esperado de Mercado Pago");
  }
  // Validamos antes de cifrar y guardar para que una Public Key o un token
  // revocado no deje a la plataforma aparentemente lista para cobrar.
  if (accessToken) await testMercadoPagoConnection(accessToken);
  const accessTokenEnc = accessToken ? encryptSecret(accessToken) : null;
  const webhookSecretEnc = webhookSecret ? encryptSecret(webhookSecret) : null;
  try {
    await prisma.platformBillingSettings.upsert({
      where: { id: PLATFORM_BILLING_SETTINGS_ID },
      create: {
        id: PLATFORM_BILLING_SETTINGS_ID,
        accessTokenEnc,
        webhookSecretEnc,
      },
      update: {
        ...(accessTokenEnc ? { accessTokenEnc } : {}),
        ...(webhookSecretEnc ? { webhookSecretEnc } : {}),
      },
    });
  } catch {
    // Nunca propagamos el error de Prisma: en desarrollo incluye el objeto
    // completo de la operación y podría mostrar material cifrado en pantalla.
    throw new ActionError("No se pudieron guardar las credenciales. Recargá la página e intentá nuevamente");
  }
  revalidatePath("/platform/facturacion");
  return { ok: true as const };
}
