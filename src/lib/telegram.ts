import { getTelegramSettings } from "@/lib/settings";
import { getPlatformTelegramSettings } from "@/lib/platform-billing";
import { formatPrice } from "@/lib/format";
import { FULFILLMENT_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/order-status";
import type { FulfillmentType, PaymentMethodType } from "@/generated/prisma/client";

// Un solo POST al endpoint sendMessage de la Bot API — devuelve {ok, error}
// en vez de tirar, para poder reusarla tanto en el aviso automático como en
// el botón "Probar" del admin.
export async function sendTelegram(
  token: string,
  chatId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    if (res.ok) return { ok: true };

    // Telegram devuelve { description } con el motivo (token inválido, chat
    // no encontrado, bot sin permiso, etc.) — útil para mostrar en el admin.
    const detail = await res.text().catch(() => "");
    let description = `HTTP ${res.status}`;
    try {
      const parsed = JSON.parse(detail) as { description?: string };
      if (parsed.description) description = parsed.description;
    } catch {
      /* dejamos el HTTP status */
    }
    return { ok: false, error: description };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de red" };
  }
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

type NewOrderNotification = {
  orderId: string;
  orderUrl?: string;
  customerName: string;
  customerPhone?: string | null;
  paymentMethod: PaymentMethodType;
  fulfillmentType: FulfillmentType;
  total: number;
  items: { name: string; quantity: number }[];
};

function buildMessage(order: NewOrderNotification): string {
  const lines: string[] = [];
  lines.push(`🛍️ <b>Nueva venta</b> #${escapeHtml(order.orderId.slice(-8).toUpperCase())}`);
  lines.push("");
  lines.push(`👤 ${escapeHtml(order.customerName)}`);
  if (order.customerPhone) lines.push(`📱 ${escapeHtml(order.customerPhone)}`);
  lines.push(
    `💳 ${escapeHtml(PAYMENT_METHOD_LABELS[order.paymentMethod])} · ${escapeHtml(FULFILLMENT_TYPE_LABELS[order.fulfillmentType])} — ${escapeHtml(formatPrice(order.total))}`,
  );
  lines.push("");
  for (const item of order.items) {
    lines.push(`• ${item.quantity}x ${escapeHtml(item.name)}`);
  }

  if (order.orderUrl) {
    lines.push("");
    lines.push(`<a href="${escapeHtml(order.orderUrl)}">Ver en el panel →</a>`);
  }

  return lines.join("\n");
}

// Fire-and-forget: se llama sin await justo después de guardar el pedido.
// Si Telegram está mal configurado, caído, o el token venció, el pedido ya
// se guardó igual y el cliente no ve ningún error — esto solo loguea.
export async function notifyNewOrder(tenantId: string, order: NewOrderNotification): Promise<void> {
  const settings = await getTelegramSettings(tenantId);
  if (!settings.configured) return;

  const result = await sendTelegram(settings.botToken!, settings.chatId!, buildMessage(order));
  if (!result.ok) console.error("notifyNewOrder: Telegram falló —", result.error);
}

type NewTenantNotification = {
  storeName: string;
  subdomain: string;
  planName: string;
  ownerName: string | null;
  ownerEmail: string;
};

export const SAMPLE_NEW_TENANT_NOTIFICATION: NewTenantNotification = {
  storeName: "Pizzería de Ejemplo",
  subdomain: "pizzeria-ejemplo",
  planName: "Negocio",
  ownerName: "Facundo Arteaga",
  ownerEmail: "facundo@ejemplo.com",
};

export function buildNewTenantMessage(tenant: NewTenantNotification): string {
  const lines: string[] = [];
  lines.push(`🎉 <b>Nueva tienda</b>`);
  lines.push("");
  lines.push(`🏪 ${escapeHtml(tenant.storeName)} (${escapeHtml(tenant.subdomain)})`);
  lines.push(`📦 Plan: ${escapeHtml(tenant.planName)}`);
  lines.push(`👤 ${escapeHtml(tenant.ownerName ?? "Sin nombre")} — ${escapeHtml(tenant.ownerEmail)}`);
  return lines.join("\n");
}

// Compartido por todos los avisos "al equipo de Urbi" (no a una tienda) —
// mismo chat/bot para tienda nueva, revendedor nuevo y lead del bot de
// ventas. Si el chat de un tipo de aviso necesita separarse del resto
// algún día, ahí sí vale la pena una config por tipo; hasta entonces, uno
// solo alcanza.
async function sendPlatformNotification(text: string, logLabel: string): Promise<void> {
  const settings = await getPlatformTelegramSettings();
  if (!settings.configured) return;

  const result = await sendTelegram(settings.botToken!, settings.chatId!, text);
  if (!result.ok) console.error(`${logLabel}: Telegram falló —`, result.error);
}

// Fire-and-forget, igual que notifyNewOrder — al equipo de Urbi (super
// admin), no a la tienda. Se llama apenas se completa /registro/datos.
export async function notifyPlatformNewTenant(tenant: NewTenantNotification): Promise<void> {
  await sendPlatformNotification(buildNewTenantMessage(tenant), "notifyPlatformNewTenant");
}

type NewResellerNotification = {
  name: string | null;
  email: string;
  referralCode: string;
};

export const SAMPLE_NEW_RESELLER_NOTIFICATION: NewResellerNotification = {
  name: "Facundo Arteaga",
  email: "facundo@ejemplo.com",
  referralCode: "FACU2026",
};

export function buildNewResellerMessage(reseller: NewResellerNotification): string {
  const lines: string[] = [];
  lines.push(`🤝 <b>Nuevo revendedor</b>`);
  lines.push("");
  lines.push(`👤 ${escapeHtml(reseller.name ?? "Sin nombre")} — ${escapeHtml(reseller.email)}`);
  lines.push(`🔑 Código: ${escapeHtml(reseller.referralCode)}`);
  return lines.join("\n");
}

// Se llama apenas alguien saca su código de revendedor (becomeReseller).
export async function notifyPlatformNewReseller(reseller: NewResellerNotification): Promise<void> {
  await sendPlatformNotification(buildNewResellerMessage(reseller), "notifyPlatformNewReseller");
}

type BotLeadNotification = {
  name: string;
  phone: string;
  topic: string | null;
};

const BOT_LEAD_TOPIC_LABELS: Record<string, string> = {
  SETUP_SERVICE: "Armado de tienda",
  CONTACT_CTA: "Quiero empezar",
};

export const SAMPLE_BOT_LEAD_NOTIFICATION: BotLeadNotification = {
  name: "Facundo Arteaga",
  phone: "1122334455",
  topic: "SETUP_SERVICE",
};

export function buildBotLeadMessage(lead: BotLeadNotification): string {
  const lines: string[] = [];
  lines.push(`💬 <b>Alguien dejó sus datos en el bot</b>`);
  lines.push("");
  lines.push(`👤 ${escapeHtml(lead.name)}`);
  lines.push(`📱 ${escapeHtml(lead.phone)}`);
  lines.push(`🏷️ ${escapeHtml(lead.topic ? (BOT_LEAD_TOPIC_LABELS[lead.topic] ?? lead.topic) : "Consulta general")}`);
  return lines.join("\n");
}

// Se llama cuando alguien completa el formulario de contacto del bot de
// ventas (POST /api/sales-bot/contact) — no en cada "no sé la respuesta"
// del bot, solo cuando de verdad dejó nombre y teléfono.
export async function notifyPlatformBotLead(lead: BotLeadNotification): Promise<void> {
  await sendPlatformNotification(buildBotLeadMessage(lead), "notifyPlatformBotLead");
}
