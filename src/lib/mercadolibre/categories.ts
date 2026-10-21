import "server-only";
import { cache } from "react";
import { mlFetch } from "@/lib/mercadolibre/client";

export type MlCategoryAttributeValue = { id: string; name: string };

export type MlCategoryAttribute = {
  id: string;
  name: string;
  valueType: string; // "string" | "number" | "list" | "boolean" | ...
  required: boolean;
  values: MlCategoryAttributeValue[];
};

type MlCategoryNode = { id: string; name: string };

// La categoría raíz de Inmuebles no es la misma en todos los sitios de ML
// (en MLA es "MLA1459", pero puede cambiar) — se busca por nombre entre las
// categorías del sitio en vez de hardcodearla.
const REAL_ESTATE_ROOT_NAME = "inmuebles";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

async function fetchSiteCategories(tenantId: string, siteId: string): Promise<MlCategoryNode[]> {
  return mlFetch<MlCategoryNode[]>(tenantId, `/sites/${siteId}/categories`, { auth: false });
}

async function fetchCategory(tenantId: string, categoryId: string): Promise<{ id: string; name: string; children_categories: MlCategoryNode[] }> {
  return mlFetch(tenantId, `/categories/${categoryId}`, { auth: false });
}

export const getRealEstateRootCategory = cache(async (tenantId: string, siteId: string) => {
  const roots = await fetchSiteCategories(tenantId, siteId);
  const root = roots.find((c) => normalize(c.name).includes(REAL_ESTATE_ROOT_NAME));
  if (!root) throw new Error(`No encontramos la categoría de Inmuebles en el sitio ${siteId}`);
  return root;
});

// Matchea nuestro propertyType de texto libre (Casa, Departamento, Local,
// Oficina, Terreno, Galpón, Campo, Cochera...) contra las subcategorías
// reales de Inmuebles — por substring normalizado (sin tildes), no exacto,
// porque ML nombra las categorías en plural y con variantes ("Casas",
// "Departamentos", "Locales Comerciales"...).
export const resolveCategoryForPropertyType = cache(async (tenantId: string, siteId: string, propertyType: string) => {
  const root = await getRealEstateRootCategory(tenantId, siteId);
  const category = await fetchCategory(tenantId, root.id);
  const normalizedType = normalize(propertyType);
  const match = category.children_categories.find((c) => {
    const normalizedName = normalize(c.name);
    return normalizedName.includes(normalizedType) || normalizedType.includes(normalizedName.replace(/s$/, ""));
  });
  if (!match) {
    throw new Error(
      `No pudimos relacionar el tipo de propiedad "${propertyType}" con una categoría de Mercado Libre. ` +
        `Categorías disponibles: ${category.children_categories.map((c) => c.name).join(", ")}.`,
    );
  }
  return match;
});

export const getCategoryAttributes = cache(async (tenantId: string, categoryId: string): Promise<MlCategoryAttribute[]> => {
  type RawAttribute = {
    id: string;
    name: string;
    value_type: string;
    tags?: { required?: boolean };
    values?: { id: string; name: string }[];
  };
  const raw = await mlFetch<RawAttribute[]>(tenantId, `/categories/${categoryId}/attributes`, { auth: false });
  return raw.map((a) => ({
    id: a.id,
    name: a.name,
    valueType: a.value_type,
    required: Boolean(a.tags?.required),
    values: a.values ?? [],
  }));
});

export async function findAttributeValueId(
  attribute: MlCategoryAttribute,
  wantedName: string,
): Promise<string | null> {
  const normalizedWanted = normalize(wantedName);
  const found = attribute.values.find((v) => normalize(v.name) === normalizedWanted || normalize(v.name).includes(normalizedWanted));
  return found?.id ?? null;
}
