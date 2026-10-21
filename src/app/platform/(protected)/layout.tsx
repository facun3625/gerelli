import { Montserrat } from "next/font/google";
import { SessionProvider } from "next-auth/react";

import { AdminThemeRoot } from "@/components/admin/admin-theme-root";
import { ConfirmProvider } from "@/components/admin/confirm-provider";
import { PromptProvider } from "@/components/admin/prompt-provider";
import { Toaster } from "@/components/ui/sonner";
import { requireSuperAdmin } from "@/lib/require-super-admin";
import { PlatformSidebarContent } from "./platform-sidebar-content";
import { PlatformTopbar } from "./platform-topbar";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  await requireSuperAdmin();

  return (
    <SessionProvider>
      <AdminThemeRoot fontFamily={montserrat.style.fontFamily} variant="platform" defaultTheme="dark">
        <ConfirmProvider>
          <PromptProvider>
            <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
              <PlatformSidebarContent />
            </aside>

            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <PlatformTopbar />
              <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">{children}</div>
              </main>
            </div>
            <Toaster />
          </PromptProvider>
        </ConfirmProvider>
      </AdminThemeRoot>
    </SessionProvider>
  );
}
