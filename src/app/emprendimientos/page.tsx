import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Building2, MapPin } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";

import { StoreFooter } from "@/components/catalog/store-footer";
import { StoreHero } from "@/components/catalog/store-hero";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";

const STAGES: Record<string, string> = {
  PROJECT: "Proyecto",
  PRE_SALE: "Preventa",
  UNDER_CONSTRUCTION: "En obra",
  CONSTRUCTION: "En obra",
  READY: "Entrega inmediata",
  DELIVERED: "Entregado",
};

export const metadata = { title: "Emprendimientos" };
export default async function DevelopmentsPage() {
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();
  const developments = await prisma.estateDevelopment.findMany({
    where: { tenantId: tenant.id, published: true },
    include: { images: { orderBy: { order: "asc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });
  if (!developments.length) notFound();
  return (
    <div className="public-inner-page public-collection-page flex flex-1 flex-col">
      <StoreHero />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <header className="public-enter mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">
            Nuevos proyectos
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Emprendimientos
          </h1>
          <p className="mt-3 text-muted-foreground">
            Conocé nuestros proyectos, su avance y las alternativas comerciales
            disponibles.
          </p>
        </header>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {developments.map((development) => {
            const summary = DOMPurify.sanitize(development.description, {
              ALLOWED_TAGS: [],
            })
              .replace(/\s+/g, " ")
              .trim();
            return (
              <Link
                key={development.id}
                href={`/emprendimientos/${development.id}`}
                className="estate-development-card public-scroll-reveal group flex h-full min-w-0 flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-[box-shadow,border-color,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-primary/25 hover:shadow-[0_14px_34px_-22px_rgba(15,23,42,0.38)]"
              >
                <div className="estate-development-card-media relative aspect-[4/3] overflow-hidden bg-muted">
                  {development.images[0] ? (
                    <Image
                      src={development.images[0].url}
                      alt={development.name}
                      fill
                      sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, (max-width:1280px) 33vw, 25vw"
                      className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.085]"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Building2 className="size-12 text-muted-foreground/40" />
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-background/90 px-2.5 py-1 text-[11px] font-semibold shadow-sm backdrop-blur">
                    {STAGES[development.stage] ?? development.stage}
                  </span>
                </div>
                <div className="estate-development-card-body flex flex-1 flex-col p-4 sm:p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {development.developer || "Emprendimiento"}
                  </p>
                  <h2 className="mt-1.5 line-clamp-2 min-h-12 text-base font-semibold leading-6 transition-colors duration-300 group-hover:text-primary">
                    {development.name}
                  </h2>
                  <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" />
                    <span className="truncate">{development.city}</span>
                  </p>
                  <p className="mt-3 line-clamp-2 min-h-10 text-xs leading-5 text-muted-foreground">
                    {summary}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-2 border-t pt-3 text-sm font-semibold text-primary">
                    Ver emprendimiento{" "}
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
