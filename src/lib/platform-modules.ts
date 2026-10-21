import type { PlanFeatures } from "@/lib/require-admin";

export type PlatformModuleKey = "real_estate" | "consortium" | "post_sale";

export type PlatformModuleOption = {
  key: PlatformModuleKey;
  label: string;
  shortLabel: string;
  href: string;
};

export const PLATFORM_MODULES: readonly PlatformModuleOption[] = [
  {
    key: "real_estate",
    label: "Inmobiliaria",
    shortLabel: "Inmo",
    href: "/admin",
  },
  {
    key: "consortium",
    label: "Consorcios",
    shortLabel: "Consorcios",
    href: "/admin/consorcios",
  },
  {
    key: "post_sale",
    label: "Postventa",
    shortLabel: "Postventa",
    href: "/admin/postventa",
  },
];

export function enabledPlatformModules(
  features: Pick<PlanFeatures, "allowRealEstate" | "allowConsortium" | "allowPostSale">,
): PlatformModuleOption[] {
  return PLATFORM_MODULES.filter((module) => {
    if (module.key === "real_estate") return features.allowRealEstate;
    if (module.key === "consortium") return features.allowConsortium;
    return features.allowPostSale;
  });
}

export function platformModuleForPath(pathname: string): PlatformModuleKey {
  if (pathname === "/admin/consorcios" || pathname.startsWith("/admin/consorcios/")) {
    return "consortium";
  }
  if (pathname === "/admin/postventa" || pathname.startsWith("/admin/postventa/")) {
    return "post_sale";
  }
  return "real_estate";
}
