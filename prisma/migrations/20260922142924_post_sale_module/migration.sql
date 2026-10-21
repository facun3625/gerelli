-- CreateEnum
CREATE TYPE "PostSaleContactKind" AS ENUM ('OWNER', 'TENANT');

-- CreateEnum
CREATE TYPE "PostSaleClaimStatus" AS ENUM ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'REJECTED', 'CLOSED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "postSaleContactId" TEXT;

-- CreateTable
CREATE TABLE "PostSaleDevelopment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostSaleDevelopment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostSaleUnit" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "developmentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "floor" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostSaleUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostSaleContact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "PostSaleContactKind" NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "taxId" TEXT,
    "invitedByContactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostSaleContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostSaleUnitMember" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostSaleUnitMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostSaleSection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "developmentId" TEXT,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostSaleSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostSaleRubro" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isCatchAll" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostSaleRubro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostSaleManager" (
    "userId" TEXT,
    "accessEnabled" BOOLEAN NOT NULL DEFAULT false,
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostSaleManager_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostSaleManagerBuilding" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "developmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostSaleManagerBuilding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostSaleProvider" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "specialty" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostSaleProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostSaleClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "developmentId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "rubroId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "PostSaleClaimStatus" NOT NULL DEFAULT 'NEW',
    "photos" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "internalNotes" TEXT,
    "assignedManagerId" TEXT,
    "assignedProviderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PostSaleClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PostSaleClaimEvent" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "status" "PostSaleClaimStatus" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostSaleClaimEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostSaleDevelopment_tenantId_name_idx" ON "PostSaleDevelopment"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PostSaleDevelopment_id_tenantId_key" ON "PostSaleDevelopment"("id", "tenantId");

