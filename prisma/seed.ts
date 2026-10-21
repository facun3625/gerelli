import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

async function main() {
  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL ?? "super@kubbo.app";
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD ?? "super123";
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@pedidos.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "admin123";
  const subdomain = process.env.SEED_TENANT_SUBDOMAIN ?? "demo";

  // tenantId es null para el super admin, y una unique compuesta no admite
  // null como valor de búsqueda (NULL nunca es igual a sí mismo en SQL) —
  // por eso esto va con findFirst + create/update en vez de upsert.
  const superAdminHash = await bcrypt.hash(superAdminPassword, 10);
  const existingSuperAdmin = await prisma.user.findFirst({
    where: { tenantId: null, email: superAdminEmail },
  });
  const superAdmin = existingSuperAdmin
    ? await prisma.user.update({
        where: { id: existingSuperAdmin.id },
        data: { role: "SUPER_ADMIN" },
      })
    : await prisma.user.create({
        data: {
          email: superAdminEmail,
          name: "Super Admin",
          role: "SUPER_ADMIN",
          passwordHash: superAdminHash,
        },
      });

  const tenant = await prisma.tenant.upsert({
    where: { subdomain },
    update: {},
    create: { subdomain },
  });

  const adminHash = await bcrypt.hash(adminPassword, 10);
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: adminEmail } },
    update: { role: "ADMIN" },
    create: {
      tenantId: tenant.id,
      email: adminEmail,
      name: "Admin",
      role: "ADMIN",
      passwordHash: adminHash,
    },
  });

  await prisma.settings.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: "store_name" } },
    update: {},
    create: { tenantId: tenant.id, key: "store_name", value: "Tsuki Demo" },
  });

  await prisma.paymentMethodConfig.upsert({
    where: { tenantId_type: { tenantId: tenant.id, type: "CASH_ON_DELIVERY" } },
    update: {},
    create: { tenantId: tenant.id, type: "CASH_ON_DELIVERY", enabled: true },
  });
  await prisma.paymentMethodConfig.upsert({
    where: { tenantId_type: { tenantId: tenant.id, type: "TRANSFER" } },
    update: {},
    create: { tenantId: tenant.id, type: "TRANSFER", enabled: false },
  });
  await prisma.paymentMethodConfig.upsert({
    where: { tenantId_type: { tenantId: tenant.id, type: "MERCADOPAGO" } },
    update: {},
    create: { tenantId: tenant.id, type: "MERCADOPAGO", enabled: false },
  });

  await prisma.fulfillmentMethodConfig.upsert({
    where: { tenantId_type: { tenantId: tenant.id, type: "DELIVERY" } },
    update: {},
    create: { tenantId: tenant.id, type: "DELIVERY", enabled: true },
  });
  await prisma.fulfillmentMethodConfig.upsert({
    where: { tenantId_type: { tenantId: tenant.id, type: "PICKUP" } },
    update: {},
    create: { tenantId: tenant.id, type: "PICKUP", enabled: false },
  });

  // Condiciones del programa de revendedores — arrancan con valores
  // razonables, 100% editables después desde /platform/revendedores.
  await prisma.resellerSettings.upsert({
    where: { id: "global" },
    update: {},
    create: { id: "global", activationBonusAmount: 5000, activationBonusDays: 60 },
  });
  const tierDefaults = [
    { minActiveStores: 0, percent: 15 },
    { minActiveStores: 10, percent: 20 },
    { minActiveStores: 25, percent: 25 },
  ];
  for (const tier of tierDefaults) {
    await prisma.resellerCommissionTier.upsert({
      where: { minActiveStores: tier.minActiveStores },
      update: {},
      create: tier,
    });
  }

  console.log(`Super admin -> ${superAdmin.email} / ${superAdminPassword} (login en /platform/login)`);
  console.log(`Tienda demo -> ${tenant.subdomain}.localhost:3000`);
  console.log(`Admin de tienda -> ${admin.email} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
