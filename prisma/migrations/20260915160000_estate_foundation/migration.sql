-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "maxPublishedProperties" INTEGER;

-- CreateTable
CREATE TABLE "EstateContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT NOT NULL DEFAULT '',
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateDevelopment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'PROJECT',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateDevelopment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateProperty" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "propertyType" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "neighborhood" TEXT NOT NULL DEFAULT '',
    "bedrooms" INTEGER NOT NULL DEFAULT 0,
    "bathrooms" INTEGER NOT NULL DEFAULT 0,
    "garages" INTEGER NOT NULL DEFAULT 0,
    "coveredArea" DECIMAL(12,2),
    "totalArea" DECIMAL(12,2),
    "published" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,
    "developmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateListing" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "price" DECIMAL(16,2),
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',

    CONSTRAINT "EstateListing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateMedia" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EstateMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateInquiry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "propertyId" TEXT,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'ADMIN',
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateVisit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "notes" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "EstateVisit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateContract" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(16,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "adjustmentNotes" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateBuilding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateBuilding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "buildingId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "coefficient" DECIMAL(9,6) NOT NULL,
    "responsibleName" TEXT NOT NULL,

    CONSTRAINT "EstateUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateCharge" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT,
    "unitId" TEXT,
    "concept" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(16,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ARS',
    "cancelled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateCharge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateReceipt" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "chargeId" TEXT NOT NULL,
    "amount" DECIMAL(16,2) NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateMaintenance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "supplier" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateAuditEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EstateContact_tenantId_name_idx" ON "EstateContact"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "EstateContact_id_tenantId_key" ON "EstateContact"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EstateDevelopment_id_tenantId_key" ON "EstateDevelopment"("id", "tenantId");

-- CreateIndex
CREATE INDEX "EstateProperty_tenantId_published_city_idx" ON "EstateProperty"("tenantId", "published", "city");

-- CreateIndex
CREATE UNIQUE INDEX "EstateProperty_id_tenantId_key" ON "EstateProperty"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EstateProperty_tenantId_code_key" ON "EstateProperty"("tenantId", "code");

-- CreateIndex
CREATE INDEX "EstateListing_tenantId_status_idx" ON "EstateListing"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EstateListing_propertyId_operation_key" ON "EstateListing"("propertyId", "operation");

-- CreateIndex
CREATE INDEX "EstateMedia_tenantId_propertyId_idx" ON "EstateMedia"("tenantId", "propertyId");

-- CreateIndex
CREATE INDEX "EstateInquiry_tenantId_status_createdAt_idx" ON "EstateInquiry"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "EstateVisit_tenantId_startsAt_idx" ON "EstateVisit"("tenantId", "startsAt");

-- CreateIndex
CREATE INDEX "EstateContract_tenantId_endsAt_idx" ON "EstateContract"("tenantId", "endsAt");

-- CreateIndex
CREATE UNIQUE INDEX "EstateContract_id_tenantId_key" ON "EstateContract"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EstateContract_tenantId_reference_key" ON "EstateContract"("tenantId", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "EstateBuilding_id_tenantId_key" ON "EstateBuilding"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EstateUnit_id_tenantId_key" ON "EstateUnit"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EstateUnit_buildingId_label_key" ON "EstateUnit"("buildingId", "label");

-- CreateIndex
CREATE INDEX "EstateCharge_tenantId_dueAt_idx" ON "EstateCharge"("tenantId", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "EstateCharge_id_tenantId_key" ON "EstateCharge"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EstateCharge_contractId_period_concept_key" ON "EstateCharge"("contractId", "period", "concept");

-- CreateIndex
CREATE UNIQUE INDEX "EstateCharge_unitId_period_concept_key" ON "EstateCharge"("unitId", "period", "concept");

-- CreateIndex
CREATE UNIQUE INDEX "EstateReceipt_idempotencyKey_key" ON "EstateReceipt"("idempotencyKey");

-- CreateIndex
CREATE INDEX "EstateReceipt_tenantId_chargeId_idx" ON "EstateReceipt"("tenantId", "chargeId");

-- CreateIndex
CREATE INDEX "EstateMaintenance_tenantId_status_idx" ON "EstateMaintenance"("tenantId", "status");

-- CreateIndex
CREATE INDEX "EstateAuditEvent_tenantId_createdAt_idx" ON "EstateAuditEvent"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "EstateContact" ADD CONSTRAINT "EstateContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateDevelopment" ADD CONSTRAINT "EstateDevelopment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateProperty" ADD CONSTRAINT "EstateProperty_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateProperty" ADD CONSTRAINT "EstateProperty_ownerId_tenantId_fkey" FOREIGN KEY ("ownerId", "tenantId") REFERENCES "EstateContact"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateProperty" ADD CONSTRAINT "EstateProperty_developmentId_tenantId_fkey" FOREIGN KEY ("developmentId", "tenantId") REFERENCES "EstateDevelopment"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateListing" ADD CONSTRAINT "EstateListing_propertyId_tenantId_fkey" FOREIGN KEY ("propertyId", "tenantId") REFERENCES "EstateProperty"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateMedia" ADD CONSTRAINT "EstateMedia_propertyId_tenantId_fkey" FOREIGN KEY ("propertyId", "tenantId") REFERENCES "EstateProperty"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateInquiry" ADD CONSTRAINT "EstateInquiry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateInquiry" ADD CONSTRAINT "EstateInquiry_contactId_tenantId_fkey" FOREIGN KEY ("contactId", "tenantId") REFERENCES "EstateContact"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateInquiry" ADD CONSTRAINT "EstateInquiry_propertyId_tenantId_fkey" FOREIGN KEY ("propertyId", "tenantId") REFERENCES "EstateProperty"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateVisit" ADD CONSTRAINT "EstateVisit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateVisit" ADD CONSTRAINT "EstateVisit_propertyId_tenantId_fkey" FOREIGN KEY ("propertyId", "tenantId") REFERENCES "EstateProperty"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateVisit" ADD CONSTRAINT "EstateVisit_contactId_tenantId_fkey" FOREIGN KEY ("contactId", "tenantId") REFERENCES "EstateContact"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateContract" ADD CONSTRAINT "EstateContract_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateContract" ADD CONSTRAINT "EstateContract_propertyId_tenantId_fkey" FOREIGN KEY ("propertyId", "tenantId") REFERENCES "EstateProperty"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateContract" ADD CONSTRAINT "EstateContract_contactId_tenantId_fkey" FOREIGN KEY ("contactId", "tenantId") REFERENCES "EstateContact"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateBuilding" ADD CONSTRAINT "EstateBuilding_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateUnit" ADD CONSTRAINT "EstateUnit_buildingId_tenantId_fkey" FOREIGN KEY ("buildingId", "tenantId") REFERENCES "EstateBuilding"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateCharge" ADD CONSTRAINT "EstateCharge_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateCharge" ADD CONSTRAINT "EstateCharge_contractId_tenantId_fkey" FOREIGN KEY ("contractId", "tenantId") REFERENCES "EstateContract"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateCharge" ADD CONSTRAINT "EstateCharge_unitId_tenantId_fkey" FOREIGN KEY ("unitId", "tenantId") REFERENCES "EstateUnit"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateReceipt" ADD CONSTRAINT "EstateReceipt_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateReceipt" ADD CONSTRAINT "EstateReceipt_chargeId_tenantId_fkey" FOREIGN KEY ("chargeId", "tenantId") REFERENCES "EstateCharge"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateMaintenance" ADD CONSTRAINT "EstateMaintenance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateMaintenance" ADD CONSTRAINT "EstateMaintenance_propertyId_tenantId_fkey" FOREIGN KEY ("propertyId", "tenantId") REFERENCES "EstateProperty"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateAuditEvent" ADD CONSTRAINT "EstateAuditEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
