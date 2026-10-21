"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutDashboardIcon,
  CalendarDaysIcon,
  ClipboardListIcon,
  CreditCardIcon,
  SettingsIcon,
  StoreIcon,
  UsersIcon,
  ChevronDownIcon,
  ConciergeBellIcon,
  MessageSquareTextIcon,
  ArrowUpCircleIcon,
  ExternalLinkIcon,
  DownloadIcon,
  GlobeIcon,
  SearchIcon,
  BuildingIcon,
  UserCheckIcon,
  ChartNoAxesCombinedIcon,
  ListTreeIcon,
} from "lucide-react";

import { useStoreSettings } from "@/lib/store-settings-context";
import { useAdminPwa } from "@/components/admin/pwa-provider";
import { cn } from "@/lib/utils";
import type { PlanFeatures } from "@/lib/require-admin";
import { AGENT_MENU_SECTIONS, type AgentPermissions } from "@/lib/agent-permission-types";
import { platformModuleForPath } from "@/lib/platform-modules";

type Section = {
  href: string;
  label: string;
  icon: typeof LayoutDashboardIcon;
  feature?: keyof PlanFeatures;
  group?: string;
  subitems?: { href: string; label: string; panel: string | null }[];
};

const baseSections: Section[] = [
  {
    href: "/admin",
    label: "Resumen",
    icon: LayoutDashboardIcon,
    group: "Inmobiliaria",
  },

  // Gestión Inmobiliaria — todo lo comercial: propiedades, agenda, contratos
  // y las dos bandejas de consultas (inmobiliarias y de servicios) viven
  // juntas acá, aunque cada una lea de un modelo distinto.
  {
    href: "/admin/gestion/propiedades",
    label: "Propiedades",
    icon: StoreIcon,
    group: "Gestión Inmobiliaria",
  },
  {
    href: "/admin/gestion/clientes",
    label: "Clientes y contactos",
    icon: UsersIcon,
    group: "Gestión Inmobiliaria",
  },
  {
    href: "/admin/gestion/agentes",
    label: "Agentes",
    icon: UserCheckIcon,
    group: "Gestión Inmobiliaria",
  },
  {
    href: "/admin/gestion/consultas",
    label: "Consultas inmobiliarias",
    icon: MessageSquareTextIcon,
    group: "Gestión Inmobiliaria",
  },
  {
    href: "/admin/gestion/busquedas",
    label: "Búsquedas guardadas",
    icon: SearchIcon,
    group: "Gestión Inmobiliaria",
  },
  {
    href: "/admin/gestion/visitas",
    label: "Agenda de visitas",
    icon: CalendarDaysIcon,
    group: "Gestión Inmobiliaria",
  },
  {
    href: "/admin/gestion/operaciones",
    label: "Operaciones",
    icon: ClipboardListIcon,
    group: "Gestión Inmobiliaria",
  },
  {
    href: "/admin/gestion/tasaciones",
    label: "Tasaciones",
    icon: StoreIcon,
    group: "Gestión Inmobiliaria",
  },
  {
    href: "/admin/gestion/contratos",
    label: "Contratos",
    icon: ClipboardListIcon,
    group: "Gestión Inmobiliaria",
  },
  {
    href: "/admin/gestion/cobranzas",
    label: "Cobranzas",
    icon: CreditCardIcon,
    group: "Gestión Inmobiliaria",
  },
  {
    href: "/admin/gestion/emprendimientos",
    label: "Emprendimientos",
    icon: BuildingIcon,
    group: "Gestión Inmobiliaria",
  },
  {
    href: "/admin/gestion/consultas-emprendimientos",
    label: "Consultas de emprendimientos",
    icon: MessageSquareTextIcon,
    group: "Gestión Inmobiliaria",
  },
  {
    href: "/admin/servicios",
    label: "Servicios",
    icon: ConciergeBellIcon,
    feature: "allowServices",
    group: "Gestión Inmobiliaria",
  },
  {
    href: "/admin/consultas",
    label: "Consultas de servicios",
    icon: MessageSquareTextIcon,
    feature: "allowServices",
    group: "Gestión Inmobiliaria",
  },

  // Cuenta
  {
    href: "/admin/pagina",
    label: "Página web",
    icon: GlobeIcon,
    group: "Cuenta",
  },
  {
    href: "/admin/estadisticas",
    label: "Estadísticas",
    icon: ChartNoAxesCombinedIcon,
    feature: "allowStats",
    group: "Cuenta",
  },
  {
    href: "/admin/usuarios",
    label: "Usuarios",
    icon: UsersIcon,
    group: "Cuenta",
  },
  {
    href: "/admin/configuracion",
    label: "Configuración",
    icon: SettingsIcon,
    group: "Cuenta",
  },
];

const consortiumSections: Section[] = [
  {
    href: "/admin/consorcios",
    label: "Resumen",
    icon: BuildingIcon,
    group: "Consorcios",
  },
];

