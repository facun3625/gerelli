CREATE TABLE "EstatePageView" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "propertyId" TEXT,
    "path" TEXT NOT NULL,
    "visitorId" TEXT,
    "referrer" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstatePageView_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EstatePageView_tenantId_createdAt_idx" ON "EstatePageView"("tenantId", "createdAt");
CREATE INDEX "EstatePageView_tenantId_propertyId_createdAt_idx" ON "EstatePageView"("tenantId", "propertyId", "createdAt");
CREATE INDEX "EstatePageView_tenantId_path_createdAt_idx" ON "EstatePageView"("tenantId", "path", "createdAt");

ALTER TABLE "EstatePageView"
ADD CONSTRAINT "EstatePageView_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "EstatePageView"
ADD CONSTRAINT "EstatePageView_propertyId_tenantId_fkey"
FOREIGN KEY ("propertyId", "tenantId") REFERENCES "EstateProperty"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
