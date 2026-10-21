-- CreateTable
CREATE TABLE "EstateDeal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'NEGOTIATION',
    "amount" DECIMAL(16,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "agentName" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EstateDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateValuation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "amount" DECIMAL(16,2),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateValuation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EstateDeal_tenantId_stage_idx" ON "EstateDeal"("tenantId", "stage");

-- CreateIndex
CREATE INDEX "EstateValuation_tenantId_status_idx" ON "EstateValuation"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "EstateDeal" ADD CONSTRAINT "EstateDeal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateDeal" ADD CONSTRAINT "EstateDeal_propertyId_tenantId_fkey" FOREIGN KEY ("propertyId", "tenantId") REFERENCES "EstateProperty"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateDeal" ADD CONSTRAINT "EstateDeal_contactId_tenantId_fkey" FOREIGN KEY ("contactId", "tenantId") REFERENCES "EstateContact"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateValuation" ADD CONSTRAINT "EstateValuation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateValuation" ADD CONSTRAINT "EstateValuation_contactId_tenantId_fkey" FOREIGN KEY ("contactId", "tenantId") REFERENCES "EstateContact"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
