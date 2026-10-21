import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/require-admin";
import { ProductEditor } from "./product-editor";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { tenant } = await requireTenantAdmin();

  const [product, categories, stockGroups] = await Promise.all([
    prisma.product.findUnique({
      where: { id, tenantId: tenant.id },
      include: {
        variants: { orderBy: { order: "asc" } },
        images: { orderBy: { order: "asc" } },
      },
    }),
    prisma.productCategory.findMany({ where: { tenantId: tenant.id }, orderBy: { name: "asc" } }),
    // Solo los pozos con 2+ miembros sirven para "compartir" — los
    // individuales de otras variantes no se listan acá.
    prisma.stockGroup.findMany({
      where: { tenantId: tenant.id },
      include: { _count: { select: { variants: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!product) notFound();

  // isIndividual, no cantidad de miembros: un grupo creado a mano desde
  // "Grupos de stock" arranca en 0 miembros, así que filtrar por 2+ lo
  // dejaba imposible de elegir la primera vez.
  const sharedStockGroups = stockGroups.filter((g) => !g.isIndividual);

  return (
    <ProductEditor
      key={product.updatedAt.toISOString()}
      product={{
        id: product.id,
        name: product.name,
        description: product.description,
        categoryId: product.categoryId,
        active: product.active,
        featured: product.featured,
        contactToBuy: product.contactToBuy,
        tags: product.tags,
        variants: product.variants.map((v) => ({
          id: v.id,
          gusto: v.gusto,
          tamano: v.tamano,
          sku: v.sku,
          price: v.price.toString(),
          active: v.active,
          stockGroupId: v.stockGroupId,
        })),
        images: product.images.map((i) => ({ id: i.id, url: i.url })),
      }}
      categories={categories}
      stockGroups={sharedStockGroups.map((g) => ({ id: g.id, name: g.name }))}
    />
  );
}
