import { prisma } from "@/lib/prisma";
import { requirePostSaleStaff } from "@/lib/require-post-sale-admin";
import { CatalogEditor } from "@/components/estate/post-sale-catalog-editor";
import {
  createDefaultSection,
  deleteDefaultSection,
  createDefaultRubro,
  deleteDefaultRubro,
} from "./actions";

export default async function PostSaleCatalogPage() {
  const { tenant, session } = await requirePostSaleStaff();

  const sections = await prisma.postSaleSection.findMany({
    where: { tenantId: tenant.id, developmentId: null },
    orderBy: { order: "asc" },
    include: {
      rubros: { orderBy: [{ isCatchAll: "asc" }, { order: "asc" }] },
    },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Posventa</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Catálogo por defecto</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Secciones y rubros que se copian a cada desarrollo nuevo. Editar acá no afecta a los
          desarrollos que ya tienen su propia copia.
        </p>
      </header>

      <CatalogEditor
        sections={sections}
        readOnly={session.user.role !== "ADMIN"}
        createSectionAction={createDefaultSection}
        deleteSectionAction={deleteDefaultSection}
        createRubroAction={createDefaultRubro}
        deleteRubroAction={deleteDefaultRubro}
      />
    </div>
  );
}
