-- AlterTable
ALTER TABLE "EstateContact" ADD COLUMN     "portalEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "contactId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_contactId_key" ON "User"("contactId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "EstateContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

