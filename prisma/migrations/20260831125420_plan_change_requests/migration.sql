-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "requestedPlanAt" TIMESTAMP(3),
ADD COLUMN     "requestedPlanId" TEXT;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_requestedPlanId_fkey" FOREIGN KEY ("requestedPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

