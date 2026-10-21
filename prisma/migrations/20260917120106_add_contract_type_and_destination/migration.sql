-- AlterTable
ALTER TABLE "EstateContract" ADD COLUMN     "contractType" TEXT,
ADD COLUMN     "propertyDestination" TEXT;

-- CreateTable
CREATE TABLE "EstateContractType" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EstateContractType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstatePropertyDestination" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EstatePropertyDestination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EstateContractType_tenantId_idx" ON "EstateContractType"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EstateContractType_tenantId_name_key" ON "EstateContractType"("tenantId", "name");

-- CreateIndex
CREATE INDEX "EstatePropertyDestination_tenantId_idx" ON "EstatePropertyDestination"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EstatePropertyDestination_tenantId_name_key" ON "EstatePropertyDestination"("tenantId", "name");

-- AddForeignKey
ALTER TABLE "EstateContractType" ADD CONSTRAINT "EstateContractType_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstatePropertyDestination" ADD CONSTRAINT "EstatePropertyDestination_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
