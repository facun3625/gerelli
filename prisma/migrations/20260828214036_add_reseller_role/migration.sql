-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'RESELLER';

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "referredByResellerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pendingReferralCode" TEXT,
ADD COLUMN     "referralCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_referralCode_key" ON "User"("referralCode");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_referredByResellerId_fkey" FOREIGN KEY ("referredByResellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

