import { createHmac, timingSafeEqual } from "node:crypto";

// Cliente contra la API REST de MercadoPago. Sin SDK a propósito: son tres
// llamadas HTTP y así no quedamos atados a las versiones de un paquete
// externo en algo que mueve plata.
const MP_API = "https://api.mercadopago.com";

// La app apunta a Argentina (es-AR en todos los formatos, MP Argentina).
export const MP_CURRENCY = "ARS";

export type MpPreferenceItem = {
  title: string;
  quantity: number;
  unitPrice: number;
};

export type MpPreference = {
  id: string;
  initPoint: string;
};

async function mpFetch(accessToken: string, path: string, init?: RequestInit) {
  const res = await fetch(`${MP_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    // El cuerpo del error de MP suele explicar bien qué falta (credencial
    // inválida, monto en 0, back_urls mal formadas...) — lo propagamos en vez
    // de tragarlo, si no debuggear esto es a ciegas.
    const body = await res.text().catch(() => "");
    throw new Error(`MercadoPago respondió ${res.status}: ${body.slice(0, 500)}`);
  }
  return res.json();
}

export type MpSubscription = {
  id: string;
  status: string;
  externalReference: string | null;
  initPoint: string | null;
  payerId: string | null;
  nextPaymentDate: Date | null;
  amount: number;
  frequency: number;
  frequencyType: string;
};

type MpSubscriptionResponse = {
  id: string | number;
  status: string;
  external_reference?: string | number | null;
  init_point?: string | null;
  payer_id?: string | number | null;
  next_payment_date?: string | null;
  auto_recurring?: {
    transaction_amount?: number;
    frequency?: number;
    frequency_type?: string;
  };
};

function mapSubscription(data: MpSubscriptionResponse): MpSubscription {
  return {
    id: String(data.id),
    status: String(data.status),
    externalReference: data.external_reference ? String(data.external_reference) : null,
    initPoint: data.init_point ? String(data.init_point) : null,
    payerId: data.payer_id ? String(data.payer_id) : null,
    nextPaymentDate: data.next_payment_date ? new Date(String(data.next_payment_date)) : null,
    amount: Number(data.auto_recurring?.transaction_amount ?? 0),
    frequency: Number(data.auto_recurring?.frequency ?? 1),
    frequencyType: String(data.auto_recurring?.frequency_type ?? "months"),
  };
}

export async function createSubscription(
  accessToken: string,
  input: {
    reason: string;
    externalReference: string;
    payerEmail: string;
    amount: number;
    frequency: number;
    trialDays: number;
    backUrl: string;
  },
): Promise<MpSubscription> {
  const data = await mpFetch(accessToken, "/preapproval", {
    method: "POST",
    headers: { "X-Idempotency-Key": input.externalReference },
    body: JSON.stringify({
      reason: input.reason,
      external_reference: input.externalReference,
      payer_email: input.payerEmail,
      auto_recurring: {
        frequency: input.frequency,
        frequency_type: "months",
        transaction_amount: input.amount,
        currency_id: MP_CURRENCY,
        ...(input.trialDays > 0
          ? { free_trial: { frequency: input.trialDays, frequency_type: "days" } }
          : {}),
      },
      back_url: input.backUrl,
      status: "pending",
    }),
  });
  return mapSubscription(data);
}

export async function getSubscription(accessToken: string, id: string): Promise<MpSubscription> {
  return mapSubscription(await mpFetch(accessToken, `/preapproval/${encodeURIComponent(id)}`));
}

export async function updateSubscriptionStatus(
  accessToken: string,
  id: string,
  status: "paused" | "authorized" | "canceled",
): Promise<MpSubscription> {
  return mapSubscription(await mpFetch(accessToken, `/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  }));
}

