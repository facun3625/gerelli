import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, BadgeDollarSignIcon, ImageIcon, MapPinIcon, Tags, TextIcon } from "lucide-react";
import { requireTenantAdmin } from "@/lib/require-admin";
import { estateRows, estateOptions } from "@/lib/estate/data";
import { RecordForm } from "@/components/estate/record-form";
import { SectionNav } from "@/components/estate/section-nav";

const NAV_ITEMS = [
  { id: "section-publicacion", label: "Publicación", icon: <TextIcon className="size-4" /> },
  { id: "section-precio", label: "Precio y características", icon: <BadgeDollarSignIcon className="size-4" /> },
  { id: "section-ubicacion", label: "Ubicación", icon: <MapPinIcon className="size-4" /> },
  { id: "section-media", label: "Fotos, video y plano", icon: <ImageIcon className="size-4" /> },
];

export default async function EditarPropiedadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { tenant } = await requireTenantAdmin();
  const { id } = await params;
  const [options, [record]] = await Promise.all([
    estateOptions(tenant.id),
    estateRows("propiedades", tenant.id, "", 0, id),
  ]);
  if (!record) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/gestion/propiedades"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Propiedades
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            {record.title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/gestion/categorias"
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium"
          >
            <Tags className="size-4" />
            Categorías
          </Link>
          {record.values.published === true && (
            <Link
              href={`/propiedades/${record.id}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium"
            >
              Ver publicación
              <ArrowUpRight className="size-4" />
            </Link>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[210px_1fr]">
        <SectionNav items={NAV_ITEMS} />
        <section className="min-w-0 rounded-2xl border bg-card p-5 sm:p-7">
          <RecordForm
            module="propiedades"
            id={record.id}
            values={record.values}
            media={record.media}
            options={options}
          />
        </section>
      </div>
    </div>
  );
}
