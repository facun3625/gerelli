-- CreateTable
CREATE TABLE "DemoVisit" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subdomain" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoVisit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoVisit_createdAt_idx" ON "DemoVisit"("createdAt");
