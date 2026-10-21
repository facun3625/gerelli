-- AlterTable
ALTER TABLE "Plan" ADD COLUMN     "allowAiAgent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "maxAiMessagesPerMonth" INTEGER;

-- CreateTable
CREATE TABLE "EstateAiConversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contactName" TEXT,
    "contactPhone" TEXT,
    "leadCreated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateAiConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstateAiMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstateAiMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EstateAiConversation_tenantId_createdAt_idx" ON "EstateAiConversation"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "EstateAiMessage_conversationId_idx" ON "EstateAiMessage"("conversationId");

-- AddForeignKey
ALTER TABLE "EstateAiConversation" ADD CONSTRAINT "EstateAiConversation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstateAiMessage" ADD CONSTRAINT "EstateAiMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "EstateAiConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
