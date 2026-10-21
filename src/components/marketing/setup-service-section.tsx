"use client";

import { ArrowRight, HammerIcon } from "lucide-react";

import { formatPrice } from "@/lib/format";
import { useSalesChat } from "./sales-chat-widget";

export function SetupServiceSection({ price, steps }: { price: number; steps: string[] }) {
  const { openWithTopic } = useSalesChat();

  function handleClick() {
    openWithTopic(
      "SETUP_SERVICE",
      "¡Buenísimo! Armamos tu inmobiliaria por vos. Dejanos tu nombre y WhatsApp y coordinamos todo.",
    );
  }

  return (
    <section id="armamos-por-vos" className="scroll-mt-24 bg-[#133453] py-24 text-white">
      <div className="mx-auto max-w-4xl px-6 text-center">
        <span className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-[#208ab1]">
          <HammerIcon className="size-6 text-white" />
        </span>
        <p className="mb-2 text-xs font-bold uppercase tracking-[.18em] text-[#51c2ec]">¿No sabés armar tu inmobiliaria?</p>
        <h2 className="text-3xl font-extrabold tracking-tight">Contactanos y la armamos por vos</h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/60">
          Te ayudamos a configurar la identidad del sitio y cargar tus primeras propiedades. Coordinamos el alcance y los tiempos con vos. Es un pago único, independiente de tu suscripción.
        </p>

        {steps.length > 0 && (
          <ol className="mx-auto mt-10 grid gap-4 text-left sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step, i) => (
              <li key={i} className="rounded-xl border border-white/10 bg-white/5 p-5">
                <span className="flex size-8 items-center justify-center rounded-full bg-[#208ab1] text-sm font-bold text-white">
                  {i + 1}
                </span>
                <p className="mt-3 text-sm leading-relaxed text-white/70">{step}</p>
              </li>
            ))}
          </ol>
        )}

        <div className="mt-10 flex flex-col items-center gap-4">
          <p className="text-3xl font-extrabold">{formatPrice(price)}</p>
          <button type="button" onClick={handleClick} className="inline-flex h-12 items-center gap-2 rounded-xl bg-[#208ab1] px-6 text-base font-bold text-white shadow-[0_10px_30px_-6px_rgba(32,138,177,.5)] transition hover:bg-[#1e658c] hover:-translate-y-0.5">
            Sí, armámela <ArrowRight className="size-[18px]" />
          </button>
        </div>
      </div>
    </section>
  );
}
