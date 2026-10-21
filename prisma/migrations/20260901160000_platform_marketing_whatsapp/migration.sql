ALTER TABLE "PlatformBillingSettings"
  ADD COLUMN "marketingWhatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "marketingWhatsappNumber" TEXT,
  ADD COLUMN "marketingWhatsappMessage" TEXT;
