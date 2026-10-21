-- AlterTable
ALTER TABLE "PlatformBillingSettings" ADD COLUMN     "marketingInstagramEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "marketingInstagramUsername" TEXT;
