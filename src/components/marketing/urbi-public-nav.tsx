"use client";

import Image from "next/image";
import Link from "next/link";
import { ChevronDown, LogOut, Menu, X, User } from "lucide-react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { UrbiLoginDialog } from "@/components/marketing/urbi-login-dialog";
import { scrollToAnchor, handleAnchorNavClick } from "@/lib/anchor-scroll";
import { useMarketingSocial } from "@/components/marketing/marketing-social-context";
import { InstagramIcon } from "@/components/catalog/social-icons";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UrbiPublicNav() {
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const close = () => setOpen(false);
  const { data: session } = useSession();
  const pathname = usePathname();
  const { instagramUrl } = useMarketingSocial();

  // Al llegar a "/" con un hash en la URL (nav cruzado desde otra página, o
  // recargar/retroceder), corrige el scroll — scrollToAnchor ya reintenta
  // mientras el layout inicial (imágenes, fuentes) se termina de asentar.
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) scrollToAnchor(hash);
  }, []);

  function handleAnchorClick(event: React.MouseEvent<HTMLAnchorElement>, id: string) {
    close();
    handleAnchorNavClick(event, pathname, id);
  }

  // En el dominio raíz la sesión representa la cuenta central de Urbi. Un
  // dueño puede tener además otra sesión host-only en su subdominio, pero
  // solo se crea al elegir explícitamente "Ir al panel de mi tienda".
  const accountHref = session?.user?.role === "SUPER_ADMIN" ? "/platform" : "/mi-cuenta";
  const accountLabel = session?.user?.role === "SUPER_ADMIN" ? "Ir a la plataforma" : (session?.user?.name ?? "Mi cuenta");

  return (
    <header className="sticky top-0 z-40 border-b border-[#dce8ef] bg-white/95 backdrop-blur-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" onClick={close} className="flex shrink-0 items-center" aria-label="Urbi, inicio">
          <Image src="/brand/logo.svg" alt="Urbi" width={595} height={180} priority className="h-11 w-auto object-contain md:h-16" />
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-semibold text-[#133453] lg:flex">
          <Link href="/#clientes" onClick={(e) => handleAnchorClick(e, "clientes")} className="border-b-2 border-transparent py-2 transition-colors hover:border-[#208ab1] hover:text-[#208ab1]">CRM</Link>
          <Link href="/#ia" onClick={(e) => handleAnchorClick(e, "ia")} className="border-b-2 border-transparent py-2 transition-colors hover:border-[#208ab1] hover:text-[#208ab1]">Inteligencia artificial</Link>
          <Link href="/#precios" onClick={(e) => handleAnchorClick(e, "precios")} className="border-b-2 border-transparent py-2 transition-colors hover:border-[#208ab1] hover:text-[#208ab1]">Planes</Link>
          <Link href="/#socios" onClick={(e) => handleAnchorClick(e, "socios")} className="border-b-2 border-transparent py-2 transition-colors hover:border-[#208ab1] hover:text-[#208ab1]">Revendedores</Link>
          <Link href="/preguntas-frecuentes" className="border-b-2 border-transparent py-2 transition-colors hover:border-[#208ab1] hover:text-[#208ab1]">FAQs</Link>
          <Link href="/#contacto" onClick={(e) => handleAnchorClick(e, "contacto")} className="border-b-2 border-transparent py-2 transition-colors hover:border-[#208ab1] hover:text-[#208ab1]">Contacto</Link>
        </nav>

        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          {instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram de Urbi"
              className="flex size-9 items-center justify-center rounded-full text-[#133453] transition-colors hover:text-[#51c2ec]"
            >
              <InstagramIcon className="size-5" />
            </a>
          )}
          <Link href="/demo" className="urbi-btn border-[#d5e3ed]! bg-white! text-[#133453]! py-2! px-4! text-sm">Probar demo</Link>
          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button type="button" className="urbi-btn urbi-btn-primary py-2! px-5! text-sm" />
                }
              >
                <User className="size-4" />
                <span className="max-w-44 truncate">{accountLabel}</span>
                <ChevronDown className="size-3.5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-56 p-1.5">
                <DropdownMenuItem render={<Link href={accountHref} />} className="gap-2 py-2 text-sm">
                  <User className="size-4" />
                  {session.user.role === "SUPER_ADMIN" ? "Ir a la plataforma" : "Ir a mi panel"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  // <a> nativo a propósito, no <Link>: esta ruta hace
                  // varios redirects reales para borrar cookies de sesión
                  // en cada dominio, y necesita una navegación de página
                  // completa — con <Link>, Next la trata como transición
                  // interna y el estado de sesión en memoria (useSession)
                  // no se entera del cierre hasta que recargás a mano.
                  // eslint-disable-next-line @next/next/no-html-link-for-pages
                  render={<a href="/api/auth/logout-all" />}
                  className="gap-2 py-2 text-sm text-muted-foreground"
                >
                  <LogOut className="size-4" />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              {/* El acceso central se resuelve en un modal; /registro queda
                  reservado exclusivamente para crear una tienda nueva. */}
              <button type="button" onClick={() => setLoginOpen(true)} className="urbi-btn border-[#d5e3ed]! bg-white! text-[#133453]! py-2! px-4! text-sm">Iniciar sesión</button>
              <Link href="/registro" className="urbi-btn urbi-btn-primary py-2! px-5! text-sm">Empezar ahora</Link>
            </>
          )}
        </div>

        <button onClick={() => setOpen((value) => !value)} aria-label={open ? "Cerrar menú" : "Abrir menú"} className="-mr-2 shrink-0 p-2 text-[#133453] lg:hidden">
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-[#dce8ef] bg-white/98 backdrop-blur-lg lg:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            <Link href="/#clientes" onClick={(e) => handleAnchorClick(e, "clientes")} className="rounded-lg px-3 py-3 font-semibold text-[#133453] transition-colors hover:bg-[#edf5f9] hover:text-[#208ab1]">CRM inmobiliario</Link>
            <Link href="/#ia" onClick={(e) => handleAnchorClick(e, "ia")} className="rounded-lg px-3 py-3 font-semibold text-[#133453] transition-colors hover:bg-[#edf5f9] hover:text-[#208ab1]">Inteligencia artificial</Link>
            <Link href="/#precios" onClick={(e) => handleAnchorClick(e, "precios")} className="rounded-lg px-3 py-3 font-semibold text-[#133453] transition-colors hover:bg-[#edf5f9] hover:text-[#208ab1]">Planes</Link>
            <Link href="/#socios" onClick={(e) => handleAnchorClick(e, "socios")} className="rounded-lg px-3 py-3 font-semibold text-[#133453] transition-colors hover:bg-[#edf5f9] hover:text-[#208ab1]">Revendedores</Link>
            <Link href="/preguntas-frecuentes" onClick={close} className="rounded-lg px-3 py-3 font-semibold text-[#133453] transition-colors hover:bg-[#edf5f9] hover:text-[#208ab1]">Preguntas frecuentes</Link>
            <Link href="/#contacto" onClick={(e) => handleAnchorClick(e, "contacto")} className="rounded-lg px-3 py-3 font-semibold text-[#133453] transition-colors hover:bg-[#edf5f9] hover:text-[#208ab1]">Contacto</Link>
            <Link href="/demo" onClick={close} className="rounded-lg px-3 py-3 font-semibold text-[#51c2ec] transition-colors hover:bg-[#edf5f9] hover:text-[#208ab1]">Probar demo</Link>
            {instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={close}
                className="flex items-center gap-2 rounded-lg px-3 py-3 font-semibold text-[#133453] transition-colors hover:bg-[#edf5f9] hover:text-[#51c2ec]"
              >
                <InstagramIcon className="size-4" />
                Instagram
              </a>
            )}
            <div className="my-2 h-px bg-white/10" />
            {session?.user ? (
              <div className="grid gap-2">
                <Link href={accountHref} onClick={close} className="urbi-btn urbi-btn-primary w-full justify-center">
                  <User className="size-4" />
                  {accountLabel}
                </Link>
                      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a
                  href="/api/auth/logout-all"
                  className="urbi-btn border-[#d5e3ed]! bg-white! text-[#133453]! w-full justify-center"
                >
                  <LogOut className="size-4" />
                  Cerrar sesión
                </a>
              </div>
            ) : (
              <div className="grid gap-2">
                <button type="button" onClick={() => { close(); setLoginOpen(true); }} className="urbi-btn border-[#d5e3ed]! bg-white! text-[#133453]! w-full justify-center">Iniciar sesión</button>
                <Link href="/registro" onClick={close} className="urbi-btn urbi-btn-primary w-full justify-center">Empezar ahora</Link>
              </div>
            )}
          </nav>
        </div>
      )}

      <div className="h-px w-full bg-[#edf5f9]" />
      <UrbiLoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </header>
  );
}
