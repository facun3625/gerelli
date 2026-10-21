import Link from "next/link";
import { notFound } from "next/navigation";
import { StoreHero } from "@/components/catalog/store-hero";
import { StoreFooter } from "@/components/catalog/store-footer";
import { RichText } from "@/components/catalog/rich-text";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { cn } from "@/lib/utils";
import { ServiceCarousel } from "../service-carousel";
import { ServiceInquiryForm } from "../service-inquiry-form";

export default async function ServicesPage({
  params,
}: {
  params: Promise<{ id?: string[] }>;
}) {
  const { id } = await params;
  const tenant = await getCurrentTenant();
  if (!tenant) notFound();
  const services = await prisma.service.findMany({
    where: { tenantId: tenant.id, active: true },
    include: {
      fields: { orderBy: { order: "asc" } },
      images: { orderBy: { order: "asc" } },
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
  });
  if (!services.length) notFound();
  if (id && id.length > 1) notFound();
  const current = id?.length
    ? services.find((service) => service.id === id[0])
    : services[0];
  if (!current) notFound();

  return (
    <div className="public-inner-page public-service-page flex flex-1 flex-col">
      <StoreHero />
      <main className="mx-auto w-full max-w-[1440px] flex-1 bg-background">
        <div className="grid gap-7 px-4 py-9 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 lg:py-12">
          <aside className="public-enter-side flex max-w-full snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:sticky lg:top-20 lg:flex-col lg:self-start lg:overflow-visible lg:pb-0">
            {services.map((service) => (
              <Link
                key={service.id}
                href={`/servicios/${service.id}`}
                aria-current={service.id === current.id ? "page" : undefined}
                className={cn(
                  "snap-start whitespace-nowrap rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200",
                  service.id === current.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/60 text-muted-foreground hover:bg-muted",
                )}
              >
                {service.title}
              </Link>
            ))}
          </aside>

          <div className="flex min-w-0 flex-col gap-10">
            <div className="public-enter public-enter-delay-1 grid items-start gap-7 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)]">
              <section className="min-w-0 rounded-2xl bg-muted/30 p-5 lg:p-7">
                <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
                  Servicios
                </p>
                <h1 className="text-[clamp(1.8rem,5vw,2.5rem)] font-bold tracking-tight">
                  {current.title}
                </h1>
                <RichText
                  html={current.description}
                  columns={current.descriptionColumns}
                  className="mt-5 leading-relaxed text-muted-foreground"
                />
              </section>
              <ServiceInquiryForm
                serviceId={current.id}
                title={current.formTitle}
                submitLabel={current.submitLabel}
                fields={current.fields}
              />
            </div>
            <div className="public-enter public-enter-delay-2">
              <ServiceCarousel images={current.images} title={current.title} />
            </div>
          </div>
        </div>
      </main>
      <StoreFooter />
    </div>
  );
}
