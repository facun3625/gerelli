import { Montserrat } from "next/font/google";
import { SessionProvider } from "next-auth/react";

import { AdminThemeRoot } from "@/components/admin/admin-theme-root";
import { UrbiAccountSidebar } from "@/components/urbi-account-sidebar";
import { UrbiAccountTopbar } from "@/components/urbi-account-topbar";
import { requireReseller } from "@/lib/require-reseller";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default async function SociosLayout({ children }: { children: React.ReactNode }) {
  const { reseller } = await requireReseller();
  const hasOwnStore = Boolean(reseller.tenantId);

  return (
    <SessionProvider>
      <AdminThemeRoot fontFamily={montserrat.style.fontFamily} variant="urbi" defaultTheme="light">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
          <UrbiAccountSidebar hasOwnStore={hasOwnStore} isReseller />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <UrbiAccountTopbar hasOwnStore={hasOwnStore} isReseller />
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
            <div className="flex w-full max-w-6xl flex-col gap-6">{children}</div>
          </main>
        </div>
      </AdminThemeRoot>
    </SessionProvider>
  );
}
