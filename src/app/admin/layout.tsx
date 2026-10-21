import { inquiryChannelFor } from "@/lib/estate/inquiry-channels";
import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { redirect } from "next/navigation";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar, type AdminNotification } from "@/components/admin/admin-topbar";
import { AdminThemeRoot } from "@/components/admin/admin-theme-root";
import { ConfirmProvider } from "@/components/admin/confirm-provider";
import { PromptProvider } from "@/components/admin/prompt-provider";
import { PwaProvider } from "@/components/admin/pwa-provider";
import { prisma } from "@/lib/prisma";
import { requireTenantAdminWithPlan } from "@/lib/require-admin";
import { isDemoSubdomain, DEMO_LAST_ACTIVE_KEY } from "@/lib/demo";
import { enabledPlatformModules } from "@/lib/platform-modules";

export const metadata: Metadata = {
  manifest: "/admin/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent" },
  icons: { apple: "/admin/icon/180" },
};

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const ROOT_DOMAIN = process.env.ROOT_DOMAIN ?? "localhost:3010";

// Sin esto, una sesión demo olvidada abierta (o un link viejo reusado
// directo, sin pasar por /demo) queda válida hasta que expire el cookie de
// NextAuth (30 días por default) — mucho para una clave pública. No hay
// forma confiable de detectar "se cerró la pestaña" desde una cookie de
// sesión, así que en cambio se corta por inactividad: 30 minutos sin cargar
// ninguna página del panel.
const DEMO_INACTIVITY_LIMIT_MS = 30 * 60 * 1000;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { session, tenant, features, permissions } = await requireTenantAdminWithPlan();
  const trialDaysLeft = tenant.billingStatus === "TRIAL" && tenant.trialEndsAt
    ? Math.max(0, Math.ceil((tenant.trialEndsAt.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)))
    : null;

  const [newInquiryCount, newServiceInquiryCount, newDevelopmentInquiryCount, recentInquiries, recentServiceInquiries, recentDevelopmentInquiries, currentPlan, topPlan] = await Promise.all([
    prisma.estateInquiry.count({where:{tenantId:tenant.id,status:"NEW"}}),
    prisma.serviceInquiry.count({where:{tenantId:tenant.id,status:"NEW"}}),
    prisma.estateDevelopmentInquiry.count({where:{tenantId:tenant.id,status:"NEW"}}),
    prisma.estateInquiry.findMany({where:{tenantId:tenant.id,status:"NEW"},include:{contact:true},orderBy:{createdAt:"desc"},take:5}),
    prisma.serviceInquiry.findMany({where:{tenantId:tenant.id,status:"NEW"},orderBy:{createdAt:"desc"},take:5}),
    prisma.estateDevelopmentInquiry.findMany({where:{tenantId:tenant.id,status:"NEW"},orderBy:{createdAt:"desc"},take:5}),
    tenant.planId ? prisma.plan.findUnique({where:{id:tenant.planId},select:{name:true,order:true}}) : null,
    prisma.plan.findFirst({where:{active:true},orderBy:{order:"desc"},select:{order:true}}),
  ]);

  // Mientras alguien navega el panel de una copia demo, cada carga de
  // página refresca su marca de "última actividad" — así /demo no manda una
  // segunda visita ahí mismo, y si esa marca quedó vieja (nadie tocó nada
  // en 30 minutos) se corta la sesión antes de mostrar el panel.
  if (isDemoSubdomain(tenant.subdomain)) {
    const lastActive = await prisma.settings.findUnique({
      where: { tenantId_key: { tenantId: tenant.id, key: DEMO_LAST_ACTIVE_KEY } },
    });
    const idleMs = lastActive ? new Date().getTime() - new Date(lastActive.value).getTime() : 0;
    if (idleMs > DEMO_INACTIVITY_LIMIT_MS) {
      const protocol = ROOT_DOMAIN.startsWith("localhost") ? "http" : "https";
      const returnTo = `${protocol}://${tenant.subdomain}.${ROOT_DOMAIN}/login`;
      redirect(`/api/auth/logout-all?returnTo=${encodeURIComponent(returnTo)}`);
    }
    await prisma.settings.upsert({
      where: { tenantId_key: { tenantId: tenant.id, key: DEMO_LAST_ACTIVE_KEY } },
      update: { value: new Date().toISOString() },
      create: { tenantId: tenant.id, key: DEMO_LAST_ACTIVE_KEY, value: new Date().toISOString() },
    });
  }

  const planInfo = currentPlan ? { name: currentPlan.name, canUpgrade: Boolean(topPlan && currentPlan.order < topPlan.order) } : null;
  const modules = session.user.role === "AGENT"
    ? enabledPlatformModules({ ...features, allowConsortium: false, allowPostSale: false })
    : enabledPlatformModules(features);
  const notifications: AdminNotification[] = [
    ...recentInquiries.map(item=>({id:item.id,type:"INQUIRY" as const,title:"Nueva consulta inmobiliaria",detail:item.contact.name,href:`/admin/gestion/consultas?channel=${inquiryChannelFor(item)}&edit=${item.id}`,createdAt:item.createdAt.toISOString()})),
    ...recentServiceInquiries.map(item=>{
      const answers = item.answers as unknown as { label: string; value: string }[];
      const detail = Array.isArray(answers) ? answers.slice(0,2).map(a=>a.value).join(" · ") : item.serviceTitle;
      return {id:item.id,type:"SERVICE_INQUIRY" as const,title:`Nueva consulta — ${item.serviceTitle}`,detail,href:"/admin/consultas",createdAt:item.createdAt.toISOString()};
    }),
    ...recentDevelopmentInquiries.map(item=>{
      const answers = item.answers as unknown as { label: string; value: string }[];
      const detail = Array.isArray(answers) ? answers.slice(0,2).map(a=>a.value).join(" · ") : item.developmentName;
      return {id:item.id,type:"DEVELOPMENT_INQUIRY" as const,title:`Consulta — ${item.developmentName}`,detail,href:`/admin/gestion/consultas-emprendimientos/${item.id}`,createdAt:item.createdAt.toISOString()};
    }),
  ].sort((a,b)=>new Date(b.createdAt).getTime()-new Date(a.createdAt).getTime()).slice(0,5);

  return (
    <AdminThemeRoot fontFamily={montserrat.style.fontFamily} variant="store" defaultTheme="light">
      <PwaProvider>
        <ConfirmProvider>
          <PromptProvider>
            <aside className="hidden bg-sidebar h-full overflow-y-auto w-64 shrink-0 border-r border-sidebar-border print:hidden lg:flex lg:flex-col">
              <AdminSidebar
                newInquiryCount={newInquiryCount}
                newServiceInquiryCount={newServiceInquiryCount}
                newDevelopmentInquiryCount={newDevelopmentInquiryCount}
                newOrderCount={0}
                features={features}
                planInfo={planInfo}
                agentPermissions={session.user.role === "AGENT" ? permissions : undefined}
              />
            </aside>
            <div className="flex min-w-0 min-h-0 flex-1 flex-col h-full overflow-hidden">
              <AdminTopbar
                storeOpen={tenant.storeOpen}
                stockAlerts={[]}
                newInquiryCount={newInquiryCount}
                newServiceInquiryCount={newServiceInquiryCount}
                newDevelopmentInquiryCount={newDevelopmentInquiryCount}
                newOrderCount={0}
                notificationCount={newInquiryCount + newServiceInquiryCount + newDevelopmentInquiryCount}
                notifications={notifications}
                billingStatus={tenant.billingStatus}
                trialDaysLeft={trialDaysLeft}
                features={features}
                planInfo={planInfo}
                modules={modules}
                salesModeConfigured={true}
                impersonating={Boolean(session.user.impersonatedBy)}
                platformUrl={`${ROOT_DOMAIN.startsWith("localhost") ? "http" : "https"}://${ROOT_DOMAIN}/platform`}
              />
              <main className="flex-1 min-h-0 overflow-y-auto px-4 py-6 lg:px-8 print:p-0">{children}</main>
            </div>
          </PromptProvider>
        </ConfirmProvider>
      </PwaProvider>
    </AdminThemeRoot>
  );
}
