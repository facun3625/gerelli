import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { CatalogEditor } from "@/components/estate/post-sale-catalog-editor";
import { CustomizeCatalogButton } from "@/components/estate/post-sale-customize-catalog-button";
import {
  createInstanceSection,
  deleteInstanceSection,
  createInstanceRubro,
  deleteInstanceRubro,
  setDevelopmentCatalogCustomized,
} from "../actions";

export default async function PostSaleDevelopmentCatalogPage({
  params,
}: {
  params: Promise<{ developmentId: string }>;
}) {
  const { developmentId } = await params;
  const { tenant, assignedDevelopmentIds } = await requirePostSaleStaff();
  if (assignedDevelopmentIds && !assignedDevelopmentIds.includes(developmentId)) notFound();

  const development = await prisma.postSaleDevelopment.findFirst({
    where: { id: developmentId, tenantId: tenant.id },
    select: { id: true, catalogCustomized: true },
  });
  if (!development) notFound();

  const sections = await prisma.postSaleSection.findMany({
    where: { tenantId: tenant.id, developmentId },
    orderBy: { order: "asc" },
    include: { rubros: { orderBy: [{ isCatchAll: "asc" }, { order: "asc" }] } },
  });

  if (!development.catalogCustomized) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border bg-muted/20 p-5">
          <h2 className="font-semibold">Este desarrollo sigue el catálogo estándar</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Usa las mismas secciones y rubros que el catálogo por defecto de la constructora. Si
            este desarrollo necesita algo distinto (secciones propias, rubros que no aplican acá),
            personalizalo — es una decisión que no se puede deshacer sola después.
          </p>
          <div className="mt-4">
            <CustomizeCatalogButton action={setDevelopmentCatalogCustomized.bind(null, developmentId)} />
          </div>
        </div>

        <CatalogEditor
          sections={sections}
          readOnly
          createSectionAction={createInstanceSection.bind(null, developmentId)}
          deleteSectionAction={deleteInstanceSection.bind(null, developmentId)}
          createRubroAction={createInstanceRubro.bind(null, developmentId)}
          deleteRubroAction={deleteInstanceRubro.bind(null, developmentId)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
        Catálogo personalizado para este desarrollo — los cambios acá no afectan al estándar ni a
        otros desarrollos.
      </p>

      <CatalogEditor
        sections={sections}
        createSectionAction={createInstanceSection.bind(null, developmentId)}
        deleteSectionAction={deleteInstanceSection.bind(null, developmentId)}
        createRubroAction={createInstanceRubro.bind(null, developmentId)}
        deleteRubroAction={deleteInstanceRubro.bind(null, developmentId)}
      />
    </div>
  );
}
