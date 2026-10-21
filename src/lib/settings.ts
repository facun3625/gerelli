import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type StoreSettings = {
  storeName: string;
  logoUrl: string | null;
  footerLogoUrl: string | null;
  coverUrl: string | null;
  faviconUrl: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  addToCartLabel: string;
  footerTagline: string;
  footerPitchTitle: string;
  footerPitchText: string;
  template: string;
  hasServices: boolean;
  hasDevelopments: boolean;
  headerBgColor: string;
  menuBgColor: string;
  footerBgColor: string;
  buttonColor: string;
  badgeColor: string;
  showNameInHeader: boolean;
  logoHeight: number;
  footerLogoHeight: number;
};

const DEFAULT_STORE_NAME = "Pedidos";
const DEFAULT_ADD_TO_CART_LABEL = "Agregar";
// HTML, no texto plano: estos dos se editan con RichTextEditor (ver
// footer-form.tsx) y se muestran con RichText, que ya sanitiza el HTML.
const DEFAULT_FOOTER_TAGLINE =
  "<p>Gestionamos tu búsqueda, venta o alquiler con seriedad, confianza y resultados reales.</p>";
const DEFAULT_FOOTER_PITCH_TITLE = "¿Desea vender o alquilar?";
const DEFAULT_FOOTER_PITCH_TEXT =
  "<p>Contamos con un equipo especializado y amplio conocimiento del mercado, listo para ayudarte a vender, alquilar o encontrar tu próxima propiedad.</p>";
export const DEFAULT_STORE_TEMPLATE = "clasico";
// Mismos valores que ya estaban hardcodeados en el sitio (--foreground y
// --primary de globals.css) — así un tenant que nunca toca "Identidad" ve
// exactamente el mismo look de siempre.
export const DEFAULT_HEADER_BG_COLOR = "#3d3d3d";
export const DEFAULT_MENU_BG_COLOR = "#1e658c";
export const DEFAULT_FOOTER_BG_COLOR = "#3d3d3d";
export const DEFAULT_BUTTON_COLOR = "#1e658c";
export const DEFAULT_BADGE_COLOR = "#1e658c";
export const DEFAULT_LOGO_HEIGHT = 64;
export const MIN_LOGO_HEIGHT = 32;
export const MAX_LOGO_HEIGHT = 120;
export const DEFAULT_FOOTER_LOGO_HEIGHT = 56;

const SETTINGS_KEYS = [
  "store_name",
  "store_logo_url",
  "store_footer_logo_url",
  "store_cover_url",
  "store_favicon_url",
  "store_address",
  "store_city",
  "store_province",
  "store_phone",
  "store_email",
  "store_whatsapp",
  "store_instagram",
  "store_facebook",
  "store_youtube",
  "store_add_to_cart_label",
  "store_footer_tagline",
  "store_footer_pitch_title",
  "store_footer_pitch_text",
  "store_template",
  "store_header_bg_color",
  "store_menu_bg_color",
  "store_footer_bg_color",
  "store_button_color",
  "store_badge_color",
  "store_show_name_in_header",
  "store_logo_height",
  "store_footer_logo_height",
] as const;

