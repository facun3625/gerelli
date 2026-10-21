-- CreateTable
CREATE TABLE "SalesBotConversation" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "needsHuman" BOOLEAN NOT NULL DEFAULT false,
    "contactName" TEXT,
    "contactPhone" TEXT,

    CONSTRAINT "SalesBotConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesBotMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesBotMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalesBotConversation_createdAt_idx" ON "SalesBotConversation"("createdAt");

-- CreateIndex
CREATE INDEX "SalesBotMessage_conversationId_idx" ON "SalesBotMessage"("conversationId");

-- AddForeignKey
ALTER TABLE "SalesBotMessage" ADD CONSTRAINT "SalesBotMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "SalesBotConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
