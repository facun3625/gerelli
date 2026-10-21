"use client";

import { createContext, useContext } from "react";

// Instagram de Urbi (no de una tienda) — se usa desde UrbiPublicNav y
// UrbiPublicFooter, que se renderizan sueltos en cada página de marketing
// (no hay un layout compartido entre ellas), por eso un contexto en vez
// de pasarlo por props a cada una.
type MarketingSocial = { instagramUrl: string | null };

const MarketingSocialContext = createContext<MarketingSocial>({ instagramUrl: null });

export function MarketingSocialProvider({
  instagramUrl,
  children,
}: {
  instagramUrl: string | null;
  children: React.ReactNode;
}) {
  return <MarketingSocialContext.Provider value={{ instagramUrl }}>{children}</MarketingSocialContext.Provider>;
}

export function useMarketingSocial() {
  return useContext(MarketingSocialContext);
}
