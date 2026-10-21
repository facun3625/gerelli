import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getPlatformMarketingSettings, getSetupServiceSettings, getPlatformTelegramSettings, getPlatformResendSettings } from "@/lib/platform-billing";
import { MarketingSettingsForm } from "./marketing-settings-form";
import { SetupServiceSettingsForm } from "./setup-service-settings-form";
import { PlatformTelegramSettingsForm } from "./platform-telegram-settings-form";
import { PlatformResendSettingsForm } from "./platform-resend-settings-form";
import { InstagramSettingsForm } from "./instagram-settings-form";

export default async function PlatformSettingsPage() {
  const [settings, setupService, telegram, resend] = await Promise.all([
    getPlatformMarketingSettings(),
    getSetupServiceSettings(),
    getPlatformTelegramSettings(),
    getPlatformResendSettings(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Configuración</h1>
        <p className="text-sm text-muted-foreground">Canales de contacto y opciones generales de la plataforma.</p>
      </div>

      <Tabs defaultValue="whatsapp">
        <TabsList className="w-full">
          <TabsTrigger value="whatsapp" className="flex-1">
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="setup-service" className="flex-1">
            Armado de tienda
          </TabsTrigger>
          <TabsTrigger value="telegram" className="flex-1">
            Telegram
          </TabsTrigger>
          <TabsTrigger value="mail" className="flex-1">
            Mail
          </TabsTrigger>
          <TabsTrigger value="instagram" className="flex-1">
            Instagram
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatsapp">
          <MarketingSettingsForm
            enabled={settings.whatsappEnabled}
            number={settings.whatsappNumber}
            message={settings.whatsappMessage}
          />
        </TabsContent>

        <TabsContent value="setup-service">
          <SetupServiceSettingsForm
            enabled={setupService.enabled}
            price={setupService.price}
            steps={setupService.steps}
          />
        </TabsContent>

        <TabsContent value="telegram">
          <PlatformTelegramSettingsForm configured={telegram.configured} chatId={telegram.chatId} />
        </TabsContent>

        <TabsContent value="mail">
          <PlatformResendSettingsForm configured={resend.configured} fromEmail={resend.fromEmail} />
        </TabsContent>

        <TabsContent value="instagram">
          <InstagramSettingsForm enabled={settings.instagramEnabled} username={settings.instagramUsername} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
