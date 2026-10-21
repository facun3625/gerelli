-- AlterTable
ALTER TABLE "EstateContract" ADD COLUMN     "collectedBy" TEXT,
ADD COLUMN     "depositAmount" DECIMAL(16,2),
ADD COLUMN     "depositCurrency" TEXT,
ADD COLUMN     "depositHeldBy" TEXT,
ADD COLUMN     "depositInstallments" INTEGER,
ADD COLUMN     "depositStatus" TEXT,
ADD COLUMN     "dueDay" INTEGER,
ADD COLUMN     "firstChargePeriod" TEXT,
ADD COLUMN     "firstUpdateAt" TIMESTAMP(3),
ADD COLUMN     "graceDays" INTEGER,
ADD COLUMN     "guaranteeExpiresAt" TIMESTAMP(3),
ADD COLUMN     "guaranteeType" TEXT,
ADD COLUMN     "hasDeposit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lateFeeCap" DECIMAL(16,2),
ADD COLUMN     "lateFeeEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lateFeeFrequency" TEXT,
ADD COLUMN     "lateFeeFromDay" INTEGER,
ADD COLUMN     "lateFeeType" TEXT,
ADD COLUMN     "lateFeeValue" DECIMAL(16,2),
ADD COLUMN     "ownerAcceptedHandoverAt" TIMESTAMP(3),
ADD COLUMN     "paymentMethod" TEXT,
ADD COLUMN     "tenantAcceptedHandoverAt" TIMESTAMP(3),
ADD COLUMN     "updateFrequency" TEXT,
ADD COLUMN     "updatePercent" DECIMAL(6,2),
ADD COLUMN     "updateRounding" TEXT,
ADD COLUMN     "updateType" TEXT NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE "EstateContractDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'AGENCY_ONLY',
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateContractDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateContractHandoverPhoto" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateContractHandoverPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateRentIndexValue" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "index" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "percent" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "EstateRentIndexValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateBillingSuggestion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateBillingSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EstateContractDocument_tenantId_contractId_idx" ON "EstateContractDocument"("tenantId", "contractId");

-- CreateIndex
CREATE INDEX "EstateContractHandoverPhoto_tenantId_contractId_idx" ON "EstateContractHandoverPhoto"("tenantId", "contractId");

-- CreateIndex
CREATE INDEX "EstateRentIndexValue_tenantId_index_idx" ON "EstateRentIndexValue"("tenantId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "EstateRentIndexValue_tenantId_index_period_key" ON "EstateRentIndexValue"("tenantId", "index", "period");

-- CreateIndex
CREATE INDEX "EstateBillingSuggestion_tenantId_idx" ON "EstateBillingSuggestion"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "EstateBillingSuggestion_contractId_kind_period_key" ON "EstateBillingSuggestion"("contractId", "kind", "period");

-- AddForeignKey
ALTER TABLE "EstateContractDocument" ADD CONSTRAINT "EstateContractDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateContractDocument" ADD CONSTRAINT "EstateContractDocument_contractId_tenantId_fkey" FOREIGN KEY ("contractId", "tenantId") REFERENCES "EstateContract"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateContractHandoverPhoto" ADD CONSTRAINT "EstateContractHandoverPhoto_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateContractHandoverPhoto" ADD CONSTRAINT "EstateContractHandoverPhoto_contractId_tenantId_fkey" FOREIGN KEY ("contractId", "tenantId") REFERENCES "EstateContract"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateRentIndexValue" ADD CONSTRAINT "EstateRentIndexValue_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateBillingSuggestion" ADD CONSTRAINT "EstateBillingSuggestion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateBillingSuggestion" ADD CONSTRAINT "EstateBillingSuggestion_contractId_tenantId_fkey" FOREIGN KEY ("contractId", "tenantId") REFERENCES "EstateContract"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
