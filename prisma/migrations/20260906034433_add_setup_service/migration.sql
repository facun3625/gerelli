-- AlterTable
ALTER TABLE "PlatformBillingSettings" ADD COLUMN     "setupServiceEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "setupServicePrice" DECIMAL(65,30) NOT NULL DEFAULT 0,
ADD COLUMN     "setupServiceSteps" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "SalesBotConversation" ADD COLUMN     "topic" TEXT;
