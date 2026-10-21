-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "allowConsortium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowPostSale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowRealEstate" BOOLEAN NOT NULL DEFAULT true;
