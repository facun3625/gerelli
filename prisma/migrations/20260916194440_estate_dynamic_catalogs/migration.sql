-- AlterTable: add new EstateListing columns before dropping the old one
ALTER TABLE "EstateListing" ADD COLUMN "operationTypeName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "EstateListing" ADD COLUMN "pricePeriod" TEXT NOT NULL DEFAULT '';

-- Backfill from the old boolean flag before dropping it
UPDATE "EstateListing"
SET "pricePeriod" = CASE
      WHEN "temporary" THEN 'día'
      WHEN "operation" = 'RENT' THEN 'mes'
      ELSE ''
    END,
    "operationTypeName" = CASE
      WHEN "temporary" THEN 'Alquiler temporario'
      WHEN "operation" = 'RENT' THEN 'Alquiler'
      WHEN "operation" = 'SALE' THEN 'Venta'
      ELSE ''
    END;

ALTER TABLE "EstateListing" DROP COLUMN "temporary";

-- CreateTable
CREATE TABLE "EstatePropertyType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EstatePropertyType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateCity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EstateCity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateNeighborhood" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EstateNeighborhood_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateOperationType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "pricePeriod" TEXT NOT NULL DEFAULT '',
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EstateOperationType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EstatePropertyType_tenantId_idx" ON "EstatePropertyType"("tenantId");
CREATE UNIQUE INDEX "EstatePropertyType_tenantId_name_key" ON "EstatePropertyType"("tenantId", "name");

CREATE INDEX "EstateCity_tenantId_idx" ON "EstateCity"("tenantId");
CREATE UNIQUE INDEX "EstateCity_tenantId_name_key" ON "EstateCity"("tenantId", "name");

CREATE INDEX "EstateNeighborhood_tenantId_idx" ON "EstateNeighborhood"("tenantId");
CREATE UNIQUE INDEX "EstateNeighborhood_tenantId_name_key" ON "EstateNeighborhood"("tenantId", "name");

CREATE INDEX "EstateOperationType_tenantId_idx" ON "EstateOperationType"("tenantId");
CREATE UNIQUE INDEX "EstateOperationType_tenantId_name_key" ON "EstateOperationType"("tenantId", "name");

-- AddForeignKey
ALTER TABLE "EstatePropertyType" ADD CONSTRAINT "EstatePropertyType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EstateCity" ADD CONSTRAINT "EstateCity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EstateNeighborhood" ADD CONSTRAINT "EstateNeighborhood_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EstateOperationType" ADD CONSTRAINT "EstateOperationType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed default catalogs for every existing tenant so the admin form keeps working right after the migration
INSERT INTO "EstatePropertyType" ("id", "tenantId", "name", "order")
SELECT gen_random_uuid()::text, t."id", v.name, v.ord
FROM "Tenant" t
CROSS JOIN (VALUES
  ('Casa',0),('Departamento',1),('Terreno',2),('Local',3),('Oficina',4),('Galpón',5),('Campo',6),('Cochera',7)
) AS v(name, ord)
ON CONFLICT DO NOTHING;

INSERT INTO "EstateOperationType" ("id", "tenantId", "name", "kind", "pricePeriod", "order")
SELECT gen_random_uuid()::text, t."id", v.name, v.kind, v.period, v.ord
FROM "Tenant" t
CROSS JOIN (VALUES
  ('Venta','SALE','',0),
  ('Alquiler','RENT','mes',1),
  ('Alquiler temporario','RENT','día',2)
) AS v(name, kind, period, ord)
ON CONFLICT DO NOTHING;

-- Seed cities/neighborhoods from whatever existing properties already use, so nothing already published loses its option
INSERT INTO "EstateCity" ("id", "tenantId", "name", "order")
SELECT gen_random_uuid()::text, sub."tenantId", sub."city", sub.rn - 1
FROM (
  SELECT DISTINCT "tenantId", "city", ROW_NUMBER() OVER (PARTITION BY "tenantId" ORDER BY "city") AS rn
  FROM "EstateProperty"
  WHERE "city" IS NOT NULL AND "city" <> ''
) sub
ON CONFLICT DO NOTHING;

INSERT INTO "EstateNeighborhood" ("id", "tenantId", "name", "order")
SELECT gen_random_uuid()::text, sub."tenantId", sub."neighborhood", sub.rn - 1
FROM (
  SELECT DISTINCT "tenantId", "neighborhood", ROW_NUMBER() OVER (PARTITION BY "tenantId" ORDER BY "neighborhood") AS rn
  FROM "EstateProperty"
  WHERE "neighborhood" IS NOT NULL AND "neighborhood" <> ''
) sub
ON CONFLICT DO NOTHING;
