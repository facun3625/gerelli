-- AlterTable
ALTER TABLE "SiteVisit" ADD COLUMN     "referrer" TEXT,
ADD COLUMN     "userAgent" TEXT,
ADD COLUMN     "visitorId" TEXT;
