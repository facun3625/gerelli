import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { DEMO_SUBDOMAINS, DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } from "../src/lib/demo";

// Arma (o rearma de cero) las 3 copias de la demo pública de Inmobiliaria —
// mismos subdominios que usa /demo (src/lib/demo.ts) para repartir a quien
// deja su email en la copia libre. Re-ejecutable cuantas veces quieras:
// borra cada copia por completo (mismo criterio que "eliminar tienda" desde
// la plataforma, ver platform/tiendas/[tenantId]/actions.ts, extendido acá
// a las tablas de Inmobiliaria que esa acción no toca) y la vuelve a armar
// desde cero, así una demo que los visitantes ensuciaron queda impecable de
// nuevo. Correr con: npx tsx --env-file=.env scripts/seed-estate-demo.ts
const connectionString = process.env.DATABASE_URL!;
if (
  !["localhost", "127.0.0.1", "[::1]"].includes(
    new URL(connectionString).hostname,
  )
)
  throw new Error("La demo solo se crea en una base local.");
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

// Borra una copia de la demo por completo. Las tablas de Inmobiliaria no
// tienen borrado en cascada desde Tenant (a propósito, para no perder datos
// reales por accidente) — así que cada tabla sin cascada desde su padre
// directo se borra a mano, en orden (hijos antes que padres), antes de
// llegar al tenant mismo.
async function resetTenant(subdomain: string) {
  const tenant = await db.tenant.findUnique({ where: { subdomain }, select: { id: true } });
  if (!tenant) return;
  const tenantId = tenant.id;

  await db.$transaction(
    async (tx) => {
      // Inmobiliaria — hijos sin cascada desde su padre directo.
      await tx.estateReceipt.deleteMany({ where: { tenantId } });
      await tx.estateCharge.deleteMany({ where: { tenantId } });
      await tx.estateDeal.deleteMany({ where: { tenantId } });
      await tx.estateMaintenance.deleteMany({ where: { tenantId } });
      await tx.estateVisit.deleteMany({ where: { tenantId } });
      await tx.estateInquiry.deleteMany({ where: { tenantId } });
      // Cascada: documentos, fotos de entrega, garantes, conceptos, sugerencias de facturación.
      await tx.estateContract.deleteMany({ where: { tenantId } });
      await tx.estateValuation.deleteMany({ where: { tenantId } });
      await tx.estateUnit.deleteMany({ where: { tenantId } });
      await tx.estateBuilding.deleteMany({ where: { tenantId } });
      // Cascada: ofertas (listings), fotos, favoritos, vistas de página.
      await tx.estateProperty.deleteMany({ where: { tenantId } });
      // Cascada: eventos de la consulta.
      await tx.estateDevelopmentInquiry.deleteMany({ where: { tenantId } });
      // Cascada: campos e imágenes del emprendimiento.
      await tx.estateDevelopment.deleteMany({ where: { tenantId } });
      await tx.estateContact.deleteMany({ where: { tenantId } });
      await tx.estateAgent.deleteMany({ where: { tenantId } });
      // Cascada: mensajes de la conversación.
      await tx.estateAiConversation.deleteMany({ where: { tenantId } });
      await tx.estateRentIndexValue.deleteMany({ where: { tenantId } });
      await tx.estateAuditEvent.deleteMany({ where: { tenantId } });
      await tx.estatePropertyType.deleteMany({ where: { tenantId } });
      await tx.estateCity.deleteMany({ where: { tenantId } });
      await tx.estateNeighborhood.deleteMany({ where: { tenantId } });
      await tx.estateContractType.deleteMany({ where: { tenantId } });
      await tx.estatePropertyDestination.deleteMany({ where: { tenantId } });

      // Resto genérico de la tienda — mismo orden que "eliminar tienda"
      // desde la plataforma.
      await tx.order.deleteMany({ where: { tenantId } });
      await tx.stockMovement.deleteMany({ where: { tenantId } });
      await tx.pickupSlot.deleteMany({ where: { tenantId } });
      await tx.fulfillmentMethodConfig.deleteMany({ where: { tenantId } });
      await tx.paymentMethodConfig.deleteMany({ where: { tenantId } });
      await tx.weeklyScheduleRule.deleteMany({ where: { tenantId } });
      await tx.storeClosure.deleteMany({ where: { tenantId } });
      await tx.deliveryDate.deleteMany({ where: { tenantId } });
      await tx.serviceInquiry.deleteMany({ where: { tenantId } });
      await tx.service.deleteMany({ where: { tenantId } });
      await tx.product.deleteMany({ where: { tenantId } });
      await tx.productCategory.deleteMany({ where: { tenantId } });
      await tx.stockGroup.deleteMany({ where: { tenantId } });
      await tx.emailLog.deleteMany({ where: { tenantId } });
      await tx.whatsappLog.deleteMany({ where: { tenantId } });
      await tx.aboutMedia.deleteMany({ where: { tenantId } });
      await tx.settings.deleteMany({ where: { tenantId } });
      await tx.resellerCommission.deleteMany({ where: { tenantId } });
      await tx.billingPayment.deleteMany({ where: { tenantId } });
      await tx.promotionRedemption.deleteMany({ where: { tenantId } });

      await tx.user.deleteMany({ where: { tenantId } });
      await tx.tenant.delete({ where: { id: tenantId } });
    },
    { timeout: 30000 },
  );
}

