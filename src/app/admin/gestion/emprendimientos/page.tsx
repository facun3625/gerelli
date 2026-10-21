import Image from "next/image";
import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/require-admin";
import { DevelopmentRowActions } from "./development-row-actions";

const STAGES: Record<string, string> = {
  PROJECT: "Proyecto",
  PRE_SALE: "Preventa",
  UNDER_CONSTRUCTION: "En obra",
  READY: "Entrega inmediata",
  DELIVERED: "Entregado",
};

export default async function DevelopmentsAdminPage() {
  const { tenant } = await requireTenantAdmin();
  const developments = await prisma.estateDevelopment.findMany({
    where: { tenantId: tenant.id },
    include: {
      images: { orderBy: { order: "asc" }, take: 1 },
      _count: { select: { inquiries: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Emprendimientos</h1>
          <p className="text-sm text-muted-foreground">
            Creá páginas comerciales para tus proyectos inmobiliarios.
          </p>
        </div>
        <Button
          render={<Link href="/admin/gestion/emprendimientos/nuevo" />}
          size="sm"
        >
          Nuevo emprendimiento
        </Button>
      </div>
      <div className="flex flex-col gap-3">
        {developments.map((development) => {
          const summary = DOMPurify.sanitize(development.description, {
            ALLOWED_TAGS: [],
          })
            .replace(/\s+/g, " ")
            .trim();
          return (
            <article
              key={development.id}
              className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center"
            >
              <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-muted sm:w-28">
                {development.images[0] && (
                  <Image
                    src={development.images[0].url}
                    alt=""
                    fill
                    className="object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-semibold">{development.name}</h2>
                  <Badge
                    variant={development.published ? "default" : "secondary"}
                  >
                    {development.published ? "Publicado" : "Borrador"}
                  </Badge>
                  <Badge variant="outline">
                    {STAGES[development.stage] ?? development.stage}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {development.city} · {development.address}
                </p>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {summary || "Sin descripción"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {development._count.inquiries} consultas recibidas
                </p>
              </div>
              <DevelopmentRowActions
                id={development.id}
                name={development.name}
              />
            </article>
          );
        })}
        {!developments.length && (
          <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
            Todavía no cargaste emprendimientos. La sección pública permanecerá
            oculta hasta que publiques el primero.
          </p>
        )}
      </div>
    </div>
  );
}
