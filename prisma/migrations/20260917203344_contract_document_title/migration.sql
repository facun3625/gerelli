/*
  Warnings:

  - Added the required column `title` to the `EstateContractDocument` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "EstateContractDocument" ADD COLUMN     "title" TEXT NOT NULL;