async function seedTenant(subdomain: string) {
  const hash = await bcrypt.hash(DEMO_ADMIN_PASSWORD, 12);

  await db.$transaction(
    async (tx) => {
      const plan = await tx.plan.findFirst({
        where: { active: true },
        orderBy: { order: "desc" },
      });
      const tenant = await tx.tenant.create({
        data: {
          subdomain,
          category: "DEMO",
          billingStatus: "ACTIVE",
          planId: plan?.id,
        },
      });
      await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: DEMO_ADMIN_EMAIL,
          name: "Equipo Demo",
          role: "ADMIN",
          passwordHash: hash,
        },
      });
      await tx.settings.createMany({
        data: [
          {
            tenantId: tenant.id,
            key: "store_name",
            value: "Horizonte · Inmobiliaria demo",
          },
          { tenantId: tenant.id, key: "store_city", value: "Córdoba" },
          { tenantId: tenant.id, key: "store_province", value: "Córdoba" },
          {
            tenantId: tenant.id,
            key: "seo_title",
            value: "Horizonte · Propiedades en Córdoba",
          },
          {
            tenantId: tenant.id,
            key: "store_cover_url",
            value: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=75&auto=format&fit=crop",
          },
          // Asistente de IA: el plan ya lo permite (allowAiAgent), falta
          // que el propio tenant lo tenga prendido (ver isAiAgentAvailable).
          { tenantId: tenant.id, key: "ai_agent_enabled", value: "true" },
          {
            tenantId: tenant.id,
            key: "ai_agent_greeting",
            value: "¡Hola! Soy el asistente de Horizonte. ¿Qué tipo de propiedad estás buscando?",
          },
        ],
      });
      const owner = await tx.estateContact.create({
        data: {
          tenantId: tenant.id,
          name: "María López (demo)",
          email: "maria@example.test",
          roles: ["OWNER"],
        },
      });
      const prospect = await tx.estateContact.create({
        data: {
          tenantId: tenant.id,
          name: "Tomás Ríos (demo)",
          email: "tomas@example.test",
          roles: ["PROSPECT", "TENANT"],
          notes: "Busca dos dormitorios y espacio para trabajar.",
        },
      });
      // Mismas fotos (URLs públicas de Unsplash + del bucket de demo-inmo)
      // y el mismo desarrollo/servicio que tiene la copia de referencia
      // http://demo-inmo.localhost:3010 — así las 3 demos públicas quedan
      // igual de completas que esa, en vez del set más chico de antes.
      const development = await tx.estateDevelopment.create({
        data: {
          tenantId: tenant.id,
          name: "Patios del Parque",
          address: "Dirección ficticia 200",
          city: "Córdoba",
          latitude: "-31.646251",
          longitude: "-60.7064227",
          stage: "CONSTRUCTION",
          description:
            "Proyecto de demostración con espacios verdes y unidades amplias.",
          videoUrl: "https://www.youtube.com/watch?v=YFE2QphQUKs",
          published: true,
          images: {
            create: [
              "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&q=75&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=75&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1571055107559-3e67626fa8be?w=1200&q=75&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=75&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1200&q=75&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1200&q=75&auto=format&fit=crop",
            ].map((url, order) => ({ url, order })),
          },
        },
      });
      await tx.service.create({
        data: {
          tenantId: tenant.id,
          title: "Tasación",
          formTitle: "Solicitá tu presupuesto",
          description:
            "Pedí la tasación de tu propiedad y te contactamos con un valor de referencia según el mercado actual, la zona y el estado del inmueble.",
          images: {
            create: [
              "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&q=75&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=1200&q=75&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=1200&q=75&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1460317442991-0ec209397118?w=1200&q=75&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1518005020951-eccb494ad742?w=1200&q=75&auto=format&fit=crop",
              "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=75&auto=format&fit=crop",
            ].map((url, order) => ({ url, order })),
          },
          fields: {
            create: [
              { label: "Nombre y apellido", type: "TEXT", required: true, order: 0 },
              { label: "Teléfono", type: "PHONE", required: true, order: 1 },
            ],
          },
        },
      });
      const specs = [
        {
          code: "HZ-001",
          title: "Casa con jardín en zona norte",
          propertyType: "Casa",
          city: "Córdoba",
          neighborhood: "Cerro de las Rosas",
          bedrooms: 3,
          bathrooms: 2,
          garages: 2,
          coveredArea: "160",
          totalArea: "350",
          latitude: "-31.3891",
          longitude: "-64.2246",
          featured: true,
          sale: "185000",
          rent: null,
          media: ["https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1200&q=75&auto=format&fit=crop"],
        },
        {
          code: "HZ-002",
          title: "Departamento luminoso con balcón",
          propertyType: "Departamento",
          city: "Córdoba",
          neighborhood: "Nueva Córdoba",
          bedrooms: 2,
          bathrooms: 1,
          garages: 1,
          coveredArea: "75",
          totalArea: "88",
          latitude: "-31.4257",
          longitude: "-64.1888",
          featured: false,
          sale: "98000",
          rent: "780000",
          media: ["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=75&auto=format&fit=crop"],
        },
        {
          code: "HZ-003",
          title: "Tu próximo hogar junto al parque",
          propertyType: "Departamento",
          city: "Córdoba",
          neighborhood: "General Paz",
          bedrooms: 1,
          bathrooms: 1,
          garages: 0,
          coveredArea: "48",
          totalArea: "56",
          latitude: "-31.4189",
          longitude: "-64.1755",
          featured: false,
          development: true,
          sale: "69000",
          rent: null,
          media: ["https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200&q=75&auto=format&fit=crop"],
        },
        {
          code: "HZ-004",
          title: "Casa de campo con quincho y pileta",
          propertyType: "Casa",
          city: "Córdoba",
          neighborhood: "Villa Belgrano",
          bedrooms: 4,
          bathrooms: 3,
          garages: 2,
          coveredArea: "240",
          totalArea: "600",
          latitude: "-31.3611",
          longitude: "-64.2394",
          featured: true,
          sale: "320000",
          rent: null,
          media: ["https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&q=75&auto=format&fit=crop"],
        },
        {
          code: "HZ-005",
          title: "PH a estrenar con patio propio",
          propertyType: "Departamento",
          city: "Córdoba",
          neighborhood: "Alta Córdoba",
          bedrooms: 2,
          bathrooms: 1,
          garages: 0,
          coveredArea: "62",
          totalArea: "70",
          latitude: "-31.3903",
          longitude: "-64.1815",
          featured: false,
          sale: null,
          rent: "420000",
          media: ["https://images.unsplash.com/photo-1523217582562-09d0def993a6?w=1200&q=75&auto=format&fit=crop"],
        },
        {
          code: "HZ-006",
          title: "Local comercial sobre avenida",
          propertyType: "Local",
          city: "Córdoba",
          neighborhood: "Nueva Córdoba",
          bedrooms: 0,
          bathrooms: 1,
          garages: 0,
          coveredArea: "90",
          totalArea: "90",
          latitude: "-31.427",
          longitude: "-64.187",
          featured: false,
          sale: null,
          rent: "650000",
          media: ["https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1200&q=75&auto=format&fit=crop"],
        },
        {
          code: "HZ-007",
          title: "Departamento con cochera en Güemes",
          propertyType: "Departamento",
          city: "Córdoba",
          neighborhood: "Güemes",
          bedrooms: 3,
          bathrooms: 2,
          garages: 1,
          coveredArea: "95",
          totalArea: "100",
          latitude: "-31.4269",
          longitude: "-64.1801",
          featured: false,
          sale: "135000",
          rent: "520000",
          media: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=75&auto=format&fit=crop"],
        },
        {
          code: "HZ-008",
          title: "Oficina luminosa en microcentro",
          propertyType: "Oficina",
          city: "Córdoba",
          neighborhood: "Centro",
          bedrooms: 0,
          bathrooms: 1,
          garages: 0,
          coveredArea: "55",
          totalArea: "55",
          latitude: "-31.4173",
          longitude: "-64.1833",
          featured: false,
          sale: "78000",
          rent: null,
          media: [
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=75&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1554995207-c18c203602cb?w=1200&q=75&auto=format&fit=crop",
          ],
        },
      ];
      const ids: string[] = [];
      for (const [i, spec] of specs.entries()) {
        const { sale, rent, media, development: onDevelopment, ...data } = spec;
        const p = await tx.estateProperty.create({
          data: {
            ...data,
            tenantId: tenant.id,
            address: `Dirección privada ficticia ${100 + i}`,
            ownerId: owner.id,
            developmentId: onDevelopment ? development.id : null,
            published: true,
            description:
              "Propiedad ficticia de demostración. Ambientes cómodos, buena iluminación y excelente distribución. Los datos y precios son ilustrativos.",
            listings: {
              // whatsapp fijo (no es un número real) para que el botón de
              // "Consultá por WhatsApp" aparezca en la ficha — es una de las
              // funcionalidades que se muestra en la landing.
              create: [
                ...(sale ? [{ operation: "SALE" as const, price: sale, currency: "USD", whatsapp: "3511234567" }] : []),
                ...(rent
                  ? [{ operation: "RENT" as const, price: rent, currency: "ARS", whatsapp: "3511234567" }]
                  : []),
              ],
            },
            media: { create: media.map((url, position) => ({ url, position })) },
          },
        });
        ids.push(p.id);
      }
      await tx.estateInquiry.create({
        data: {
          tenantId: tenant.id,
          propertyId: ids[1],
          contactId: prospect.id,
          message: "Me interesa coordinar una visita al departamento.",
          source: "WEB",
        },
      });
      const startsAt = new Date();
      startsAt.setDate(startsAt.getDate() + 1);
      startsAt.setHours(18, 0, 0, 0);
      await tx.estateVisit.create({
        data: {
          tenantId: tenant.id,
          propertyId: ids[1],
          contactId: prospect.id,
          agentName: "Equipo Horizonte",
          startsAt,
          endsAt: new Date(startsAt.getTime() + 3600000),
          status: "CONFIRMED",
        },
      });
      const contract = await tx.estateContract.create({
        data: {
          tenantId: tenant.id,
          propertyId: ids[0],
          contactId: prospect.id,
          reference: "DEMO-2026-001",
          startsAt: new Date("2026-01-01T15:00:00Z"),
          endsAt: new Date("2027-12-31T15:00:00Z"),
          amount: "650000",
          currency: "ARS",
          status: "ACTIVE",
          adjustmentNotes:
            "Condiciones ilustrativas; revisar según el contrato.",
        },
      });
      await tx.estateCharge.create({
        data: {
          tenantId: tenant.id,
          contractId: contract.id,
          concept: "Alquiler",
          period: "2026-09",
          dueAt: new Date("2026-09-10T15:00:00Z"),
          amount: "650000",
          currency: "ARS",
        },
      });
      const building = await tx.estateBuilding.create({
        data: {
          tenantId: tenant.id,
          name: "Edificio Horizonte (demo)",
          address: "Dirección ficticia 300",
        },
      });
      await tx.estateUnit.createMany({
        data: [
          {
            tenantId: tenant.id,
            buildingId: building.id,
            label: "1 A",
            responsibleName: owner.name,
            coefficient: "50",
          },
          {
            tenantId: tenant.id,
            buildingId: building.id,
            label: "1 B",
            responsibleName: prospect.name,
            coefficient: "50",
          },
        ],
      });
      await tx.estateMaintenance.create({
        data: {
          tenantId: tenant.id,
          propertyId: ids[0],
          title: "Revisión de una pérdida de agua",
          description:
            "Reclamo ficticio para mostrar el seguimiento de mantenimiento.",
          priority: "HIGH",
        },
      });
      await tx.estateValuation.create({
        data: {
          tenantId: tenant.id,
          contactId: owner.id,
          address: "Dirección ficticia 450",
          propertyType: "Casa",
          notes: "Solicita valoración para venta.",
        },
      });
    },
    { timeout: 15000 },
  );
}

async function main() {
  for (const subdomain of DEMO_SUBDOMAINS) {
    await resetTenant(subdomain);
    await seedTenant(subdomain);
    console.log(`Demo lista: http://${subdomain}.localhost:3010 (panel: /admin)`);
  }
  console.log(`Login (cualquier copia): ${DEMO_ADMIN_EMAIL} / ${DEMO_ADMIN_PASSWORD}`);
}

main().finally(() => db.$disconnect());
