import { Suspense } from "react";
import Image from "next/image";
import { Montserrat } from "next/font/google";

import { AdminThemeRoot } from "@/components/admin/admin-theme-root";
import { PlatformLoginForm } from "./login-form";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export default function PlatformLoginPage() {
  return (
    <AdminThemeRoot fontFamily={montserrat.style.fontFamily} variant="platform" defaultTheme="dark">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-sm flex-col gap-0 overflow-hidden rounded-2xl bg-background shadow-2xl ring-1 ring-border">
          <div className="flex flex-col items-center gap-4 bg-muted/40 px-6 py-8 text-center">
            <Image
              src="/logo_blanco.svg"
              alt="Urbi"
              width={595}
              height={180}
              className="h-12 w-auto object-contain"
              priority
            />
            <span className="rounded-full border border-primary/25 bg-primary/15 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary">
              Platform
            </span>
            <div className="flex flex-col items-center gap-0.5">
              <h1 className="text-xl font-semibold">Panel de plataforma</h1>
              <p className="text-sm text-muted-foreground">Acceso solo para administración</p>
            </div>
          </div>

          <div className="h-px bg-border" />

          <div className="px-6 py-6">
            <Suspense>
              <PlatformLoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </AdminThemeRoot>
  );
}
