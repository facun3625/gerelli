import Link from "next/link";
import { notFound } from "next/navigation";
import { Building2, CalendarDays, Check, MapPin } from "lucide-react";

import { StoreFooter } from "@/components/catalog/store-footer";
import { StoreHero } from "@/components/catalog/store-hero";
import { RichText } from "@/components/catalog/rich-text";
import { VideoPlayer } from "@/components/estate/video-player";
import { DevelopmentMapLoader } from "@/components/estate/development-map-loader";
import { ServiceCarousel } from "@/app/servicios/service-carousel";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { DevelopmentInquiryForm } from "../development-inquiry-form";

const STAGES: Record<string, string> = {
  PROJECT: "Proyecto",
  PRE_SALE: "Preventa",
  UNDER_CONSTRUCTION: "En obra",
  CONSTRUCTION: "En obra",
  READY: "Entrega inmediata",
  DELIVERED: "Entregado",
};
async function getDevelopment(id: string) {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();
  const development = await prisma.estateDevelopment.findFirst({
    where: { id, tenantId: tenant.id, published: true },
    include: {
      images: { orderBy: { order: "asc" } },
      fields: { orderBy: { order: "asc" } },
    },
  });
  if (!development) notFound();
  return development;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const development = await getDevelopment((await params).id);
  return {
    title: development.name,
    description: `${development.name} en ${development.city}`,
  };
}

export default async function DevelopmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const development = await getDevelopment((await params).id);
  return (
    <div className="public-inner-page public-detail-page flex flex-1 flex-col">
      <StoreHero />
      <main className="mx-auto w-full max-w-[1440px] flex-1">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
          <Link
            href="/emprendimientos"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Volver a emprendimientos
          </Link>
          <header className="public-enter mt-6">
            <div className="max-w-4xl">
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">
                {STAGES[development.stage] ?? development.stage}
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
                {development.name}
              </h1>
              <p className="mt-4 flex items-center gap-2 text-muted-foreground">
                <MapPin className="size-5" />
                {development.address}, {development.city}
              </p>
              {development.developer && (
                <p className="mt-2 flex items-center gap-2 text-muted-foreground">
                  <Building2 className="size-5" />
                  Desarrolla {development.developer}
                </p>
              )}
            </div>
            <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
              {development.progress !== null && (
                <div className="rounded-2xl bg-muted/60 p-4">
                  <p className="text-2xl font-semibold">
                    {development.progress}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Avance de obra
                  </p>
                </div>
              )}
              {development.estimatedDelivery && (
                <div className="rounded-2xl bg-muted/60 p-4">
                  <CalendarDays className="mb-2 size-5 text-primary" />
                  <p className="font-semibold">
                    {development.estimatedDelivery}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Entrega estimada
                  </p>
                </div>
              )}
            </div>
          </header>
          <div className="public-enter public-enter-delay-1 mt-10">
            <ServiceCarousel
              images={development.images}
              title={development.name}
              desktopItems={5}
            />
          </div>
          <div className="public-enter public-enter-delay-2 mt-9 grid items-start gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(340px,.8fr)]">
            <div className="space-y-8 rounded-2xl bg-muted/35 p-5 sm:p-7">
              <section className="min-w-0">
                <RichText
                  html={development.description}
                  columns={development.descriptionColumns}
                  className="text-muted-foreground"
                />
              </section>
              {development.amenities.length > 0 && (
                <section>
                  <h2 className="text-xl font-semibold">Amenities</h2>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {development.amenities.map((amenity) => (
                      <div
                        key={amenity}
                        className="flex items-center gap-2 rounded-xl bg-muted/50 p-3 text-sm"
                      >
                        <Check className="size-4 text-primary" />
                        {amenity}
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {development.financing && (
                <section className="rounded-2xl bg-muted/40 p-6">
                  <h2 className="text-xl font-semibold">
                    Opciones de financiación
                  </h2>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                    {development.financing}
                  </p>
                </section>
              )}
              {development.videoUrl && (
                <section>
                  <h2 className="mb-4 text-xl font-semibold">
                    Conocé el proyecto
                  </h2>
                  <VideoPlayer url={development.videoUrl} />
                </section>
              )}
            </div>
            <div className="min-w-0 space-y-5">
              {development.latitude && development.longitude && (
                <section className="overflow-hidden rounded-2xl border bg-card shadow-sm">
                  <div className="border-b px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">
                      Ubicación
                    </p>
                    <h2 className="mt-1 text-sm font-semibold">
                      {development.address}, {development.city}
                    </h2>
                  </div>
                  <div className="relative z-0 isolate h-64 overflow-hidden">
                    <DevelopmentMapLoader
                      latitude={Number(development.latitude)}
                      longitude={Number(development.longitude)}
                      name={development.name}
                      address={`${development.address}, ${development.city}`}
                    />
                  </div>
                </section>
              )}
              <DevelopmentInquiryForm
                developmentId={development.id}
                title={development.formTitle}
                submitLabel={development.submitLabel}
                fields={development.fields}
              />
            </div>
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
