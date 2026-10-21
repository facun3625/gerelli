-- AlterEnum
ALTER TYPE "PostSaleClaimMessageSender" ADD VALUE 'PROVIDER';

-- AlterTable
ALTER TABLE "PostSaleProvider" ADD COLUMN     "accessEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PostSaleProvider_userId_key" ON "PostSaleProvider"("userId");

-- AddForeignKey
ALTER TABLE "PostSaleProvider" ADD CONSTRAINT "PostSaleProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

