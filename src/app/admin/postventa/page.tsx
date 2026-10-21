import Link from "next/link";
import { ArrowUpRight, Building2, LayoutGrid, ListChecks, Users } from "lucide-react";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";

export default async function PostSaleHomePage() {
  const { tenant, assignedDevelopmentIds } = await requirePostSaleStaff();
  const developmentScope = assignedDevelopmentIds
    ? { id: { in: assignedDevelopmentIds } }
    : {};

  const [developments, units, owners, claims] = await Promise.all([
    prisma.postSaleDevelopment.count({ where: { tenantId: tenant.id, ...developmentScope } }),
    prisma.postSaleUnit.count({
      where: {
        tenantId: tenant.id,
        development: developmentScope,
      },
    }),
    prisma.postSaleContact.count({ where: { tenantId: tenant.id, kind: "OWNER" } }),
    prisma.postSaleClaim.count({
      where: {
        tenantId: tenant.id,
        ...(assignedDevelopmentIds ? { developmentId: { in: assignedDevelopmentIds } } : {}),
      },
    }),
  ]);

  const cards = [
    { label: "Desarrollos", value: developments, icon: Building2, href: "desarrollos" },
    { label: "Unidades", value: units, icon: LayoutGrid, href: "desarrollos" },
    { label: "Propietarios", value: owners, icon: Users, href: "desarrollos" },
    { label: "Reclamos", value: claims, icon: ListChecks, href: "reclamos" },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Posventa</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Administración de posventa</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Desarrollos, unidades, propietarios y reclamos de entrega, todo separado de Inmobiliaria.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={`/admin/postventa/${c.href}`}
            className="group rounded-2xl border bg-card p-5 transition hover:border-primary/40"
          >
            <div className="flex justify-between">
              <c.icon className="size-5 text-primary" />
              <ArrowUpRight className="size-4 text-muted-foreground" />
            </div>
            <p className="mt-5 text-3xl font-semibold">{c.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{c.label}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Primeros pasos</h2>
        <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
          <li>
            1. Revisá el{" "}
            <Link href="/admin/postventa/catalogo" className="text-primary">
              catálogo de secciones y rubros
            </Link>{" "}
            por defecto.
          </li>
          <li>
            2. Dado de alta un{" "}
            <Link href="/admin/postventa/desarrollos" className="text-primary">
              desarrollo
            </Link>{" "}
            con sus unidades — copia el catálogo automáticamente.
          </li>
          <li>3. Cargá los propietarios de cada unidad con su DNI.</li>
        </ol>
      </section>
    </div>
  );
}
