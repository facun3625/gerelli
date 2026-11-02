"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useStoreSettings } from "@/lib/store-settings-context";
import { ARQ_SECTIONS } from "@/lib/arquitectura";

const linkClass =
  "flex min-h-14 items-center whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-[13px] font-medium text-current opacity-80 transition-[opacity,border-color] duration-200 hover:border-current/70 hover:opacity-100 xl:px-4 xl:text-sm";

export function StoreNav() {
  const pathname = usePathname();
  const { hasServices } = useStoreSettings();
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : !href.startsWith("#") && pathname.startsWith(href);

  const before = [
    { href: "/", label: "Inicio" },
    { href: "/sobre-nosotros", label: "Nosotros" },
  ];
  const after = [
    ...(hasServices ? [{ href: "/servicios", label: "Servicios" }] : []),
    { href: "/mapa", label: "Propiedades en mapa" },
    { href: "/alertas", label: "Recibir alertas" },
    { href: "#hablemos-hoy", label: "Contacto" },
  ];
  const renderLink = (link: { href: string; label: string }) => (
    <Link
      key={link.href}
      href={link.href}
      className={cn(linkClass, isActive(link.href) && "border-current font-semibold opacity-100")}
    >
      {link.label}
    </Link>
  );

  return (
    <nav aria-label="Navegación principal" className="flex items-center gap-0.5">
      {before.map(renderLink)}

      {/* Desplegable de Arquitectura: se abre con hover y con foco de
          teclado (focus-within); el link principal lleva a la primera
          sección para que en pantallas táctiles también funcione. */}
      <div className="group relative">
        <Link
          href={ARQ_SECTIONS[0].href}
          aria-haspopup="true"
          className={cn(
            linkClass,
            "gap-1",
            isActive("/arquitectura") && "border-current font-semibold opacity-100",
          )}
        >
          Arquitectura
          <ChevronDownIcon className="size-3.5 transition-transform duration-200 group-hover:rotate-180 group-focus-within:rotate-180" />
        </Link>
        <div className="invisible absolute left-0 top-full z-50 min-w-48 translate-y-1 pt-1 opacity-0 transition-[opacity,transform,visibility] duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
          <div className="rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg">
            {ARQ_SECTIONS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm transition-colors hover:bg-muted",
                  isActive(s.href) && "bg-primary/10 font-semibold text-primary",
                )}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {after.map(renderLink)}
    </nav>
  );
}