-- CreateIndex
CREATE INDEX "PostSaleUnit_tenantId_developmentId_idx" ON "PostSaleUnit"("tenantId", "developmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PostSaleUnit_id_tenantId_key" ON "PostSaleUnit"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PostSaleUnit_developmentId_label_key" ON "PostSaleUnit"("developmentId", "label");

-- CreateIndex
CREATE INDEX "PostSaleContact_tenantId_taxId_idx" ON "PostSaleContact"("tenantId", "taxId");

-- CreateIndex
CREATE UNIQUE INDEX "PostSaleContact_id_tenantId_key" ON "PostSaleContact"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PostSaleContact_tenantId_taxId_key" ON "PostSaleContact"("tenantId", "taxId");

-- CreateIndex
CREATE INDEX "PostSaleUnitMember_tenantId_unitId_idx" ON "PostSaleUnitMember"("tenantId", "unitId");

-- CreateIndex
CREATE INDEX "PostSaleUnitMember_tenantId_contactId_idx" ON "PostSaleUnitMember"("tenantId", "contactId");

-- CreateIndex
CREATE UNIQUE INDEX "PostSaleUnitMember_unitId_contactId_key" ON "PostSaleUnitMember"("unitId", "contactId");

-- CreateIndex
CREATE INDEX "PostSaleSection_tenantId_developmentId_order_idx" ON "PostSaleSection"("tenantId", "developmentId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PostSaleSection_id_tenantId_key" ON "PostSaleSection"("id", "tenantId");

-- CreateIndex
CREATE INDEX "PostSaleRubro_tenantId_sectionId_order_idx" ON "PostSaleRubro"("tenantId", "sectionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PostSaleRubro_id_tenantId_key" ON "PostSaleRubro"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "PostSaleManager_userId_key" ON "PostSaleManager"("userId");

-- CreateIndex
CREATE INDEX "PostSaleManager_tenantId_name_idx" ON "PostSaleManager"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PostSaleManager_id_tenantId_key" ON "PostSaleManager"("id", "tenantId");

-- CreateIndex
CREATE INDEX "PostSaleManagerBuilding_tenantId_developmentId_idx" ON "PostSaleManagerBuilding"("tenantId", "developmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PostSaleManagerBuilding_managerId_developmentId_key" ON "PostSaleManagerBuilding"("managerId", "developmentId");

-- CreateIndex
CREATE INDEX "PostSaleProvider_tenantId_name_idx" ON "PostSaleProvider"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "PostSaleProvider_id_tenantId_key" ON "PostSaleProvider"("id", "tenantId");

-- CreateIndex
CREATE INDEX "PostSaleClaim_tenantId_status_createdAt_idx" ON "PostSaleClaim"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PostSaleClaim_tenantId_developmentId_idx" ON "PostSaleClaim"("tenantId", "developmentId");

-- CreateIndex
CREATE INDEX "PostSaleClaim_tenantId_unitId_idx" ON "PostSaleClaim"("tenantId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "PostSaleClaim_id_tenantId_key" ON "PostSaleClaim"("id", "tenantId");

-- CreateIndex
CREATE INDEX "PostSaleClaimEvent_claimId_createdAt_idx" ON "PostSaleClaimEvent"("claimId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_postSaleContactId_key" ON "User"("postSaleContactId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_postSaleContactId_fkey" FOREIGN KEY ("postSaleContactId") REFERENCES "PostSaleContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleDevelopment" ADD CONSTRAINT "PostSaleDevelopment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleUnit" ADD CONSTRAINT "PostSaleUnit_developmentId_tenantId_fkey" FOREIGN KEY ("developmentId", "tenantId") REFERENCES "PostSaleDevelopment"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleUnit" ADD CONSTRAINT "PostSaleUnit_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleContact" ADD CONSTRAINT "PostSaleContact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleContact" ADD CONSTRAINT "PostSaleContact_invitedByContactId_fkey" FOREIGN KEY ("invitedByContactId") REFERENCES "PostSaleContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleUnitMember" ADD CONSTRAINT "PostSaleUnitMember_unitId_tenantId_fkey" FOREIGN KEY ("unitId", "tenantId") REFERENCES "PostSaleUnit"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleUnitMember" ADD CONSTRAINT "PostSaleUnitMember_contactId_tenantId_fkey" FOREIGN KEY ("contactId", "tenantId") REFERENCES "PostSaleContact"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleUnitMember" ADD CONSTRAINT "PostSaleUnitMember_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleSection" ADD CONSTRAINT "PostSaleSection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleSection" ADD CONSTRAINT "PostSaleSection_developmentId_tenantId_fkey" FOREIGN KEY ("developmentId", "tenantId") REFERENCES "PostSaleDevelopment"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleRubro" ADD CONSTRAINT "PostSaleRubro_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleRubro" ADD CONSTRAINT "PostSaleRubro_sectionId_tenantId_fkey" FOREIGN KEY ("sectionId", "tenantId") REFERENCES "PostSaleSection"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleManager" ADD CONSTRAINT "PostSaleManager_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleManager" ADD CONSTRAINT "PostSaleManager_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleManagerBuilding" ADD CONSTRAINT "PostSaleManagerBuilding_managerId_tenantId_fkey" FOREIGN KEY ("managerId", "tenantId") REFERENCES "PostSaleManager"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleManagerBuilding" ADD CONSTRAINT "PostSaleManagerBuilding_developmentId_tenantId_fkey" FOREIGN KEY ("developmentId", "tenantId") REFERENCES "PostSaleDevelopment"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleManagerBuilding" ADD CONSTRAINT "PostSaleManagerBuilding_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleProvider" ADD CONSTRAINT "PostSaleProvider_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleClaim" ADD CONSTRAINT "PostSaleClaim_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleClaim" ADD CONSTRAINT "PostSaleClaim_developmentId_tenantId_fkey" FOREIGN KEY ("developmentId", "tenantId") REFERENCES "PostSaleDevelopment"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleClaim" ADD CONSTRAINT "PostSaleClaim_unitId_tenantId_fkey" FOREIGN KEY ("unitId", "tenantId") REFERENCES "PostSaleUnit"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleClaim" ADD CONSTRAINT "PostSaleClaim_contactId_tenantId_fkey" FOREIGN KEY ("contactId", "tenantId") REFERENCES "PostSaleContact"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleClaim" ADD CONSTRAINT "PostSaleClaim_sectionId_tenantId_fkey" FOREIGN KEY ("sectionId", "tenantId") REFERENCES "PostSaleSection"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleClaim" ADD CONSTRAINT "PostSaleClaim_rubroId_tenantId_fkey" FOREIGN KEY ("rubroId", "tenantId") REFERENCES "PostSaleRubro"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleClaim" ADD CONSTRAINT "PostSaleClaim_assignedManagerId_fkey" FOREIGN KEY ("assignedManagerId") REFERENCES "PostSaleManager"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleClaim" ADD CONSTRAINT "PostSaleClaim_assignedProviderId_fkey" FOREIGN KEY ("assignedProviderId") REFERENCES "PostSaleProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PostSaleClaimEvent" ADD CONSTRAINT "PostSaleClaimEvent_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "PostSaleClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

