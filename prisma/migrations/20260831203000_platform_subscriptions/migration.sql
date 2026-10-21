CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'ANNUAL');

ALTER TABLE "Plan"
  ADD COLUMN "priceAnnual" DECIMAL(65,30),
  ADD COLUMN "trialDays" INTEGER NOT NULL DEFAULT 10;

ALTER TABLE "BillingPayment"
  ADD COLUMN "provider" TEXT,
  ADD COLUMN "providerPaymentId" TEXT,
  ADD COLUMN "providerSubscriptionId" TEXT;

ALTER TABLE "Tenant"
  ADD COLUMN "billingCycle" "BillingCycle",
  ADD COLUMN "providerSubscriptionId" TEXT,
  ADD COLUMN "providerSubscriptionStatus" TEXT,
  ADD COLUMN "subscriptionStartedAt" TIMESTAMP(3),
  ADD COLUMN "subscriptionSyncedAt" TIMESTAMP(3);

ALTER TABLE "User"
  ADD COLUMN "pendingBillingCycle" "BillingCycle",
  ADD COLUMN "pendingSubscriptionId" TEXT,
  ADD COLUMN "pendingSubscriptionStatus" TEXT;

CREATE TABLE "PlatformBillingSettings" (
  "id" TEXT NOT NULL DEFAULT 'global',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "currency" TEXT NOT NULL DEFAULT 'ARS',
  "graceDays" INTEGER NOT NULL DEFAULT 5,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PlatformBillingSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingWebhookEvent" (
  "id" TEXT NOT NULL,
  "eventKey" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "error" TEXT,
  "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  CONSTRAINT "BillingWebhookEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BillingPayment_providerPaymentId_key" ON "BillingPayment"("providerPaymentId");
CREATE UNIQUE INDEX "Tenant_providerSubscriptionId_key" ON "Tenant"("providerSubscriptionId");
CREATE UNIQUE INDEX "User_pendingSubscriptionId_key" ON "User"("pendingSubscriptionId");
CREATE UNIQUE INDEX "BillingWebhookEvent_eventKey_key" ON "BillingWebhookEvent"("eventKey");
