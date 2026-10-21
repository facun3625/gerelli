ALTER TABLE "EstateDevelopment"
ADD COLUMN "developer" TEXT NOT NULL DEFAULT '',
ADD COLUMN "progress" INTEGER,
ADD COLUMN "estimatedDelivery" TEXT,
ADD COLUMN "descriptionColumns" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "financing" TEXT NOT NULL DEFAULT '',
ADD COLUMN "videoUrl" TEXT,
ADD COLUMN "formTitle" TEXT NOT NULL DEFAULT 'Consultá por este emprendimiento',
ADD COLUMN "submitLabel" TEXT NOT NULL DEFAULT 'Enviar consulta',
ADD COLUMN "published" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "EstateDevelopment_tenantId_published_createdAt_idx" ON "EstateDevelopment"("tenantId", "published", "createdAt");

CREATE TABLE "EstateDevelopmentField" (
  "id" TEXT NOT NULL,
  "developmentId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" "ServiceFieldType" NOT NULL DEFAULT 'TEXT',
  "required" BOOLEAN NOT NULL DEFAULT false,
  "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "EstateDevelopmentField_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EstateDevelopmentField_developmentId_order_idx" ON "EstateDevelopmentField"("developmentId", "order");
ALTER TABLE "EstateDevelopmentField" ADD CONSTRAINT "EstateDevelopmentField_developmentId_fkey" FOREIGN KEY ("developmentId") REFERENCES "EstateDevelopment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EstateDevelopmentImage" (
  "id" TEXT NOT NULL,
  "developmentId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "EstateDevelopmentImage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EstateDevelopmentImage_developmentId_order_idx" ON "EstateDevelopmentImage"("developmentId", "order");
ALTER TABLE "EstateDevelopmentImage" ADD CONSTRAINT "EstateDevelopmentImage_developmentId_fkey" FOREIGN KEY ("developmentId") REFERENCES "EstateDevelopment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "EstateDevelopmentInquiry" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "developmentId" TEXT,
  "developmentName" TEXT NOT NULL,
  "answers" JSONB NOT NULL,
  "status" "ServiceInquiryStatus" NOT NULL DEFAULT 'NEW',
  "internalNotes" TEXT,
  "telegramSent" BOOLEAN NOT NULL DEFAULT false,
  "emailSent" BOOLEAN NOT NULL DEFAULT false,
  "notificationError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EstateDevelopmentInquiry_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "EstateDevelopmentInquiry_id_tenantId_key" ON "EstateDevelopmentInquiry"("id", "tenantId");
CREATE INDEX "EstateDevelopmentInquiry_tenantId_status_createdAt_idx" ON "EstateDevelopmentInquiry"("tenantId", "status", "createdAt");
CREATE INDEX "EstateDevelopmentInquiry_developmentId_idx" ON "EstateDevelopmentInquiry"("developmentId");
ALTER TABLE "EstateDevelopmentInquiry" ADD CONSTRAINT "EstateDevelopmentInquiry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EstateDevelopmentInquiry" ADD CONSTRAINT "EstateDevelopmentInquiry_developmentId_fkey" FOREIGN KEY ("developmentId") REFERENCES "EstateDevelopment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "EstateDevelopmentInquiryEvent" (
  "id" TEXT NOT NULL,
  "inquiryId" TEXT NOT NULL,
  "status" "ServiceInquiryStatus" NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EstateDevelopmentInquiryEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "EstateDevelopmentInquiryEvent_inquiryId_createdAt_idx" ON "EstateDevelopmentInquiryEvent"("inquiryId", "createdAt");
ALTER TABLE "EstateDevelopmentInquiryEvent" ADD CONSTRAINT "EstateDevelopmentInquiryEvent_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "EstateDevelopmentInquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
