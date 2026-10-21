import { BRAND } from "@/lib/brand";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Barlow, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { MarketingSessionProvider } from "@/components/marketing/marketing-session-provider";
import { MarketingWhatsappWidget } from "@/components/marketing/marketing-whatsapp-widget";
import { SalesChatProvider } from "@/components/marketing/sales-chat-widget";
import { StoreSettingsProvider } from "@/lib/store-settings-context";
import { getStoreSettings, getSeoSettings, getAiAgentSettings } from "@/lib/settings";
import { contrastText } from "@/lib/contrast-color";
import { getCurrentTenant } from "@/lib/tenant";
import { getPlatformMarketingSettings } from "@/lib/platform-billing";
import { isDemoSubdomain } from "@/lib/demo";
import { MarketingSocialProvider } from "@/components/marketing/marketing-social-context";
import { toInstagramLink } from "@/lib/social-links";
import { StorePwaProvider } from "@/components/store/store-pwa-provider";
import { PublicAnalyticsTracker } from "@/components/estate/public-analytics-tracker";
import { AiAgentWidget } from "@/components/estate/ai-agent-widget";
import { isAiAgentAvailable } from "@/lib/ai-agent/availability";

async function isPlatformRoute() {
  const pathname = (await headers()).get("x-pathname") ?? "";
  return pathname.startsWith("/platform");
}

const barlow = Barlow({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  if (await isPlatformRoute()) {
    return {
      title: "Urbi · Plataforma",
      icons: { icon: BRAND.icon },
    };
  }

  const tenant = await getCurrentTenant();
  if (!tenant) {
    return {
      title: "Urbi · CRM inmobiliario con sitio web e IA",
      description: BRAND.description,
      icons: { icon: BRAND.icon },
      metadataBase: new URL(
        `${process.env.ROOT_DOMAIN?.startsWith("localhost") ? "http" : "https"}://${process.env.ROOT_DOMAIN ?? "localhost:3010"}`,
      ),
      alternates: { canonical: "/" },
      openGraph: {
        title: "Urbi · CRM inmobiliario con sitio web e IA",
        description: BRAND.description,
        url: "/",
        siteName: "Urbi",
        locale: "es_AR",
        type: "website",
        images: [
          {
            url: "/brand/social-card.png",
            width: 1200,
            height: 630,
            alt: "Urbi, gestión inmobiliaria",
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: "Urbi · CRM inmobiliario con sitio web e IA",
        description: BRAND.description,
        images: ["/brand/social-card.png"],
      },
    };
  }

  const [{ storeName, faviconUrl }, seo] = await Promise.all([
    getStoreSettings(tenant.id),
    getSeoSettings(tenant.id),
  ]);
  const title = seo.title || storeName;
  const description =
    seo.description || `Propiedades en venta y alquiler en ${storeName}`;
  return {
    title,
    description,
    icons: faviconUrl ? { icon: faviconUrl } : undefined,
    // El layout de /admin pisa esto con su propio manifest (metadata de
    // hijo gana sobre la de padre), así que las páginas del panel siguen
    // usando /admin/manifest.webmanifest sin tocar nada acá.
    manifest: "/manifest.webmanifest",
    // El resto de la metadata (OG, Twitter card) solo se completa si hay
    // imagen propia cargada — sin eso no hay nada mejor que mostrar que el
    // título y la descripción de arriba, así que no vale la pena armar el
    // bloque entero.
    ...(seo.ogImageUrl && {
      openGraph: {
        title,
        description,
        siteName: storeName,
        locale: "es_AR",
        type: "website",
        images: [{ url: seo.ogImageUrl }],
      },
      twitter: {
        card: "summary_large_image" as const,
        title,
        description,
        images: [seo.ogImageUrl],
      },
    }),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const htmlClassName = `${barlow.variable} ${geistMono.variable} h-full antialiased`;
  const pathname = (await headers()).get("x-pathname") ?? "";

  if (await isPlatformRoute()) {
    return (
      <html lang="es" className={htmlClassName}>
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    );
  }

  const tenant = await getCurrentTenant();

  if (!tenant) {
    const marketingSettings = await getPlatformMarketingSettings();
    const instagramUrl =
      marketingSettings.instagramEnabled && marketingSettings.instagramUsername
        ? toInstagramLink(marketingSettings.instagramUsername)
        : null;
    return (
      <html lang="es" className={htmlClassName}>
        <body className="min-h-full">
          <MarketingSessionProvider>
            <MarketingSocialProvider instagramUrl={instagramUrl}>
              <SalesChatProvider>
                {children}
                {marketingSettings.whatsappEnabled &&
                marketingSettings.whatsappNumber ? (
                  <MarketingWhatsappWidget
                    number={marketingSettings.whatsappNumber}
                    message={marketingSettings.whatsappMessage}
                  />
                ) : null}
              </SalesChatProvider>
            </MarketingSocialProvider>
          </MarketingSessionProvider>
        </body>
      </html>
    );
  }

  if (tenant.status === "SUSPENDED" && !pathname.startsWith("/admin")) {
    return (
      <html lang="es" className={htmlClassName}>
        <body className="flex min-h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <h1 className="text-xl font-semibold">Inmobiliaria no encontrada</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Este sitio está temporalmente suspendido.
          </p>
        </body>
      </html>
    );
  }

  const storeSettings = await getStoreSettings(tenant.id);
  const showAiWidget = !pathname.startsWith("/admin") && !pathname.startsWith("/agente");
  const [aiAgentAvailable, aiAgentSettings] = showAiWidget
    ? await Promise.all([isAiAgentAvailable(tenant.id), getAiAgentSettings(tenant.id)])
    : [false, null];
  // Se pisa acá --primary/--primary-foreground (no en :root, que también
  // usa el panel admin con su propio theming) para que "Color de botones"
  // de Identidad alcance a cualquier bg-primary/text-primary del sitio
  // público sin tocar el admin.
  const buttonThemeStyle = {
    "--primary": storeSettings.buttonColor,
    "--primary-foreground": contrastText(storeSettings.buttonColor),
  } as React.CSSProperties;

  return (
    <html lang="es" className={htmlClassName}>
      <body className="min-h-full flex flex-col">
        <StoreSettingsProvider
          value={{
            ...storeSettings,
            tenantId: tenant.id,
            isDemo: isDemoSubdomain(tenant.subdomain),
          }}
        >
          <Providers>
            {pathname.startsWith("/admin") ? (
              children
            ) : (
              <div
                className={`contents store-template-${storeSettings.template}`}
                style={buttonThemeStyle}
              >
                <StorePwaProvider>
                  <PublicAnalyticsTracker />
                  {children}
                </StorePwaProvider>
              </div>
            )}
            {aiAgentAvailable && <AiAgentWidget greeting={aiAgentSettings?.greeting} />}
          </Providers>
        </StoreSettingsProvider>
      </body>
    </html>
  );
}
