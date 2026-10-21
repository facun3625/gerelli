-- CreateEnum
CREATE TYPE "DomainRequestStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE');

-- CreateTable
CREATE TABLE "DomainRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "domainOptions" TEXT[],
    "notes" TEXT,
    "status" "DomainRequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DomainRequest_tenantId_idx" ON "DomainRequest"("tenantId");

-- AddForeignKey
ALTER TABLE "DomainRequest" ADD CONSTRAINT "DomainRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
