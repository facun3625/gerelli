import "server-only";
import type { EstateProperty, EstateListing, EstateMedia } from "@/generated/prisma/client";
import { findAttributeValueId, type MlCategoryAttribute } from "@/lib/mercadolibre/categories";

export type PropertyForMl = EstateProperty & { media: EstateMedia[] };

// Atributos que sabemos completar automáticamente a partir de nuestros
// datos — IDs estables y documentados hace años para Inmuebles en ML.
// Cualquier OTRO atributo que la categoría marque como obligatorio
// (tags.required=true) y no esté en esta lista queda sin completar, y el
// publicador lo reporta como pendiente en vez de adivinar un valor.
type KnownAttributeId = "OPERATION" | "TOTAL_AREA" | "COVERED_AREA" | "BEDROOMS" | "FULL_BATHROOMS" | "GARAGE";

const OPERATION_LABELS: Record<string, string> = { SALE: "Venta", RENT: "Alquiler" };

export type MlAttributeValue = { id: string; value_id?: string; value_name?: string };

export type MappingResult = {
  attributes: MlAttributeValue[];
  // Atributos obligatorios de la categoría que no pudimos completar — hay
  // que resolverlos a mano en Mercado Libre después de crear el borrador,
  // o ampliar el mapeo en este archivo.
  unmappedRequired: { id: string; name: string }[];
};

function buildKnownValue(id: KnownAttributeId, attribute: MlCategoryAttribute, property: PropertyForMl, listing: EstateListing): MlAttributeValue | null {
  switch (id) {
    case "OPERATION": {
      const label = OPERATION_LABELS[listing.operation];
      return label ? { id: attribute.id, value_name: label } : null;
    }
    case "TOTAL_AREA":
      return property.totalArea != null ? { id: attribute.id, value_name: `${property.totalArea} m²` } : null;
    case "COVERED_AREA":
      return property.coveredArea != null ? { id: attribute.id, value_name: `${property.coveredArea} m²` } : null;
    case "BEDROOMS":
      return { id: attribute.id, value_name: String(property.bedrooms) };
    case "FULL_BATHROOMS":
      return { id: attribute.id, value_name: String(property.bathrooms) };
    case "GARAGE":
      return property.garages > 0 ? { id: attribute.id, value_name: String(property.garages) } : null;
    default:
      return null;
  }
}

const KNOWN_IDS: KnownAttributeId[] = ["OPERATION", "TOTAL_AREA", "COVERED_AREA", "BEDROOMS", "FULL_BATHROOMS", "GARAGE"];

export async function buildAttributeValues(
  categoryAttributes: MlCategoryAttribute[],
  property: PropertyForMl,
  listing: EstateListing,
): Promise<MappingResult> {
  const attributes: MlAttributeValue[] = [];
  const unmappedRequired: { id: string; name: string }[] = [];

  for (const attribute of categoryAttributes) {
    const known = KNOWN_IDS.includes(attribute.id as KnownAttributeId) ? (attribute.id as KnownAttributeId) : null;
    if (known) {
      // Para OPERATION el valor es de lista (hace falta el value_id real de
      // la categoría, no basta con mandar value_name) — se resuelve contra
      // los `values` que trajo /categories/{id}/attributes.
      if (known === "OPERATION") {
        const label = OPERATION_LABELS[listing.operation];
        const valueId = label ? await findAttributeValueId(attribute, label) : null;
        if (valueId) {
          attributes.push({ id: attribute.id, value_id: valueId });
          continue;
        }
      } else {
        const value = buildKnownValue(known, attribute, property, listing);
        if (value) {
          attributes.push(value);
          continue;
        }
      }
    }
    if (attribute.required) {
      unmappedRequired.push({ id: attribute.id, name: attribute.name });
    }
  }

  return { attributes, unmappedRequired };
}

export type ListingValidationIssue = { code: string; message: string };

// Chequeos previos a llamar a la API — los mismos que ML aplicaría, pero
// explicados en español antes de gastar una llamada. La validación final
// de atributos (unmappedRequired) solo se conoce después de resolver la
// categoría real, por eso vive en buildAttributeValues, no acá.
export function validateListingBeforePublish(property: PropertyForMl, listing: EstateListing): ListingValidationIssue[] {
  const issues: ListingValidationIssue[] = [];
  if (!listing.price) {
    issues.push({ code: "NO_PRICE", message: "La oferta no tiene precio cargado — Mercado Libre lo exige." });
  }
  if (property.media.length === 0) {
    issues.push({ code: "NO_PICTURES", message: "La propiedad no tiene fotos — desde enero 2026 ML rechaza publicaciones sin al menos una imagen." });
  }
  if (!OPERATION_LABELS[listing.operation]) {
    issues.push({ code: "BAD_OPERATION", message: `Operación "${listing.operation}" no tiene equivalente en Mercado Libre (solo Venta/Alquiler).` });
  }
  if (!property.propertyType.trim()) {
    issues.push({ code: "NO_PROPERTY_TYPE", message: "La propiedad no tiene tipo asignado." });
  }
  return issues;
}
