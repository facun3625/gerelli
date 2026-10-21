-- CreateTable
CREATE TABLE "EstateContractGuarantor" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateContractGuarantor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EstateContractGuarantor_tenantId_contractId_idx" ON "EstateContractGuarantor"("tenantId", "contractId");

-- CreateIndex
CREATE INDEX "EstateContractGuarantor_tenantId_contactId_idx" ON "EstateContractGuarantor"("tenantId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "EstateContractGuarantor_contractId_contactId_key" ON "EstateContractGuarantor"("contractId", "contactId");

-- AddForeignKey
ALTER TABLE "EstateContractGuarantor" ADD CONSTRAINT "EstateContractGuarantor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateContractGuarantor" ADD CONSTRAINT "EstateContractGuarantor_contractId_tenantId_fkey" FOREIGN KEY ("contractId", "tenantId") REFERENCES "EstateContract"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateContractGuarantor" ADD CONSTRAINT "EstateContractGuarantor_contactId_tenantId_fkey" FOREIGN KEY ("contactId", "tenantId") REFERENCES "EstateContact"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
