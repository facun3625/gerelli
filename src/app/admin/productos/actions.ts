"use server";

import { ActionError, toUserError } from "@/lib/action-error";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireTenantAdmin } from "@/lib/require-admin";
import { saveUploadedFile } from "@/lib/storage";

// ---------- Categorías ----------

const categorySchema = z.object({
  name: z.string().min(1, "Ingresá un nombre"),
  icon: z.string().optional(),
});

export async function createCategory(formData: FormData) {
  try {
    return await runCreateCategory(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el producto");
  }
}

async function runCreateCategory(formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  const parsed = categorySchema.parse({
    name: formData.get("name"),
    icon: formData.get("icon") || undefined,
  });
  await prisma.productCategory.create({
    data: { tenantId: tenant.id, name: parsed.name, icon: parsed.icon ?? null },
  });
  revalidatePath("/admin/productos");
  return { ok: true as const };
}

export async function renameCategory(id: string, formData: FormData) {
  try {
    return await runRenameCategory(id, formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el producto");
  }
}

async function runRenameCategory(id: string, formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  const parsed = categorySchema.parse({
    name: formData.get("name"),
    icon: formData.get("icon") || undefined,
  });
  await prisma.productCategory.update({
    where: { id, tenantId: tenant.id },
    data: { name: parsed.name, icon: parsed.icon ?? null },
  });
  revalidatePath("/admin/productos");
  return { ok: true as const };
}

export async function toggleCategoryActive(id: string, active: boolean) {
  try {
    return await runToggleCategoryActive(id, active);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el producto");
  }
}

async function runToggleCategoryActive(id: string, active: boolean) {
  const { tenant } = await requireTenantAdmin();
  await prisma.productCategory.update({ where: { id, tenantId: tenant.id }, data: { active } });
  revalidatePath("/admin/productos");
  revalidatePath("/");
  return { ok: true as const };
}

export async function deleteCategory(id: string) {
  try {
    return await runDeleteCategory(id);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el producto");
  }
}

async function runDeleteCategory(id: string) {
  const { tenant } = await requireTenantAdmin();
  const productCount = await prisma.product.count({ where: { categoryId: id, tenantId: tenant.id } });
  if (productCount > 0) {
    throw new ActionError("No se puede borrar una categoría con productos. Movelos o borralos primero.");
  }
  await prisma.productCategory.delete({ where: { id, tenantId: tenant.id } });
  revalidatePath("/admin/productos");
  return { ok: true as const };
}

// ---------- Grupos de stock ----------

const stockGroupSchema = z.object({
  name: z.string().min(1, "Ingresá un nombre"),
  defaultStockQuantity: z.coerce.number().int().nonnegative().nullable().optional(),
});

// StockGroup tiene @@unique([tenantId, name]) — sin este chequeo, crear o
// renombrar a un nombre repetido tira la excepción cruda de Prisma, que en
// producción Next.js redacta a un "Minified React error #441" sin
// contenido útil para quien lo ve.
function isUniqueConstraintError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export async function createStockGroup(formData: FormData) {
  try {
    return await runCreateStockGroup(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el producto");
  }
}

async function runCreateStockGroup(formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  const parsed = stockGroupSchema.parse({
    name: formData.get("name"),
    defaultStockQuantity: formData.get("defaultStockQuantity") || undefined,
  });
  try {
    await prisma.stockGroup.create({
      data: {
        tenantId: tenant.id,
        name: parsed.name,
        defaultStockQuantity: parsed.defaultStockQuantity ?? null,
      },
    });
  } catch (e) {
    if (isUniqueConstraintError(e)) throw new ActionError("Ya existe un grupo de stock con ese nombre");
    throw e;
  }
  revalidatePath("/admin/productos");
  return { ok: true as const };
}

export async function updateStockGroup(id: string, formData: FormData) {
  try {
    return await runUpdateStockGroup(id, formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el producto");
  }
}

async function runUpdateStockGroup(id: string, formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  const parsed = stockGroupSchema.parse({
    name: formData.get("name"),
    defaultStockQuantity: formData.get("defaultStockQuantity") || undefined,
  });
  try {
    await prisma.stockGroup.update({
      where: { id, tenantId: tenant.id },
      data: { name: parsed.name, defaultStockQuantity: parsed.defaultStockQuantity ?? null },
    });
  } catch (e) {
    if (isUniqueConstraintError(e)) throw new ActionError("Ya existe un grupo de stock con ese nombre");
    throw e;
  }
  revalidatePath("/admin/productos");
  return { ok: true as const };
}

export async function deleteStockGroup(id: string) {
  try {
    return await runDeleteStockGroup(id);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el producto");
  }
}

async function runDeleteStockGroup(id: string) {
  const { tenant } = await requireTenantAdmin();
  const variantCount = await prisma.productVariant.count({
    where: { stockGroupId: id, product: { tenantId: tenant.id } },
  });
  if (variantCount > 0) {
    throw new ActionError("No se puede borrar un grupo con variantes asignadas. Sacalas del grupo primero.");
  }
  await prisma.stockGroup.delete({ where: { id, tenantId: tenant.id } });
  revalidatePath("/admin/productos");
  return { ok: true as const };
}

// Crea un pozo de stock dedicado, nuevo, desambiguando el nombre si ya
// existe uno igual. Usado cada vez que una variante (o todas las variantes
// nuevas de un producto) queda individual.
async function ensureDedicatedStockGroup(tx: Pick<PrismaClient, "stockGroup">, tenantId: string, fallbackName: string) {
  let name = fallbackName;
  let attempt = 1;
  for (;;) {
    try {
      const group = await tx.stockGroup.create({ data: { tenantId, name, isIndividual: true } });
      return group.id;
    } catch {
      attempt += 1;
      name = `${fallbackName} (${attempt})`;
      if (attempt > 20) throw new ActionError("No se pudo crear el grupo de stock");
    }
  }
}

// Resuelve el stockGroupId real que le corresponde a una variante a partir
// de lo que mandó el cliente: un id real (compartir con un grupo que ya
// existe), "__solo__" (pozo propio, nuevo), o "__siblings__" (comparte un
// pozo nuevo con las demás variantes de este mismo guardado que también
// pidieron "__siblings__" — se crea una sola vez y se reusa).
// Pozos individuales (isIndividual) que quedaron en 0 miembros —variante
// movida a otro pozo, borrada, o el producto entero borrado— son basura:
// nadie los va a reusar porque su nombre es una foto vieja de esa variante
// puntual. Los pozos armados a mano en "Grupos de stock" (isIndividual:
// false) nunca se tocan acá aunque queden vacíos — el admin los creó a
// propósito y puede querer reusarlos.
async function cleanupOrphanIndividualStockGroups(tx: Pick<PrismaClient, "stockGroup">, tenantId: string) {
  await tx.stockGroup.deleteMany({ where: { tenantId, isIndividual: true, variants: { none: {} } } });
}

async function resolveVariantStockGroupId(
  tx: Pick<PrismaClient, "stockGroup">,
  tenantId: string,
  rawValue: string,
  siblingGroupCache: Map<string, string>,
  dedicatedName: string,
): Promise<string> {
  if (rawValue === "__siblings__") {
    let groupId = siblingGroupCache.get("__siblings__");
    if (!groupId) {
      groupId = await ensureDedicatedStockGroup(tx, tenantId, dedicatedName);
      siblingGroupCache.set("__siblings__", groupId);
    }
    return groupId;
  }
  if (rawValue === "__solo__") {
    return ensureDedicatedStockGroup(tx, tenantId, dedicatedName);
  }
  const group = await tx.stockGroup.findUnique({ where: { id: rawValue, tenantId } });
  if (!group) throw new ActionError("Grupo de stock no encontrado");
  return group.id;
}

// ---------- Productos ----------

const newProductImageSchema = z.object({
  newKey: z.string(),
  order: z.number(),
});

const newProductVariantSchema = z.object({
  gusto: z.string().optional(),
  tamano: z.string().optional(),
  price: z.coerce.number().positive("El precio debe ser mayor a 0"),
  // id real, "__solo__" o "__siblings__" — ver resolveVariantStockGroupId.
  stockGroupId: z.string().min(1),
});

const newProductSchema = z.object({
  name: z.string().min(1, "Ingresá un nombre"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Elegí una categoría"),
  variants: z.array(newProductVariantSchema).min(1, "Cargá un precio o agregá al menos una variante"),
  images: z.array(newProductImageSchema),
  active: z.boolean(),
  featured: z.boolean(),
  contactToBuy: z.boolean(),
});

export async function createProduct(formData: FormData) {
  try {
    return await runCreateProduct(formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el producto");
  }
}

async function runCreateProduct(formData: FormData) {
  const { tenant } = await requireTenantAdmin();
  const parsed = newProductSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    categoryId: formData.get("categoryId"),
    variants: JSON.parse(String(formData.get("variants") || "[]")),
    images: JSON.parse(String(formData.get("images") || "[]")),
    active: formData.get("active") === "true",
    featured: formData.get("featured") === "true",
    contactToBuy: formData.get("contactToBuy") === "true",
  });

  const imageCreates: { url: string; order: number }[] = [];
  for (const img of parsed.images) {
    const file = formData.get(`newImageFile_${img.newKey}`);
    if (file instanceof File && file.size > 0) {
      const url = await saveUploadedFile(file, "products");
      imageCreates.push({ url, order: img.order });
    }
  }

  const product = await prisma.$transaction(async (tx) => {
    const siblingGroupCache = new Map<string, string>();
    const variantsData = [];
    for (let i = 0; i < parsed.variants.length; i++) {
      const v = parsed.variants[i];
      const dedicatedName = [parsed.name, [v.gusto, v.tamano].filter(Boolean).join(" · ")]
        .filter(Boolean)
        .join(" — ");
      const stockGroupId = await resolveVariantStockGroupId(tx, tenant.id, v.stockGroupId, siblingGroupCache, dedicatedName);
      variantsData.push({
        gusto: v.gusto || null,
        tamano: v.tamano || null,
        price: v.price,
        order: i,
        stockGroupId,
      });
    }

    return tx.product.create({
      data: {
        tenantId: tenant.id,
        name: parsed.name,
        description: parsed.description,
        categoryId: parsed.categoryId,
        active: parsed.active,
        featured: parsed.featured,
        contactToBuy: parsed.contactToBuy,
        variants: { create: variantsData },
        images: imageCreates.length > 0 ? { create: imageCreates } : undefined,
      },
    });
  });
  revalidatePath("/admin/productos");
  return { id: product.id };
}

export async function toggleProductActive(id: string, active: boolean) {
  try {
    return await runToggleProductActive(id, active);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el producto");
  }
}

async function runToggleProductActive(id: string, active: boolean) {
  const { tenant } = await requireTenantAdmin();
  await prisma.product.update({ where: { id, tenantId: tenant.id }, data: { active } });
  revalidatePath("/admin/productos");
  return { ok: true as const };
}

// Pausa rápida sin fecha ni cantidad — solo tiene efecto en modo horario
// semanal (delivery del día); en ventas programadas manda el stock por fecha.
export async function toggleProductSoldOutToday(id: string, soldOutToday: boolean) {
  try {
    return await runToggleProductSoldOutToday(id, soldOutToday);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el producto");
  }
}

async function runToggleProductSoldOutToday(id: string, soldOutToday: boolean) {
  const { tenant } = await requireTenantAdmin();
  await prisma.product.update({ where: { id, tenantId: tenant.id }, data: { soldOutToday } });
  revalidatePath("/admin/productos");
  revalidatePath("/");
  return { ok: true as const };
}

export async function duplicateProduct(id: string) {
  try {
    return await runDuplicateProduct(id);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el producto");
  }
}

async function runDuplicateProduct(id: string) {
  const { tenant } = await requireTenantAdmin();
  const source = await prisma.product.findUnique({
    where: { id, tenantId: tenant.id },
    include: { variants: true, images: { orderBy: { order: "asc" } } },
  });
  if (!source) throw new ActionError("Producto no encontrado");

  const copyName = `${source.name} (copia)`;

  const copy = await prisma.$transaction(async (tx) => {
    // La copia nace con pozos propios y nuevos, nunca comparte con el
    // original — pero preserva qué variantes compartían pozo entre sí.
    const newGroupIdBySourceGroupId = new Map<string, string>();
    const variantsData = [];
    for (const v of source.variants) {
      let newGroupId = newGroupIdBySourceGroupId.get(v.stockGroupId);
      if (!newGroupId) {
        newGroupId = await ensureDedicatedStockGroup(tx, tenant.id, copyName);
        newGroupIdBySourceGroupId.set(v.stockGroupId, newGroupId);
      }
      variantsData.push({
        gusto: v.gusto,
        tamano: v.tamano,
        sku: v.sku,
        price: v.price,
        active: v.active,
        order: v.order,
        stockGroupId: newGroupId,
      });
    }

    return tx.product.create({
      data: {
        tenantId: tenant.id,
        categoryId: source.categoryId,
        name: copyName,
        description: source.description,
        active: false,
        featured: false,
        tags: source.tags,
        variants: { create: variantsData },
        images: {
          create: source.images.map((img) => ({ url: img.url, order: img.order })),
        },
      },
    });
  });

  revalidatePath("/admin/productos");
  redirect(`/admin/productos/${copy.id}`);
  return { ok: true as const };
}

export async function deleteProduct(id: string) {
  try {
    return await runDeleteProduct(id);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el producto");
  }
}

async function runDeleteProduct(id: string) {
  const { tenant } = await requireTenantAdmin();
  const orderItemCount = await prisma.orderItem.count({
    where: { productVariant: { productId: id, product: { tenantId: tenant.id } } },
  });
  if (orderItemCount > 0) {
    throw new ActionError("No se puede borrar un producto con pedidos asociados. Desactivalo en su lugar.");
  }
  await prisma.product.delete({ where: { id, tenantId: tenant.id } });
  await cleanupOrphanIndividualStockGroups(prisma, tenant.id);
  revalidatePath("/admin/productos");
  redirect("/admin/productos");
  return { ok: true as const };
}

// ---------- Editor unificado (info + variantes + fotos, un solo guardado) ----------

const editorVariantSchema = z.object({
  id: z.string().optional(),
  gusto: z.string().optional(),
  tamano: z.string().optional(),
  sku: z.string().optional(),
  price: z.coerce.number().positive("El precio debe ser mayor a 0"),
  active: z.boolean(),
  order: z.number(),
  // id real, "__solo__" o "__siblings__" — ver resolveVariantStockGroupId.
  stockGroupId: z.string().min(1),
});

const editorImageSchema = z.object({
  id: z.string().optional(),
  newKey: z.string().optional(),
  order: z.number(),
});

const saveProductSchema = z.object({
  name: z.string().min(1, "Ingresá un nombre"),
  description: z.string().optional(),
  categoryId: z.string().min(1, "Elegí una categoría"),
  active: z.boolean(),
  featured: z.boolean(),
  contactToBuy: z.boolean(),
  tags: z.array(z.string()),
  variants: z.array(editorVariantSchema),
  deletedVariantIds: z.array(z.string()),
  images: z.array(editorImageSchema),
  deletedImageIds: z.array(z.string()),
});

export async function saveProduct(id: string, formData: FormData) {
  try {
    return await runSaveProduct(id, formData);
  } catch (err) {
    return toUserError(err, "No se pudo guardar el producto");
  }
}

async function runSaveProduct(id: string, formData: FormData) {
  const { tenant } = await requireTenantAdmin();

  const existing = await prisma.product.findUnique({ where: { id, tenantId: tenant.id } });
  if (!existing) throw new ActionError("Producto no encontrado");

  const parsed = saveProductSchema.parse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    categoryId: formData.get("categoryId"),
    active: formData.get("active") === "true",
    featured: formData.get("featured") === "true",
    contactToBuy: formData.get("contactToBuy") === "true",
    tags: JSON.parse(String(formData.get("tags") || "[]")),
    variants: JSON.parse(String(formData.get("variants") || "[]")),
    deletedVariantIds: JSON.parse(String(formData.get("deletedVariantIds") || "[]")),
    images: JSON.parse(String(formData.get("images") || "[]")),
    deletedImageIds: JSON.parse(String(formData.get("deletedImageIds") || "[]")),
  });

  if (parsed.deletedVariantIds.length > 0) {
    const usedCount = await prisma.orderItem.count({
      where: { productVariantId: { in: parsed.deletedVariantIds } },
    });
    if (usedCount > 0) {
      throw new ActionError(
        "No se puede borrar una variante con pedidos asociados. Desactivala en su lugar.",
      );
    }
  }

  const newImageUrls = new Map<string, string>();
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("newImageFile_") && value instanceof File && value.size > 0) {
      if (!value.type.startsWith("image/")) throw new ActionError("Todos los archivos deben ser imágenes");
      const url = await saveUploadedFile(value, "products");
      newImageUrls.set(key.replace("newImageFile_", ""), url);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.update({
      // tenantId va también acá, aunque la pertenencia ya se validó arriba:
      // el where deja de depender de que esa comprobación previa siga
      // existiendo si alguien reordena el código más adelante.
      where: { id, tenantId: tenant.id },
      data: {
        name: parsed.name,
        description: parsed.description ?? null,
        categoryId: parsed.categoryId,
        active: parsed.active,
        featured: parsed.featured,
        contactToBuy: parsed.contactToBuy,
        tags: parsed.tags,
      },
    });

    if (parsed.deletedVariantIds.length > 0) {
      await tx.productVariant.deleteMany({
        where: { id: { in: parsed.deletedVariantIds }, productId: id },
      });
    }

    const siblingGroupCache = new Map<string, string>();
    for (const v of parsed.variants) {
      const dedicatedName = [parsed.name, [v.gusto, v.tamano].filter(Boolean).join(" · ")]
        .filter(Boolean)
        .join(" — ");
      const stockGroupId = await resolveVariantStockGroupId(tx, tenant.id, v.stockGroupId, siblingGroupCache, dedicatedName);
      const data = {
        gusto: v.gusto || null,
        tamano: v.tamano || null,
        sku: v.sku || null,
        price: v.price,
        active: v.active,
        order: v.order,
        stockGroupId,
      };
      if (v.id) {
        await tx.productVariant.update({ where: { id: v.id, productId: id }, data });
      } else {
        await tx.productVariant.create({ data: { ...data, productId: id } });
      }
    }

    if (parsed.deletedImageIds.length > 0) {
      await tx.productImage.deleteMany({ where: { id: { in: parsed.deletedImageIds }, productId: id } });
    }

    for (const img of parsed.images) {
      if (img.id) {
        await tx.productImage.update({ where: { id: img.id, productId: id }, data: { order: img.order } });
      } else if (img.newKey) {
        const url = newImageUrls.get(img.newKey);
        if (url) await tx.productImage.create({ data: { productId: id, url, order: img.order } });
      }
    }

    await cleanupOrphanIndividualStockGroups(tx, tenant.id);
  });

  revalidatePath("/admin/productos");
  revalidatePath(`/admin/productos/${id}`);
  // Igual que deleteProduct/duplicateProduct: redirigir acá (no dejárselo a
  // un router.push del lado del cliente después del await) hace que la
  // navegación viaje con el RSC recién renderizado de este mismo request —
  // sin esto, la lista podía mostrar la versión de ANTES de guardar si el
  // cliente ya la tenía en caché de una visita previa.
  redirect("/admin/productos");
  return { ok: true as const };
}
