/*
  Warnings:

  - You are about to drop the column `stripeSessionId` on the `payments` table. All the data in the column will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RequestStatus" ADD VALUE 'ASSIGNED';
ALTER TYPE "RequestStatus" ADD VALUE 'ACCEPTED';

-- DropIndex
DROP INDEX "payments_stripeSessionId_key";

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "stripeSessionId";
