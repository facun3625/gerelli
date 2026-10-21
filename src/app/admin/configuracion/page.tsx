import { getStoreSettings, getSeoSettings, getTelegramSettings, getAiAssistantSettings } from "@/lib/settings";
import { getPopupConfig } from "@/lib/popup";
import { requireTenantAdmin } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { getMercadoLibreSettings } from "@/lib/mercadolibre/settings";
import { mercadoLibreRedirectUri } from "@/lib/mercadolibre/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PopupForm } from "./popup-form";
import { SeoSettingsForm } from "./seo-settings-form";
import { TelegramSettingsForm } from "./telegram-settings-form";
import { AiAssistantSettingsForm } from "./ai-assistant-settings-form";
import { MercadoLibreSettingsForm } from "./mercadolibre-settings-form";

const VALID_TABS = new Set(["popup", "seo", "telegram", "ia", "mercadolibre"]);

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; mlError?: string }>;
}) {
  const { tenant } = await requireTenantAdmin();
  const { tab, mlError } = await searchParams;
  const initialTab = tab && VALID_TABS.has(tab) ? tab : "popup";
  const [settings, popupConfig, seoSettings, telegramSettings, aiSettings, mlSettings, properties, mlLocations] = await Promise.all([
    getStoreSettings(tenant.id),
    getPopupConfig(tenant.id),
    getSeoSettings(tenant.id),
    getTelegramSettings(tenant.id),
    getAiAssistantSettings(tenant.id),
    getMercadoLibreSettings(tenant.id),
    prisma.estateProperty.findMany({
      where: { tenantId: tenant.id },
      select: { city: true, neighborhood: true },
      distinct: ["city", "neighborhood"],
      orderBy: { city: "asc" },
    }),
    prisma.estateMlLocation.findMany({ where: { tenantId: tenant.id } }),
  ]);

  const mlLocationRows = properties.map((p) => ({
    city: p.city,
    neighborhood: p.neighborhood,
    mapping: mlLocations.find((m) => m.city === p.city && m.neighborhood === p.neighborhood) ?? null,
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Configuración</h1>

      <Tabs defaultValue={initialTab}>
        <TabsList className="w-full">
          <TabsTrigger value="popup" className="flex-1">
            Pop-up
          </TabsTrigger>
          <TabsTrigger value="seo" className="flex-1">
            SEO
          </TabsTrigger>
          <TabsTrigger value="telegram" className="flex-1">
            Telegram
          </TabsTrigger>
          <TabsTrigger value="ia" className="flex-1">
            Agente IA
          </TabsTrigger>
          <TabsTrigger value="mercadolibre" className="flex-1">
            Mercado Libre
          </TabsTrigger>
        </TabsList>

        <TabsContent value="popup">
          <PopupForm key={popupConfig.version} config={popupConfig} />
        </TabsContent>

        <TabsContent value="seo">
          <SeoSettingsForm
            key={JSON.stringify(seoSettings)}
            settings={seoSettings}
            storeName={settings.storeName}
          />
        </TabsContent>

        <TabsContent value="telegram">
          <TelegramSettingsForm key={JSON.stringify(telegramSettings)} settings={telegramSettings} />
        </TabsContent>

        <TabsContent value="ia">
          <AiAssistantSettingsForm key={JSON.stringify(aiSettings)} settings={aiSettings} />
        </TabsContent>

        <TabsContent value="mercadolibre">
          <MercadoLibreSettingsForm
            clientId={mlSettings.clientId}
            configured={mlSettings.configured}
            connected={mlSettings.connected}
            userId={mlSettings.userId}
            redirectUri={mercadoLibreRedirectUri()}
            mlError={mlError ?? null}
            locationRows={mlLocationRows}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