const MODULE_ROOT_HREFS = new Set(["/admin", "/admin/consorcios", "/admin/postventa"]);

const postSaleSections: Section[] = [
  {
    href: "/admin/postventa",
    label: "Resumen",
    icon: SettingsIcon,
    group: "Postventa",
  },
  {
    href: "/admin/postventa/desarrollos",
    label: "Desarrollos",
    icon: BuildingIcon,
    group: "Postventa",
  },
  {
    href: "/admin/postventa/reclamos",
    label: "Reclamos",
    icon: ClipboardListIcon,
    group: "Postventa",
  },
  {
    href: "/admin/postventa/catalogo",
    label: "Catálogo por defecto",
    icon: ListTreeIcon,
    group: "Postventa",
  },
  {
    href: "/admin/postventa/administradores",
    label: "Administradores",
    icon: UserCheckIcon,
    group: "Postventa",
  },
  {
    href: "/admin/postventa/proveedores",
    label: "Proveedores",
    icon: ConciergeBellIcon,
    group: "Postventa",
  },
];

export function AdminSidebar({
  onNavigate,
  newInquiryCount = 0,
  newServiceInquiryCount = 0,
  newDevelopmentInquiryCount = 0,
  newOrderCount = 0,
  features,
  planInfo,
  agentPermissions,
}: {
  onNavigate?: () => void;
  newInquiryCount?: number;
  newServiceInquiryCount?: number;
  newDevelopmentInquiryCount?: number;
  newOrderCount?: number;
  features?: PlanFeatures;
  planInfo?: { name: string; canUpgrade: boolean } | null;
  agentPermissions?: AgentPermissions;
}) {
  const { storeName, logoUrl } = useStoreSettings();
  const { canInstall, promptInstall } = useAdminPwa();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const panel = searchParams.get("panel");
  const [query, setQuery] = useState("");
  const activeModule = platformModuleForPath(pathname);
  const moduleSections = activeModule === "consortium"
    ? consortiumSections
    : activeModule === "post_sale"
      ? postSaleSections
      : baseSections;
  const sections = moduleSections.filter((s) => {
    if (s.feature && features && !features[s.feature]) return false;
    if (!agentPermissions) return true;
    const section = AGENT_MENU_SECTIONS.find((item) => item.href === s.href);
    return Boolean(section && agentPermissions[section.key] !== "NONE");
  });
  const filtered = query.trim()
    ? sections.filter((s) =>
        s.label.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : sections;

  // La sección con sub-ítems se abre sola al entrar — pero una vez ahí, el
  // admin puede plegarla a mano sin que se reabra en cada click. Solo se
  // guarda como "override" mientras siga siendo la sección activa; al
  // navegar a otra, se vuelve a calcular desde cero.
  const activeParentHref =
    sections.find((s) => s.subitems && pathname.startsWith(s.href))?.href ??
    null;
  const [override, setOverride] = useState<{
    href: string;
    expanded: boolean;
  } | null>(null);
  const expandedHref =
    override && override.href === activeParentHref
      ? override.expanded
        ? activeParentHref
        : null
      : activeParentHref;

  // Agrupa los ítems consecutivos que comparten "group" bajo un mismo
  // encabezado, como en el sidebar de Cloudflare — sin group quedan sueltos
  // (Resumen, arriba de todo). Al filtrar por búsqueda se aplana: no tiene
  // sentido mostrar encabezados de grupos vacíos.
  const groups: { label: string | null; items: Section[] }[] = query.trim()
    ? [{ label: null, items: filtered }]
    : filtered.reduce<{ label: string | null; items: Section[] }[]>(
        (acc, s) => {
          const last = acc[acc.length - 1];
          const label = s.group ?? null;
          if (last && last.label === label) {
            last.items.push(s);
          } else {
            acc.push({ label, items: [s] });
          }
          return acc;
        },
        [],
      );

  return (
    <div className="flex flex-1 w-full flex-col text-sidebar-foreground">
      <div className="flex items-center gap-2 px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sidebar-accent">
          {logoUrl ? (
            <Image
              src={logoUrl}
              alt={storeName}
              width={32}
              height={32}
              className="size-full object-contain"
            />
          ) : (
            <StoreIcon className="size-4 text-sidebar-accent-foreground/70" />
          )}
        </span>
        <div className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold">{storeName}</span>
          <span className="text-xs text-sidebar-foreground/60">
            Panel inmobiliario
          </span>
        </div>
      </div>

      <div className="px-3 pb-2">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-sidebar-foreground/40" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar en el panel…"
            className="w-full rounded-lg border border-sidebar-border bg-sidebar-accent/40 py-1.5 pl-8 pr-2 text-xs text-sidebar-foreground placeholder:text-sidebar-foreground/40 outline-none focus:border-primary/50 focus:bg-sidebar-accent"
          />
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-2.5 overflow-y-auto px-3 py-1 pb-3">
        {groups.map((group, gi) => (
          <div key={group.label ?? `g${gi}`} className="flex flex-col gap-0.5">
            {group.label && (
              <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-sidebar-foreground/40">
                {group.label}
              </p>
            )}
            {group.items.map((s) => {
              const agentSection = agentPermissions
                ? AGENT_MENU_SECTIONS.find((item) => item.href === s.href)
                : undefined;
              const href = agentSection?.key === "inquiries"
                ? "/agente?channel=property"
                : agentSection?.key === "searches"
                  ? "/agente?channel=searches"
                  : s.href;
              // "Resumen" de cada módulo (/admin, /admin/consorcios,
              // /admin/postventa) es prefijo de TODAS sus propias
              // subpáginas — con startsWith quedaría marcado activo en
              // cualquier subsección del módulo. Exact match para esos,
              // startsWith para el resto.
              const active = MODULE_ROOT_HREFS.has(s.href)
                ? pathname === s.href
                : pathname.startsWith(s.href);
              const expanded = expandedHref === s.href;
              const Icon = s.icon;
              return (
                <div key={s.href} className="flex flex-col">
                  <Link
                    href={href}
                    onClick={() => {
                      onNavigate?.();
                      if (s.subitems)
                        setOverride({ href: s.href, expanded: !expanded });
                    }}
                    aria-expanded={s.subitems ? expanded : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="flex-1">{s.label}</span>
                    {(() => {
                      // "Consultas inmobiliarias" (EstateInquiry) y "Consultas
                      // de servicios" (ServiceInquiry) son bandejas distintas
                      // — antes las dos leían newInquiryCount y la de
                      // servicios nunca bajaba de 0 real, quedaba tildada.
                      const count =
                        s.href === "/admin/gestion/consultas"
                          ? newInquiryCount
                          : s.href === "/admin/consultas"
                            ? newServiceInquiryCount
                            : s.href === "/admin/gestion/consultas-emprendimientos"
                              ? newDevelopmentInquiryCount
                            : 0;
                      if (count <= 0) return null;
                      return (
                        <span
                          className={cn(
                            "flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                            active
                              ? "bg-primary-foreground/20 text-primary-foreground"
                              : "bg-primary text-primary-foreground",
                          )}
                        >
                          {count > 99 ? "99+" : count}
                        </span>
                      );
                    })()}
                    {s.href === "/admin/pedidos" && newOrderCount > 0 && (
                      <span
                        className={cn(
                          "flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold",
                          active
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-primary text-primary-foreground",
                        )}
                      >
                        {newOrderCount > 99 ? "99+" : newOrderCount}
                      </span>
                    )}
                    {s.subitems && (
                      <ChevronDownIcon
                        className={cn(
                          "size-3.5 shrink-0 opacity-70 transition-transform duration-200 ease-out",
                          expanded ? "rotate-0" : "-rotate-90",
                        )}
                      />
                    )}
                  </Link>
                  {s.subitems && (
                    <div
                      className={cn(
                        "grid transition-all duration-200 ease-out",
                        expanded
                          ? "grid-rows-[1fr] opacity-100"
                          : "grid-rows-[0fr] opacity-0",
                      )}
                    >
                      <div className="overflow-hidden">
                        <div className="ml-[1.15rem] flex flex-col gap-0 border-l border-sidebar-border py-0.5 pl-3.5">
                          {s.subitems.map((sub) => {
                            const subActive = panel === sub.panel;
                            return (
                              <Link
                                key={sub.href}
                                href={sub.href}
                                onClick={onNavigate}
                                className={cn(
                                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                                  subActive
                                    ? "text-primary"
                                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground",
                                )}
                              >
                                {sub.label}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border px-3 py-2">
        {planInfo && (
          <div className="mb-1 rounded-lg bg-sidebar-accent/50 px-3 py-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-sidebar-foreground/45">
              Tu plan
            </p>
            <p className="truncate text-sm font-semibold">{planInfo.name}</p>
            {planInfo.canUpgrade && (
              <a
                href="/admin/cuenta-urbi"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 flex items-center justify-center gap-1.5 rounded-md bg-primary py-1 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                <ArrowUpCircleIcon className="size-3.5" />
                Mejorar plan
              </a>
            )}
          </div>
        )}
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <StoreIcon className="size-4 shrink-0" />
          Ver sitio
        </Link>
        <a
          href="/admin/cuenta-urbi"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <ExternalLinkIcon className="size-4 shrink-0" />
          Panel de Urbi
        </a>
        {canInstall && (
          <button
            type="button"
            onClick={() => {
              promptInstall();
              onNavigate?.();
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <DownloadIcon className="size-4 shrink-0" />
            Instalar app
          </button>
        )}
      </div>
    </div>
  );
}
