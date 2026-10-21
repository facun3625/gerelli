-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "allowLoyalty" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowServices" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowStats" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowTelegram" BOOLEAN NOT NULL DEFAULT true;
