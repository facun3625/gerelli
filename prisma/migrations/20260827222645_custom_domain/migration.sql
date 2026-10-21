-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "allowCustomDomain" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "customDomain" TEXT,
ADD COLUMN     "customDomainToken" TEXT,
ADD COLUMN     "customDomainVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_customDomain_key" ON "Tenant"("customDomain");
