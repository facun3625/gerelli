-- CreateTable
CREATE TABLE "EstatePropertyFavorite" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstatePropertyFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EstatePropertyFavorite_tenantId_userId_idx" ON "EstatePropertyFavorite"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "EstatePropertyFavorite_userId_propertyId_key" ON "EstatePropertyFavorite"("userId", "propertyId");

-- AddForeignKey
ALTER TABLE "EstatePropertyFavorite" ADD CONSTRAINT "EstatePropertyFavorite_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstatePropertyFavorite" ADD CONSTRAINT "EstatePropertyFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstatePropertyFavorite" ADD CONSTRAINT "EstatePropertyFavorite_propertyId_tenantId_fkey" FOREIGN KEY ("propertyId", "tenantId") REFERENCES "EstateProperty"("id", "tenantId") ON DELETE CASCADE ON UPDATE CASCADE;
