-- AlterTable
ALTER TABLE "Account" ADD COLUMN "tenantId" TEXT;

-- DropIndex
DROP INDEX "Account_provider_providerAccountId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Account_tenantId_provider_providerAccountId_key" ON "Account"("tenantId", "provider", "providerAccountId");
