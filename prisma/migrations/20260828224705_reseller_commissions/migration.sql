-- CreateEnum
CREATE TYPE "ResellerCommissionType" AS ENUM ('RECURRING', 'ACTIVATION_BONUS');

-- CreateEnum
CREATE TYPE "ResellerCommissionStatus" AS ENUM ('PENDING', 'PAID');

-- CreateTable
CREATE TABLE "ResellerSettings" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "activationBonusAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "activationBonusDays" INTEGER NOT NULL DEFAULT 60,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResellerSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResellerCommissionTier" (
    "id" TEXT NOT NULL,
    "minActiveStores" INTEGER NOT NULL,
    "percent" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResellerCommissionTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResellerCommission" (
    "id" TEXT NOT NULL,
    "resellerId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ResellerCommissionType" NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "percentApplied" DECIMAL(65,30),
    "status" "ResellerCommissionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "billingPaymentId" TEXT,

    CONSTRAINT "ResellerCommission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ResellerCommissionTier_minActiveStores_key" ON "ResellerCommissionTier"("minActiveStores");

-- CreateIndex
CREATE UNIQUE INDEX "ResellerCommission_billingPaymentId_key" ON "ResellerCommission"("billingPaymentId");

-- CreateIndex
CREATE INDEX "ResellerCommission_resellerId_idx" ON "ResellerCommission"("resellerId");

-- CreateIndex
CREATE INDEX "ResellerCommission_tenantId_idx" ON "ResellerCommission"("tenantId");

-- AddForeignKey
ALTER TABLE "ResellerCommission" ADD CONSTRAINT "ResellerCommission_billingPaymentId_fkey" FOREIGN KEY ("billingPaymentId") REFERENCES "BillingPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResellerCommission" ADD CONSTRAINT "ResellerCommission_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResellerCommission" ADD CONSTRAINT "ResellerCommission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

