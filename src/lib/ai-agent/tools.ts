import { prisma } from "@/lib/prisma";
import { getStoreSettings } from "@/lib/settings";
import { getAssistantStatus } from "@/lib/ai-agent/status";
import { optionalNumber, optionalText, safeToolArgs } from "@/lib/ai-agent/validation";
import type { AssistantProperty } from "@/lib/ai-agent/types";

export type AssistantToolName = "search_properties" | "get_agency_options";

export type AssistantToolDefinition = {
  name: AssistantToolName;
  description: string;
  parameters: Record<string, unknown>;
};

export const ASSISTANT_TOOLS: AssistantToolDefinition[] = [
  {
    name: "search_properties",
    description:
      "Busca propiedades publicadas en el catálogo real de la inmobiliaria. Usala antes de recomendar o afirmar precio, ubicación o disponibilidad.",
    parameters: {
      type: "object",
      properties: {
        operation: { type: ["string", "null"], enum: ["SALE", "RENT", null], description: "Venta o alquiler." },
        property_type: { type: ["string", "null"], description: "Tipo de propiedad (Casa, Departamento, Local, etc.)." },
        city: { type: ["string", "null"], description: "Ciudad." },
        min_bedrooms: { type: ["number", "null"], description: "Cantidad mínima de dormitorios." },
        max_price: { type: ["number", "null"], description: "Precio máximo en la moneda de la propiedad (USD para venta, ARS para alquiler suele ser lo habitual)." },
      },
      required: ["operation", "property_type", "city", "min_bedrooms", "max_price"],
      additionalProperties: false,
    },
  },
  {
    name: "get_agency_options",
    description:
      "Consulta la información oficial y vigente de la inmobiliaria: nombre, dirección, contacto, WhatsApp y si hay alguien disponible para atender por WhatsApp ahora mismo. Usala antes de responder cualquier pregunta sobre el negocio o de ofrecer hablar con una persona.",
    parameters: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
];

function propertyDto(
  property: {
    id: string;
    title: string;
    city: string;
    neighborhood: string;
    bedrooms: number;
    media: { url: string }[];
    listings: { operation: string; price: unknown; currency: string; showPrice: boolean }[];
  },
): AssistantProperty {
  const listing = property.listings[0];
  return {
    id: property.id,
    title: property.title,
    operation: listing?.operation ?? "SALE",
    price: listing?.price != null ? Number(listing.price) : null,
    currency: listing?.currency ?? "USD",
    showPrice: listing?.showPrice ?? true,
    city: property.city,
    neighborhood: property.neighborhood,
    bedrooms: property.bedrooms,
    image: property.media[0]?.url ?? null,
    href: `/propiedades/${property.id}`,
  };
}

export async function executeAssistantTool(
  tenantId: string,
  name: string,
  rawArgs: unknown,
): Promise<{ output: string; properties?: AssistantProperty[] }> {
  const args = safeToolArgs(rawArgs);

  if (name === "search_properties") {
    const operation = args.operation === "SALE" || args.operation === "RENT" ? args.operation : undefined;
    const propertyType = optionalText(args.property_type, 60);
    const city = optionalText(args.city, 60);
    const minBedrooms = optionalNumber(args.min_bedrooms);
    const maxPrice = optionalNumber(args.max_price);

    const rows = await prisma.estateProperty.findMany({
      where: {
        tenantId,
        published: true,
        ...(propertyType ? { propertyType: { equals: propertyType, mode: "insensitive" } } : {}),
        ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
        ...(minBedrooms !== undefined ? { bedrooms: { gte: minBedrooms } } : {}),
        listings: {
          some: {
            status: "AVAILABLE",
            ...(operation ? { operation } : {}),
            ...(maxPrice !== undefined ? { price: { lte: maxPrice } } : {}),
          },
        },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 6,
      select: {
        id: true,
        title: true,
        city: true,
        neighborhood: true,
        bedrooms: true,
        media: { orderBy: { position: "asc" }, take: 1, select: { url: true } },
        listings: {
          where: { status: "AVAILABLE", ...(operation ? { operation } : {}) },
          take: 1,
          select: { operation: true, price: true, currency: true, showPrice: true },
        },
      },
    });
    const properties = rows.map(propertyDto);
    return {
      properties,
      output: JSON.stringify({
        properties: properties.map((p) => ({
          id: p.id,
          title: p.title,
          operation: p.operation,
          price: p.showPrice ? p.price : null,
          currency: p.currency,
          city: p.city,
          neighborhood: p.neighborhood,
          bedrooms: p.bedrooms,
        })),
        count: properties.length,
      }),
    };
  }

  if (name === "get_agency_options") {
    const [settings, status] = await Promise.all([
      getStoreSettings(tenantId),
      getAssistantStatus(tenantId),
    ]);
    const humanSupport = status.humanSeller;
    return {
      output: JSON.stringify({
        agency: {
          name: settings.storeName,
          address: settings.address || undefined,
          city: settings.city || undefined,
          phone: settings.phone || undefined,
          whatsapp: settings.whatsapp || undefined,
          instagram: settings.instagram || undefined,
        },
        humanSupport: {
          available: humanSupport.available,
          schedule: humanSupport.scheduleText,
          whatsappUrl: humanSupport.whatsappUrl,
        },
      }),
    };
  }

  return { output: JSON.stringify({ error: "Herramienta desconocida" }) };
}
