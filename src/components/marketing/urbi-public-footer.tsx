"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mail } from "lucide-react";
import { InstagramIcon } from "@/components/catalog/social-icons";
import { handleAnchorNavClick } from "@/lib/anchor-scroll";
import { useMarketingSocial } from "@/components/marketing/marketing-social-context";

const linkClass = "text-sm text-[#9ca3af] transition-colors hover:text-white";
const headingClass = "text-xs font-bold uppercase tracking-[.12em] text-white/40";

export function UrbiPublicFooter() {
  const pathname = usePathname();
  const { instagramUrl } = useMarketingSocial();

  return (
    <footer className="border-t border-white/5 bg-[#030712] text-white">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="col-span-2 md:col-span-1">
            <Image src="/logo_blanco.svg" alt="Urbi" width={595} height={180} className="h-7 w-auto object-contain" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[#9ca3af]">Tu página web inmobiliaria por un plan mensual. Tu marca, tus propiedades y la tecnología de Urbi.</p>
            <Link href="/#contacto" className={`mt-5 flex items-center gap-2 ${linkClass}`}><Mail className="size-4" />Contactar al equipo</Link>
            {instagramUrl && (
              <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className={`mt-2 flex items-center gap-2 ${linkClass}`}>
                <InstagramIcon className="size-4 shrink-0" />
                Instagram
              </a>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <span className={headingClass}>Producto</span>
            <Link href="/#funcionalidades" onClick={(e) => handleAnchorNavClick(e, pathname, "funcionalidades")} className={linkClass}>Funcionalidades</Link>
            <Link href="/#clientes" onClick={(e) => handleAnchorNavClick(e, pathname, "clientes")} className={linkClass}>Para quién es</Link>
            <Link href="/#precios" onClick={(e) => handleAnchorNavClick(e, pathname, "precios")} className={linkClass}>Precios</Link>
          </div>

          <div className="flex flex-col gap-3">
            <span className={headingClass}>Empresa</span>
            <Link href="/revendedores" className={linkClass}>Revendedores y socios</Link>
            <Link href="/preguntas-frecuentes" className={linkClass}>Preguntas frecuentes</Link>
            <Link href="/#contacto" onClick={(e) => handleAnchorNavClick(e, pathname, "contacto")} className={linkClass}>Contacto</Link>
          </div>

          <div className="flex flex-col gap-3">
            <span className={headingClass}>Legal</span>
            <Link href="/terminos" className={linkClass}>Términos</Link>
            <Link href="/privacidad" className={linkClass}>Privacidad</Link>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/5 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs text-[#9ca3af]">© {new Date().getFullYear()} Urbi. Todos los derechos reservados.</span>
          <a href="https://kubbo.com.ar" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-xs text-[#9ca3af] transition hover:text-white">
            <span>Desarrollo de</span>
            <Image src="/logo.png" alt="Kubbo" width={1767} height={631} className="h-5 w-auto object-contain" />
          </a>
        </div>
      </div>
    </footer>
  );
}
