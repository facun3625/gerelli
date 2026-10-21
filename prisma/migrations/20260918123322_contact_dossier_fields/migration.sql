-- AlterTable
ALTER TABLE "EstateContact" ADD COLUMN     "address" TEXT,
ADD COLUMN     "birthDate" TIMESTAMP(3),
ADD COLUMN     "occupation" TEXT;

-- AlterTable
ALTER TABLE "EstateDevelopment" ALTER COLUMN "updatedAt" DROP DEFAULT;
