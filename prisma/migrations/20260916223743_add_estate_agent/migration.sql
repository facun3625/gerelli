-- CreateTable
CREATE TABLE "EstateAgent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateAgent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EstateAgent_tenantId_name_idx" ON "EstateAgent"("tenantId", "name");

-- AddForeignKey
ALTER TABLE "EstateAgent" ADD CONSTRAINT "EstateAgent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
