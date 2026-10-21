import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, FileCheck2, LogIn, MessageSquare, Users } from "lucide-react";
import { DemoEmailForm } from "./demo-email-form";

const FEATURES: [typeof Building2, string][] = [
  [Building2, "Propiedades"],
  [Users, "Contactos"],
  [MessageSquare, "Visitas"],
  [FileCheck2, "Contratos"],
];

export const metadata: Metadata = { title: "Urbi · Inmobiliaria de ejemplo", description: "Recorré una página inmobiliaria de ejemplo creada con Urbi.", robots: { index: false, follow: false } };
export default function DemoPage() {
  return <div className="flex min-h-screen flex-col bg-[#133453] text-white">
    <div className="px-6 pt-6">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/60 transition hover:text-white">
        <ArrowLeft className="size-4" />Volver a Urbi
      </Link>
    </div>
    <section className="flex flex-1 items-center px-6 py-12 sm:py-16">
      <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="public-enter-side">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.14em] text-[#51c2ec]"><LogIn className="size-3.5"/>Entrá al panel real, ya mismo</p>
          <h1 className="mt-5 max-w-lg text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">Probá el panel de una inmobiliaria de verdad.</h1>
          <p className="mt-4 max-w-md leading-relaxed text-white/60">Dejanos tu email y entrás logueado como administrador a una cuenta con propiedades, contactos, visitas y contratos de ejemplo — sin instalar nada.</p>
          <ul className="mt-7 grid max-w-md grid-cols-2 gap-3">
            {FEATURES.map(([Icon, label], i) => (
              <li key={label} className={`public-enter public-enter-delay-${Math.min(i + 1, 3)} flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-white/80`}>
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#208ab1]"><Icon className="size-4 text-white"/></span>
                {label} de ejemplo
              </li>
            ))}
          </ul>
        </div>
        <div className="public-enter-side-right w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_30px_60px_-15px_rgba(0,0,0,.4)] backdrop-blur lg:ml-auto">
          <DemoEmailForm/>
          <p className="mt-4 text-xs text-white/40">Es una cuenta compartida de demostración: no cargues datos reales, se reinicia cada tanto.</p>
        </div>
      </div>
    </section>
  </div>;
}
