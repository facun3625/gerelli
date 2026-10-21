"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboardIcon, StoreIcon, CreditCardIcon, GiftIcon, PlusIcon, UsersIcon, UserIcon, LandmarkIcon, SettingsIcon, GlobeIcon, EyeIcon, MessageCircleIcon, ActivityIcon, DatabaseIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const sections = [
  { href: "/platform", label: "Resumen", icon: LayoutDashboardIcon },
  { href: "/platform/tiendas", label: "Inmobiliarias", icon: StoreIcon },
  { href: "/platform/usuarios", label: "Usuarios", icon: UserIcon },
  { href: "/platform/planes", label: "Planes", icon: CreditCardIcon },
  { href: "/platform/facturacion", label: "Facturación", icon: LandmarkIcon },
  { href: "/platform/promociones", label: "Promociones", icon: GiftIcon },
  { href: "/platform/dominios", label: "Dominios", icon: GlobeIcon },
  { href: "/platform/trafico", label: "Tráfico del sitio", icon: ActivityIcon },
  { href: "/platform/demo", label: "Visitas demo", icon: EyeIcon },
  { href: "/platform/chats", label: "Chats del bot", icon: MessageCircleIcon },
  { href: "/platform/revendedores", label: "Revendedores", icon: UsersIcon },
  { href: "/platform/backups", label: "Backups", icon: DatabaseIcon },
  { href: "/platform/configuracion", label: "Configuración", icon: SettingsIcon },
];

export function PlatformSidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-full flex-col text-sidebar-foreground">
      <div className="flex items-center gap-3 px-4 py-4">
        <Image src="/brand/logo.svg" alt="Urbi" width={595} height={180} className="bg-white rounded-lg p-1.5 h-7 w-auto object-contain" />
        <span className="rounded-full border border-primary/25 bg-primary/15 px-2 py-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-primary">Platform</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {sections.map((s) => {
          const active = s.href === "/platform" ? pathname === "/platform" : pathname.startsWith(s.href);
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {s.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-3">
        <Link
          href="/platform/nueva"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <PlusIcon className="size-4 shrink-0" />
          Nueva inmobiliaria
        </Link>
      </div>
    </div>
  );
}