export const getStoreSettings = cache(
  async (tenantId: string): Promise<StoreSettings> => {
    const [rows, serviceCount, developmentCount] = await Promise.all([
      prisma.settings.findMany({
        where: { tenantId, key: { in: [...SETTINGS_KEYS] } },
      }),
      prisma.service.count({ where: { tenantId, active: true } }),
      prisma.estateDevelopment.count({ where: { tenantId, published: true } }),
    ]);
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      storeName: map.store_name || DEFAULT_STORE_NAME,
      logoUrl: map.store_logo_url || null,
      footerLogoUrl: map.store_footer_logo_url || null,
      coverUrl: map.store_cover_url || null,
      faviconUrl: map.store_favicon_url || null,
      address: map.store_address || null,
      city: map.store_city || null,
      province: map.store_province || null,
      phone: map.store_phone || null,
      email: map.store_email || null,
      whatsapp: map.store_whatsapp || null,
      instagram: map.store_instagram || null,
      facebook: map.store_facebook || null,
      youtube: map.store_youtube || null,
      addToCartLabel: map.store_add_to_cart_label || DEFAULT_ADD_TO_CART_LABEL,
      footerTagline: map.store_footer_tagline || DEFAULT_FOOTER_TAGLINE,
      footerPitchTitle:
        map.store_footer_pitch_title || DEFAULT_FOOTER_PITCH_TITLE,
      footerPitchText: map.store_footer_pitch_text || DEFAULT_FOOTER_PITCH_TEXT,
      template: map.store_template || DEFAULT_STORE_TEMPLATE,
      hasServices: serviceCount > 0,
      hasDevelopments: developmentCount > 0,
      headerBgColor: map.store_header_bg_color || DEFAULT_HEADER_BG_COLOR,
      menuBgColor: map.store_menu_bg_color || DEFAULT_MENU_BG_COLOR,
      footerBgColor: map.store_footer_bg_color || DEFAULT_FOOTER_BG_COLOR,
      buttonColor: map.store_button_color || DEFAULT_BUTTON_COLOR,
      badgeColor: map.store_badge_color || DEFAULT_BADGE_COLOR,
      showNameInHeader: map.store_show_name_in_header !== "false",
      logoHeight: Math.min(
        MAX_LOGO_HEIGHT,
        Math.max(
          MIN_LOGO_HEIGHT,
          Number(map.store_logo_height) || DEFAULT_LOGO_HEIGHT,
        ),
      ),
      footerLogoHeight: Math.min(
        MAX_LOGO_HEIGHT,
        Math.max(
          MIN_LOGO_HEIGHT,
          Number(map.store_footer_logo_height) || DEFAULT_FOOTER_LOGO_HEIGHT,
        ),
      ),
    };
  },
);

// ---------- Mensaje editable del mail de pedido ----------

export const getOrderEmailMessage = cache(
  async (tenantId: string): Promise<string | null> => {
    const row = await prisma.settings.findUnique({
      where: { tenantId_key: { tenantId, key: "order_email_message" } },
    });
    return row?.value || null;
  },
);

// ---------- SEO (solo tiendas con dominio propio verificado) ----------

export type SeoSettings = {
  title: string | null;
  description: string | null;
  ogImageUrl: string | null;
};

const SEO_SETTINGS_KEYS = [
  "seo_title",
  "seo_description",
  "seo_og_image_url",
] as const;

export const getSeoSettings = cache(
  async (tenantId: string): Promise<SeoSettings> => {
    const rows = await prisma.settings.findMany({
      where: { tenantId, key: { in: [...SEO_SETTINGS_KEYS] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      title: map.seo_title || null,
      description: map.seo_description || null,
      ogImageUrl: map.seo_og_image_url || null,
    };
  },
);

// ---------- Telegram (aviso de pedido nuevo al grupo del equipo) ----------

export type TelegramSettings = {
  configured: boolean;
  botToken: string | null;
  chatId: string | null;
};

const TELEGRAM_SETTINGS_KEYS = [
  "telegram_bot_token",
  "telegram_chat_id",
] as const;

export const getTelegramSettings = cache(
  async (tenantId: string): Promise<TelegramSettings> => {
    const rows = await prisma.settings.findMany({
      where: { tenantId, key: { in: [...TELEGRAM_SETTINGS_KEYS] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const botToken = map.telegram_bot_token || null;
    const chatId = map.telegram_chat_id || null;
    return {
      configured: Boolean(botToken && chatId),
      botToken,
      chatId,
    };
  },
);

export type AiAgentSettings = {
  enabled: boolean;
  tone: string | null;
  rules: string | null;
  greeting: string | null;
};

const AI_AGENT_SETTINGS_KEYS = [
  "ai_agent_enabled",
  "ai_agent_tone",
  "ai_agent_rules",
  "ai_agent_greeting",
] as const;

export const getAiAgentSettings = cache(
  async (tenantId: string): Promise<AiAgentSettings> => {
    const rows = await prisma.settings.findMany({
      where: { tenantId, key: { in: [...AI_AGENT_SETTINGS_KEYS] } },
    });
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      enabled: map.ai_agent_enabled === "true",
      tone: map.ai_agent_tone || null,
      rules: map.ai_agent_rules || null,
      greeting: map.ai_agent_greeting || null,
    };
  },
);
