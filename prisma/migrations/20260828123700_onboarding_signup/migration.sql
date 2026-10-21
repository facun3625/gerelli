-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingPaidAt" TIMESTAMP(3),
ADD COLUMN     "pendingPlanId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_pendingPlanId_fkey" FOREIGN KEY ("pendingPlanId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
