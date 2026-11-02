import Image from "next/image";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";

import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { ArquitecturaHeader } from "@/components/arquitectura/arquitectura-header";
import { ArquitecturaContact } from "@/components/arquitectura/arquitectura-contact";
import { ARQ_R2, SERVICES } from "@/lib/arquitectura";
import { getCurrentTenant } from "@/lib/tenant";
import { getStoreSettings } from "@/lib/settings";

export const metadata = {
  title: "Servicios · Arquitectura",
  description:
    "Asesoramiento, anteproyecto, proyecto ejecutivo y dirección de obra.",
};

export default async function ArquitecturaServiciosPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();
  const { phone, whatsapp } = await getStoreSettings(tenant.id);

  return (
    <div className="public-inner-page public-content-page flex flex-1 flex-col">
      <StoreHero />
      <ArquitecturaHeader
        active="/arquitectura/servicios"
        title="Servicios"
        subtitle="Te acompañamos en todo el proceso, desde la primera idea hasta la entrega de la obra."
        image={`${ARQ_R2}/equipo-3.webp`}
      />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col bg-background">
        <div className="flex flex-col gap-16 px-4 py-12 sm:px-6 lg:gap-20 lg:px-8 lg:py-16">
          <ol className="grid gap-5 md:grid-cols-2">
            {SERVICES.map((s, i) => (
              <li key={s.title} className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm sm:p-7">
                <div className="flex items-center gap-4">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <s.icon className="size-5" />
                  </span>
                  <div>
                    <span className="text-xs font-semibold tracking-widest text-primary">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h2 className="text-lg font-semibold leading-tight">{s.title}</h2>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
                  {s.paragraphs?.map((p) => <p key={p}>{p}</p>)}
                  {s.intro && <p>{s.intro}</p>}
                  {s.bullets && (
                    <ul className="flex flex-col gap-2">
                      {s.bullets.map((b) => (
                        <li key={b} className="flex gap-2.5">
                          <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            ))}
          </ol>

          {/* Collage de obras: se muestra entero (es una grilla de fotos,
              recortarlo corta las filas). */}
          <div className="relative mx-auto aspect-[1024/667] w-full max-w-4xl overflow-hidden rounded-2xl">
            <Image
              src={`${ARQ_R2}/servicios-1.webp`}
              alt="Obras realizadas por el estudio"
              fill
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-contain"
            />
          </div>

          <ArquitecturaContact phone={phone} whatsapp={whatsapp} />
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
