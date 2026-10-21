-- CreateEnum
CREATE TYPE "PostSaleClaimMessageSender" AS ENUM ('STAFF', 'OWNER');

-- AlterTable
ALTER TABLE "PostSaleClaim" ADD COLUMN     "ownerLastReadAt" TIMESTAMP(3),
ADD COLUMN     "staffLastReadAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PostSaleClaimMessage" (
    "id" TEXT NOT NULL,
    "claimId" TEXT NOT NULL,
    "sender" "PostSaleClaimMessageSender" NOT NULL,
    "senderName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PostSaleClaimMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PostSaleClaimMessage_claimId_createdAt_idx" ON "PostSaleClaimMessage"("claimId", "createdAt");

-- AddForeignKey
ALTER TABLE "PostSaleClaimMessage" ADD CONSTRAINT "PostSaleClaimMessage_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "PostSaleClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

