-- Restore the fixed "temporary" flag before dropping the columns that replaced it
ALTER TABLE "EstateListing" ADD COLUMN "temporary" BOOLEAN NOT NULL DEFAULT false;

UPDATE "EstateListing" SET "temporary" = ("pricePeriod" = 'día');

ALTER TABLE "EstateListing" DROP COLUMN "operationTypeName";
ALTER TABLE "EstateListing" DROP COLUMN "pricePeriod";

ALTER TABLE "EstateOperationType" DROP CONSTRAINT "EstateOperationType_tenantId_fkey";
DROP TABLE "EstateOperationType";
