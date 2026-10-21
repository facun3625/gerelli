import { prisma } from "@/lib/prisma";
import { decryptSecret, maskSecret } from "@/lib/secret-box";

// Lo que se guarda en PaymentMethodConfig.config para MERCADOPAGO. El access
// token y el secret del webhook van cifrados (ver lib/secret-box.ts); la
// public key no, porque es pública por definición (viaja al navegador).
export type MercadoPagoStoredConfig = {
  accessTokenEnc?: string;
  publicKey?: string;
  webhookSecretEnc?: string;
};

// Versión segura para mandar al cliente: nunca el token real, solo si está
// cargado y sus últimos 4 caracteres para que se reconozca cuál es.
export type MercadoPagoPublicConfig = {
  accessTokenMask: string | null;
  publicKey: string | null;
  webhookSecretMask: string | null;
};

export function toPublicConfig(stored: MercadoPagoStoredConfig | null): MercadoPagoPublicConfig {
  return {
    accessTokenMask: maskSecret(decryptSecret(stored?.accessTokenEnc)),
    publicKey: stored?.publicKey ?? null,
    webhookSecretMask: maskSecret(decryptSecret(stored?.webhookSecretEnc)),
  };
}

// Credenciales descifradas — SOLO para usar del lado del servidor (crear la
// preferencia, verificar la firma del webhook). Nunca devolver esto a un
// componente cliente.
export type MercadoPagoCredentials = {
  accessToken: string;
  webhookSecret: string | null;
};

export async function getTenantMercadoPagoCredentials(
  tenantId: string,
): Promise<MercadoPagoCredentials | null> {
  const row = await prisma.paymentMethodConfig.findUnique({
    where: { tenantId_type: { tenantId, type: "MERCADOPAGO" } },
  });
  if (!row?.enabled) return null;

  const stored = row.config as MercadoPagoStoredConfig | null;
  const accessToken = decryptSecret(stored?.accessTokenEnc);
  if (!accessToken) return null;

  return { accessToken, webhookSecret: decryptSecret(stored?.webhookSecretEnc) };
}
