import { redirect } from "next/navigation";
import { Montserrat } from "next/font/google";
import { SessionProvider } from "next-auth/react";

import { auth } from "@/auth";
import { AdminThemeRoot } from "@/components/admin/admin-theme-root";
import { UrbiAccountSidebar } from "@/components/urbi-account-sidebar";
import { UrbiAccountTopbar } from "@/components/urbi-account-topbar";
import { prisma } from "@/lib/prisma";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default async function UrbiAccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true, referralCode: true, resellerDeactivatedAt: true },
  });
  // La sesión es JWT: si el usuario que quedó firmado en el token ya no
  // existe (por ejemplo, un super admin borró esa tienda), auth() sigue
  // devolviendo una sesión con buena forma — no hay una consulta a la base
  // en el medio. Sin esto, "/mi-cuenta" rebotaba en silencio a "/" en cada
  // intento, dejando la cookie vieja puesta. Forzamos el logout real.
  if (!user) redirect("/api/auth/logout-all");

  const hasOwnStore = Boolean(user.tenantId);
  const isReseller = Boolean(user.referralCode && !user.resellerDeactivatedAt);

  return (
    <SessionProvider>
      <AdminThemeRoot fontFamily={montserrat.style.fontFamily} variant="urbi" defaultTheme="light">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
          <UrbiAccountSidebar hasOwnStore={hasOwnStore} isReseller={isReseller} />
        </aside>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <UrbiAccountTopbar hasOwnStore={hasOwnStore} isReseller={isReseller} />
          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-6 lg:px-8">
            <div className="flex w-full max-w-6xl flex-col gap-6">{children}</div>
          </main>
        </div>
      </AdminThemeRoot>
    </SessionProvider>
  );
}
