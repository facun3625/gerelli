"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { useStoreSettings } from "@/lib/store-settings-context";

export function StoreNav() {
  const pathname = usePathname();
  const { hasServices, hasDevelopments } = useStoreSettings();
  const links = [
    { href: "/", label: "Inicio" },
    { href: "/sobre-nosotros", label: "Nosotros" },
    ...(hasServices ? [{ href: "/servicios", label: "Servicios" }] : []),
    ...(hasDevelopments
      ? [{ href: "/emprendimientos", label: "Emprendimientos" }]
      : []),
    { href: "/mapa", label: "Propiedades en mapa" },
    { href: "/alertas", label: "Recibir alertas" },
    { href: "#hablemos-hoy", label: "Contacto" },
  ];

  return (
    <nav
      aria-label="Navegación principal"
      className="flex items-center gap-0.5"
    >
      {links.map((link) => {
        const active =
          link.href === "/"
            ? pathname === "/"
            : !link.href.startsWith("#") && pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex min-h-14 items-center whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-[13px] font-medium text-current opacity-80 transition-[opacity,border-color] duration-200 hover:border-current/70 hover:opacity-100 xl:px-4 xl:text-sm",
              active && "border-current font-semibold opacity-100",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
