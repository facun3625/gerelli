-- CreateTable
CREATE TABLE "PromotionCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "durationMonths" INTEGER NOT NULL DEFAULT 12,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PromotionCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromotionRedemption" (
    "id" TEXT NOT NULL,
    "promotionCodeId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromotionRedemption_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "pendingPromotionCodeId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PromotionCode_code_key" ON "PromotionCode"("code");
CREATE UNIQUE INDEX "PromotionRedemption_tenantId_key" ON "PromotionRedemption"("tenantId");
CREATE INDEX "PromotionRedemption_promotionCodeId_idx" ON "PromotionRedemption"("promotionCodeId");

-- AddForeignKey
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_promotionCodeId_fkey" FOREIGN KEY ("promotionCodeId") REFERENCES "PromotionCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PromotionRedemption" ADD CONSTRAINT "PromotionRedemption_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "User" ADD CONSTRAINT "User_pendingPromotionCodeId_fkey" FOREIGN KEY ("pendingPromotionCodeId") REFERENCES "PromotionCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
