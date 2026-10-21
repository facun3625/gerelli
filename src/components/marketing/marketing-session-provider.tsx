"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/sonner";

// El SessionProvider "grande" (components/providers.tsx) trae carrito y
// diálogo de login, que no aplican al dominio raíz (marketing, /registro,
// /revendedores, etc.) — este es solo lo mínimo para que el nav público
// pueda saber si hay una sesión activa.
export function MarketingSessionProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster />
    </SessionProvider>
  );
}
