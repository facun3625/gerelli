import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { ARQ_R2, ARQ_SECTIONS } from "@/lib/arquitectura";

// Portada + solapas compartidas por /arquitectura/equipo, /servicios y /obras.
export function ArquitecturaHeader({
  active,
  title,
  subtitle,
  image = `${ARQ_R2}/equipo-2.webp`,
}: {
  active: (typeof ARQ_SECTIONS)[number]["href"];
  title: string;
  subtitle: string;
  image?: string;
}) {
  return (
    <>
      <section className="relative h-[clamp(15rem,30vw,20rem)] overflow-hidden bg-foreground">
        <Image src={image} alt="" fill priority sizes="100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/10" />
        <div className="relative mx-auto flex h-full w-full max-w-[1440px] items-end px-4 pb-8 sm:px-6 lg:px-8 lg:pb-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.3em] text-white/70">
              Arquitectura
            </p>
            <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/80 sm:text-base">{subtitle}</p>
          </div>
        </div>
      </section>

      <nav aria-label="Secciones de arquitectura" className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-[1440px] gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
          {ARQ_SECTIONS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              aria-current={s.href === active ? "page" : undefined}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-4 py-3.5 text-sm font-medium transition-colors",
                s.href === active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
