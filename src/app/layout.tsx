import { BRAND } from "@/lib/brand";
import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Barlow, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { StoreSettingsProvider } from "@/lib/store-settings-context";
import { getStoreSettings, getSeoSettings } from "@/lib/settings";
import { contrastText } from "@/lib/contrast-color";
import { getCurrentTenant } from "@/lib/tenant";
import { StorePwaProvider } from "@/components/store/store-pwa-provider";
import { PublicAnalyticsTracker } from "@/components/estate/public-analytics-tracker";
import { AiAgentWidget } from "@/components/estate/ai-agent-widget";
import { getAssistantStatus } from "@/lib/ai-agent/status";

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
  const tenant = await getCurrentTenant();
  if (!tenant) {
    return {
      title: BRAND.name,
      description: BRAND.description,
      icons: { icon: BRAND.icon },
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

  const tenant = await getCurrentTenant();

  if (!tenant) {
    return (
      <html lang="es" className={htmlClassName}>
        <body className="flex min-h-full flex-col items-center justify-center gap-2 px-6 text-center">
          <h1 className="text-xl font-semibold">Sitio en configuración</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Volvé a intentarlo en unos minutos.
          </p>
        </body>
      </html>
    );
  }

  const showAiWidget = !pathname.startsWith("/admin") && !pathname.startsWith("/agente");
  const [storeSettings, assistantStatus] = await Promise.all([
    getStoreSettings(tenant.id),
    showAiWidget ? getAssistantStatus(tenant.id) : Promise.resolve(null),
  ]);
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
        <StoreSettingsProvider value={{ ...storeSettings, tenantId: tenant.id }}>
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
            {assistantStatus && <AiAgentWidget status={assistantStatus} />}
          </Providers>
        </StoreSettingsProvider>
      </body>
    </html>
  );
}
