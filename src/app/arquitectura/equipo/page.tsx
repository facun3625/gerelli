import Image from "next/image";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";

import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { AboutGallery } from "@/components/catalog/about-gallery";
import { ArquitecturaHeader } from "@/components/arquitectura/arquitectura-header";
import { ArquitecturaContact } from "@/components/arquitectura/arquitectura-contact";
import { ARQ_R2, PILLARS, TEAM_GALLERY, TRAITS } from "@/lib/arquitectura";
import { getCurrentTenant } from "@/lib/tenant";
import { getStoreSettings } from "@/lib/settings";

export const metadata = {
  title: "Equipo · Arquitectura",
  description:
    "Equipo interdisciplinario que integra inmobiliaria y estudio de arquitectura.",
};

export default async function ArquitecturaEquipoPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();
  const { phone, whatsapp } = await getStoreSettings(tenant.id);

  return (
    <div className="public-inner-page public-content-page flex flex-1 flex-col">
      <StoreHero />
      <ArquitecturaHeader
        active="/arquitectura/equipo"
        title="Equipo"
        subtitle="Varias generaciones de profesionales integrando inmobiliaria y estudio de arquitectura."
      />
      <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col bg-background">
        <div className="flex flex-col gap-16 px-4 py-12 sm:px-6 lg:gap-20 lg:px-8 lg:py-16">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <h2 className="text-2xl font-semibold sm:text-3xl">Un equipo interdisciplinario</h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground lg:text-lg">
                Somos un <strong className="text-foreground">equipo interdisciplinario</strong> de
                varias generaciones de profesionales que integramos Inmobiliaria y Estudio de
                Arquitectura. Nos dedicamos al diseño integral de proyectos arquitectónicos,
                dirección, gestión y desarrollos inmobiliarios.
              </p>
              <h3 className="mt-8 text-sm font-semibold uppercase tracking-wide text-foreground">
                Nos caracteriza
              </h3>
              <ul className="mt-4 flex flex-col gap-3">
                {TRAITS.map((t) => (
                  <li key={t} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Check className="size-3.5" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl shadow-xl">
              <Image
                src={`${ARQ_R2}/equipo-portada.webp`}
                alt="Equipo de Gerelli Correnti"
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {PILLARS.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border bg-muted/30 p-6 transition-[border-color,background-color,box-shadow] duration-200 hover:border-primary/30 hover:bg-card hover:shadow-sm"
              >
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <p.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{p.text}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-center text-lg font-semibold lg:text-left">Nuestro espacio</h2>
            <AboutGallery media={TEAM_GALLERY} />
          </div>

          <ArquitecturaContact phone={phone} whatsapp={whatsapp} />
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