export async function updateSubscriptionBilling(
  accessToken: string,
  id: string,
  input: { reason: string; amount: number },
): Promise<MpSubscription> {
  return mapSubscription(await mpFetch(accessToken, `/preapproval/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({
      reason: input.reason,
      auto_recurring: {
        transaction_amount: input.amount,
        currency_id: MP_CURRENCY,
      },
    }),
  }));
}

export type MpAuthorizedPayment = {
  id: string;
  subscriptionId: string | null;
  status: string;
  amount: number;
  paidAt: Date;
};

export async function getAuthorizedPayment(accessToken: string, id: string): Promise<MpAuthorizedPayment> {
  const data = await mpFetch(accessToken, `/authorized_payments/${encodeURIComponent(id)}`);
  return {
    id: String(data.id),
    subscriptionId: data.preapproval_id ? String(data.preapproval_id) : null,
    // El status superior describe la factura (scheduled/processed/recycling);
    // el resultado monetario real vive en payment.status.
    status: String(data.payment?.status ?? data.summarized ?? data.status),
    amount: Number(data.transaction_amount ?? 0),
    paidAt: new Date(String(data.debit_date ?? data.date_created ?? Date.now())),
  };
}

export async function testMercadoPagoConnection(accessToken: string): Promise<{ id: string; nickname: string | null }> {
  // Probamos el recurso que Urbi realmente necesita. Algunas credenciales
  // TEST válidas para suscripciones reciben un 403 de PolicyAgent al llamar
  // /users/me, por lo que esa consulta daba falsos negativos.
  try {
    await mpFetch(accessToken, "/preapproval/search?limit=1&offset=0");
  } catch (error) {
    const detail = error instanceof Error ? error.message : "";
    const response = detail.match(/^MercadoPago respondió (\d+):\s*([\s\S]*)$/);
    const status = response?.[1] ?? null;
    let providerCode: string | null = null;
    let providerMessage: string | null = null;
    if (response?.[2]) {
      try {
        const body = JSON.parse(response[2]) as { code?: unknown; message?: unknown };
        providerCode = typeof body.code === "string" ? body.code : null;
        providerMessage = typeof body.message === "string" ? body.message : null;
      } catch {
        // Si Mercado Pago devuelve HTML u otro formato, mostramos solamente
        // el status HTTP; nunca el cuerpo crudo ni datos de la operación.
      }
    }
    if (detail.includes("403") || detail.includes("PA_UNAUTHORIZED")) {
      throw new Error(
        "Mercado Pago rechazó esta credencial para suscripciones. Verificá que sea el Access Token de la aplicación de Urbi y no el Public Key ni una credencial de otra cuenta",
      );
    }
    if (status) {
      throw new Error(
        `Mercado Pago respondió ${status}${providerCode ? ` · ${providerCode}` : ""}${providerMessage ? `: ${providerMessage}` : ""}`,
      );
    }
    throw new Error("No pudimos comunicarnos con Mercado Pago. Revisá la conexión e intentá nuevamente");
  }
  return {
    id: "subscriptions",
    nickname: accessToken.startsWith("TEST-") ? "Credencial TEST habilitada para suscripciones" : "Credencial de producción habilitada",
  };
}

// Crea el "link de pago" para un pedido. `externalReference` es lo que nos
// vuelve en el webhook para saber de qué pedido se trata — no dependemos del
// host ahí (ver src/app/api/webhooks/mercadopago/route.ts).
export async function createPreference(
  accessToken: string,
  {
    items,
    externalReference,
    notificationUrl,
    backUrl,
    payerEmail,
  }: {
    items: MpPreferenceItem[];
    externalReference: string;
    notificationUrl: string;
    backUrl: string;
    payerEmail?: string | null;
  },
): Promise<MpPreference> {
  const data = await mpFetch(accessToken, "/checkout/preferences", {
    method: "POST",
    body: JSON.stringify({
      items: items.map((i) => ({
        title: i.title,
        quantity: i.quantity,
        unit_price: i.unitPrice,
        currency_id: MP_CURRENCY,
      })),
      external_reference: externalReference,
      payer: payerEmail ? { email: payerEmail } : undefined,
      notification_url: notificationUrl,
      back_urls: { success: backUrl, failure: backUrl, pending: backUrl },
      // Vuelve solo a la tienda cuando el pago se aprueba, sin que tenga que
      // tocar "volver al sitio". MP exige que back_urls.success sea https
      // para esto, así que en local (http) esto se omite — ver el llamador.
      auto_return: backUrl.startsWith("https://") ? "approved" : undefined,
    }),
  });

  return { id: String(data.id), initPoint: String(data.init_point) };
}

export type MpPayment = {
  id: string;
  status: string;
  externalReference: string | null;
};

// El webhook NO confía en lo que dice el POST: solo trae un id, y con eso
// vamos a preguntarle a MP el estado real del pago.
export async function getPayment(accessToken: string, paymentId: string): Promise<MpPayment> {
  const data = await mpFetch(accessToken, `/v1/payments/${paymentId}`);
  return {
    id: String(data.id),
    status: String(data.status),
    externalReference: data.external_reference ? String(data.external_reference) : null,
  };
}

// Verifica que una notificación venga de verdad de MercadoPago.
//
// Sin esto, cualquiera que sepa la URL del webhook puede mandar un POST
// diciendo "este pedido está pagado" y llevarse la mercadería gratis.
//
// MP manda un header `x-signature` con la forma "ts=<...>,v1=<hmac>", y el
// hmac es SHA256 sobre "id:<dataId>;request-id:<requestId>;ts:<ts>;" con la
// clave secreta de la integración. Si algún dato del template no viene en la
// notificación, se omite ese tramo.
export function verifyWebhookSignature({
  signatureHeader,
  requestId,
  dataId,
  secret,
}: {
  signatureHeader: string | null;
  requestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  if (!signatureHeader || !dataId) return false;

  const parts = new Map(
    signatureHeader.split(",").map((chunk) => {
      const [k, ...rest] = chunk.trim().split("=");
      return [k.trim(), rest.join("=").trim()] as const;
    }),
  );
  const ts = parts.get("ts");
  const received = parts.get("v1");
  if (!ts || !received) return false;

  let manifest = `id:${dataId};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");

  // Comparación en tiempo constante: comparar con === filtra información
  // sobre cuántos caracteres acertó quien lo intente.
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
