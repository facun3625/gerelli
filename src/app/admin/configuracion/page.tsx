import { getStoreSettings, getSeoSettings, getAiAgentSettings } from "@/lib/settings";
import { getPopupConfig } from "@/lib/popup";
import { requireTenantAdminWithPlan } from "@/lib/require-admin";
import { prisma } from "@/lib/prisma";
import { verificationRecordName } from "@/lib/custom-domain";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PopupForm } from "./popup-form";
import { DocumentacionTab } from "./documentacion-tab";
import { CustomDomainForm } from "./custom-domain-form";
import { SeoSettingsForm } from "./seo-settings-form";
import { AiAgentSettingsForm } from "./ai-agent-settings-form";

const VALID_TABS = new Set(["popup", "docs", "dominio", "seo", "ia"]);

export default async function ConfiguracionPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { session, tenant, features } = await requireTenantAdminWithPlan();
  const { tab } = await searchParams;
  const initialTab = tab && VALID_TABS.has(tab) ? tab : "popup";
  const [settings, popupConfig, tenantDomain, seoSettings, aiAgentSettings] = await Promise.all([
    getStoreSettings(tenant.id),
    getPopupConfig(tenant.id),
    prisma.tenant.findUnique({
      where: { id: tenant.id },
      select: { customDomain: true, customDomainVerified: true, customDomainToken: true },
    }),
    getSeoSettings(tenant.id),
    getAiAgentSettings(tenant.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Configuración</h1>

      <Tabs defaultValue={initialTab}>
        <TabsList className="w-full">
          <TabsTrigger value="popup" className="flex-1">
            Pop-up
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex-1">
            Documentación
          </TabsTrigger>
          {features.allowCustomDomain && (
            <TabsTrigger value="dominio" className="flex-1">
              Dominio propio
            </TabsTrigger>
          )}
          {features.allowCustomDomain && (
            <TabsTrigger value="seo" className="flex-1">
              SEO
            </TabsTrigger>
          )}
          {features.allowAiAgent && (
            <TabsTrigger value="ia" className="flex-1">
              Agente IA
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="popup">
          <PopupForm key={popupConfig.version} config={popupConfig} />
        </TabsContent>

        <TabsContent value="docs">
          <DocumentacionTab />
        </TabsContent>

        {features.allowCustomDomain && tenantDomain && (
          <TabsContent value="dominio">
            <CustomDomainForm
              domain={tenantDomain.customDomain}
              verified={tenantDomain.customDomainVerified}
              verificationRecordName={tenantDomain.customDomain ? verificationRecordName(tenantDomain.customDomain) : null}
              verificationToken={tenantDomain.customDomainToken}
              contactName={session.user.name ?? ""}
              contactEmail={session.user.email ?? ""}
            />
          </TabsContent>
        )}

        {features.allowCustomDomain && (
          <TabsContent value="seo">
            <SeoSettingsForm
              key={JSON.stringify(seoSettings)}
              settings={seoSettings}
              storeName={settings.storeName}
              domainVerified={Boolean(tenantDomain?.customDomainVerified)}
            />
          </TabsContent>
        )}

        {features.allowAiAgent && (
          <TabsContent value="ia">
            <AiAgentSettingsForm key={JSON.stringify(aiAgentSettings)} settings={aiAgentSettings} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
