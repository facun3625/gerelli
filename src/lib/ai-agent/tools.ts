import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { buildPublishedPropertyWhere, type ParsedCatalogFilters } from "@/lib/estate/catalog-filters";
import { parseDate } from "@/lib/estate/validation";
import { ORIENTATIONS, PET_POLICIES } from "@/lib/estate/property-features";
import { money } from "@/lib/estate/modules";
import type { RuntimeTool } from "./run-agent";

const OPERATIONS = ["SALE", "RENT"] as const;

function priceLabel(listing: { showPrice: boolean; price: Prisma.Decimal | null; currency: string } | undefined) {
  if (!listing) return null;
  if (!listing.showPrice || listing.price == null) return "Consultar precio";
  return money(listing.price, listing.currency);
}

// Reusa la misma dedupe que ya hace falta para no crear un EstateContact
// distinto cada vez que la misma persona escribe de nuevo — inquireProperty
// (src/app/propiedades/actions.ts) no dedupe porque ahí cada envío de
// formulario es, en los hechos, un contacto nuevo; acá una charla puede
// mencionar el teléfono más de una vez.
async function findOrCreateContact(
  tx: Prisma.TransactionClient,
  tenantId: string,
  data: { name: string; phone: string; email?: string },
) {
  const existing = await tx.estateContact.findFirst({
    where: {
      tenantId,
      OR: [{ phone: data.phone }, ...(data.email ? [{ email: data.email }] : [])],
    },
  });
  if (existing) return existing;
  return tx.estateContact.create({
    data: { tenantId, name: data.name, phone: data.phone, email: data.email, roles: ["PROSPECT"] },
  });
}

