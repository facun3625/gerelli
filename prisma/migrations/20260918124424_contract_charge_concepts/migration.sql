-- CreateTable
CREATE TABLE "EstateContractChargeConcept" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastAmount" DECIMAL(16,2),
    "lastCurrency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateContractChargeConcept_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EstateContractChargeConcept_tenantId_contractId_idx" ON "EstateContractChargeConcept"("tenantId", "contractId");

-- AddForeignKey
ALTER TABLE "EstateContractChargeConcept" ADD CONSTRAINT "EstateContractChargeConcept_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateContractChargeConcept" ADD CONSTRAINT "EstateContractChargeConcept_contractId_tenantId_fkey" FOREIGN KEY ("contractId", "tenantId") REFERENCES "EstateContract"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