// Todas las tools quedan atadas a este tenant y a esta conversación por
// clausura — el modelo nunca manda tenantId como argumento, así que no hay
// forma de que el agente de un tenant termine leyendo o escribiendo datos
// de otro.
export function buildAgentTools(tenantId: string, conversationId: string): RuntimeTool[] {
  return [
    {
      name: "buscar_propiedades",
      description:
        "Busca propiedades publicadas y disponibles de esta inmobiliaria según filtros. Usar siempre que el visitante pregunte por propiedades — nunca inventar resultados.",
      parameters: {
        type: "object",
        properties: {
          operation: { type: "string", enum: OPERATIONS, description: "SALE (venta) o RENT (alquiler)" },
          propertyType: { type: "string", description: "Tipo de inmueble (ej: Casa, Departamento, Local)" },
          city: { type: "string" },
          neighborhood: { type: "string" },
          bedrooms: { type: "integer", description: "Cantidad exacta de dormitorios" },
          orientation: { type: "string", enum: ORIENTATIONS },
          petsPolicy: { type: "string", enum: PET_POLICIES },
          creditEligible: { type: "boolean", description: "Si es apto crédito" },
          minPrice: { type: "number" },
          maxPrice: { type: "number" },
          texto: { type: "string", description: "Búsqueda libre por título, ciudad o barrio" },
        },
      },
      async execute(args) {
        const filters: ParsedCatalogFilters = {
          operation: OPERATIONS.includes(args.operation as (typeof OPERATIONS)[number])
            ? (args.operation as "SALE" | "RENT")
            : undefined,
          propertyType: typeof args.propertyType === "string" ? args.propertyType : undefined,
          city: typeof args.city === "string" ? args.city : undefined,
          neighborhood: typeof args.neighborhood === "string" ? args.neighborhood : undefined,
          bedrooms: typeof args.bedrooms === "number" ? args.bedrooms : undefined,
          orientation: ORIENTATIONS.some((v) => v === args.orientation) ? String(args.orientation) : undefined,
          petsPolicy: PET_POLICIES.some((v) => v === args.petsPolicy) ? String(args.petsPolicy) : undefined,
          creditEligible: typeof args.creditEligible === "boolean" ? args.creditEligible : undefined,
          q: typeof args.texto === "string" ? args.texto : undefined,
        };
        const where = buildPublishedPropertyWhere(tenantId, filters);
        const minPrice = typeof args.minPrice === "number" ? args.minPrice : undefined;
        const maxPrice = typeof args.maxPrice === "number" ? args.maxPrice : undefined;
        if (minPrice !== undefined || maxPrice !== undefined) {
          where.listings = {
            some: {
              status: "AVAILABLE",
              ...(filters.operation ? { operation: filters.operation } : {}),
              price: {
                ...(minPrice !== undefined ? { gte: minPrice } : {}),
                ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
              },
            },
          };
        }
        const properties = await prisma.estateProperty.findMany({
          where,
          include: { listings: { where: { status: "AVAILABLE" } } },
          orderBy: { createdAt: "desc" },
          take: 5,
        });
        return {
          count: properties.length,
          results: properties.map((p) => {
            const listing = p.listings.find((l) => !filters.operation || l.operation === filters.operation) ?? p.listings[0];
            return {
              propertyId: p.id,
              url: `/propiedades/${p.id}`,
              title: p.title,
              operation: listing?.operation ?? null,
              propertyType: p.propertyType,
              city: p.city,
              neighborhood: p.neighborhood,
              orientation: p.orientation,
              petsPolicy: p.petsPolicy,
              creditEligible: p.creditEligible,
              bedrooms: p.bedrooms,
              bathrooms: p.bathrooms,
              price: priceLabel(listing),
            };
          }),
        };
      },
    },
    {
      name: "ver_propiedad",
      description: "Trae el detalle completo de una propiedad puntual por su propertyId (obtenido de buscar_propiedades).",
      parameters: {
        type: "object",
        properties: { propertyId: { type: "string" } },
        required: ["propertyId"],
      },
      async execute(args) {
        const propertyId = String(args.propertyId ?? "");
        const property = await prisma.estateProperty.findFirst({
          where: { id: propertyId, tenantId, published: true, listings: { some: { status: "AVAILABLE" } } },
          include: { listings: { where: { status: "AVAILABLE" } } },
        });
        if (!property) return { error: "No encontré esa propiedad, puede que ya no esté disponible." };
        const listing = property.listings[0];
        return {
          propertyId: property.id,
          url: `/propiedades/${property.id}`,
          title: property.title,
          description: property.description,
          address: property.address,
          city: property.city,
          neighborhood: property.neighborhood,
          orientation: property.orientation,
          petsPolicy: property.petsPolicy,
          creditEligible: property.creditEligible,
          floorPlanUrl: property.floorPlanUrl,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          garages: property.garages,
          coveredArea: property.coveredArea?.toString() ?? null,
          totalArea: property.totalArea?.toString() ?? null,
          operation: listing?.operation ?? null,
          price: priceLabel(listing),
        };
      },
    },
    {
      name: "crear_consulta",
      description:
        "Registra al visitante como una consulta/lead para que la inmobiliaria lo contacte. Usar cuando el visitante deje sus datos porque le interesa algo puntual o quiere que lo llamen.",
      parameters: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          telefono: { type: "string" },
          email: { type: "string" },
          mensaje: { type: "string", description: "Resumen de qué le interesa al visitante" },
          propertyId: { type: "string", description: "Si la consulta es por una propiedad puntual" },
        },
        required: ["nombre", "telefono", "mensaje"],
      },
      async execute(args) {
        const parsed = z
          .object({
            nombre: z.string().trim().min(2).max(150),
            telefono: z.string().trim().min(5).max(60),
            email: z.union([z.literal(""), z.email()]).optional(),
            mensaje: z.string().trim().min(2).max(3000),
            propertyId: z.string().optional(),
          })
          .safeParse(args);
        if (!parsed.success) return { error: "Faltan datos válidos (nombre, teléfono y mensaje) para registrar la consulta." };
        const data = parsed.data;
        try {
          const result = await prisma.$transaction(async (tx) => {
            // Si el modelo ya llamó esta tool antes en la misma charla (por
            // las dudas, o porque el visitante repitió sus datos), no
            // duplicamos la consulta — solo actualizamos el contacto por si
            // corrigió algo y confirmamos que ya está registrada.
            const conversation = await tx.estateAiConversation.findUnique({ where: { id: conversationId } });
            if (conversation?.inquiryCreated) {
              await tx.estateAiConversation.update({
                where: { id: conversationId },
                data: { contactName: data.nombre, contactPhone: data.telefono },
              });
              return { ok: true, alreadyRegistered: true };
            }

            let propertyId: string | undefined;
            if (data.propertyId) {
              const property = await tx.estateProperty.findFirst({
                where: { id: data.propertyId, tenantId, published: true, listings: { some: { status: "AVAILABLE" } } },
              });
              propertyId = property?.id;
            }
            const contact = await findOrCreateContact(tx, tenantId, {
              name: data.nombre,
              phone: data.telefono,
              email: data.email || undefined,
            });
            await tx.estateInquiry.create({
              data: { tenantId, contactId: contact.id, propertyId, message: data.mensaje, source: "AI_AGENT" },
            });
            await tx.estateAiConversation.update({
              where: { id: conversationId },
              data: { contactName: data.nombre, contactPhone: data.telefono, leadCreated: true, inquiryCreated: true },
            });
            return { ok: true };
          });
          return result;
        } catch {
          return { error: "No se pudo registrar la consulta, intentá de nuevo." };
        }
      },
    },
    {
      name: "agendar_visita",
      description: "Agenda una visita presencial a una propiedad puntual, en una fecha y hora que el visitante prefiera.",
      parameters: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          telefono: { type: "string" },
          email: { type: "string" },
          propertyId: { type: "string" },
          fechaHoraDeseada: {
            type: "string",
            description: "Formato exacto YYYY-MM-DDTHH:mm, en hora de Argentina",
          },
          notas: { type: "string" },
        },
        required: ["nombre", "telefono", "propertyId", "fechaHoraDeseada"],
      },
      async execute(args) {
        const parsed = z
          .object({
            nombre: z.string().trim().min(2).max(150),
            telefono: z.string().trim().min(5).max(60),
            email: z.union([z.literal(""), z.email()]).optional(),
            propertyId: z.string().min(1),
            fechaHoraDeseada: z.string(),
            notas: z.string().max(1000).optional(),
          })
          .safeParse(args);
        if (!parsed.success) return { error: "Faltan datos válidos para agendar la visita." };
        const data = parsed.data;
        let startsAt: Date;
        try {
          startsAt = parseDate(data.fechaHoraDeseada, true);
        } catch {
          return { error: "La fecha/hora no tiene el formato esperado (YYYY-MM-DDTHH:mm)." };
        }
        if (startsAt.getTime() <= Date.now()) return { error: "Esa fecha ya pasó, pedile otra al visitante." };
        const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

        try {
          const result = await prisma.$transaction(async (tx) => {
            const property = await tx.estateProperty.findFirst({
              where: { id: data.propertyId, tenantId, published: true, listings: { some: { status: "AVAILABLE" } } },
            });
            if (!property) return { error: "Esa propiedad ya no está disponible." };

            const overlapping = await tx.estateVisit.count({
              where: {
                tenantId,
                propertyId: data.propertyId,
                status: { in: ["SCHEDULED", "CONFIRMED"] },
                startsAt: { lt: endsAt },
                endsAt: { gt: startsAt },
              },
            });
            if (overlapping > 0) return { error: "Ese horario ya está ocupado para esa propiedad, ofrecé otro horario." };

            const contact = await findOrCreateContact(tx, tenantId, {
              name: data.nombre,
              phone: data.telefono,
              email: data.email || undefined,
            });
            await tx.estateVisit.create({
              data: {
                tenantId,
                propertyId: data.propertyId,
                contactId: contact.id,
                agentName: "Sin asignar",
                startsAt,
                endsAt,
                status: "SCHEDULED",
                notes: data.notas ?? "",
              },
            });
            await tx.estateAiConversation.update({
              where: { id: conversationId },
              data: { contactName: data.nombre, contactPhone: data.telefono, leadCreated: true },
            });
            return { ok: true };
          });
          return result;
        } catch {
          return { error: "No se pudo agendar la visita, intentá de nuevo." };
        }
      },
    },
  ];
}
