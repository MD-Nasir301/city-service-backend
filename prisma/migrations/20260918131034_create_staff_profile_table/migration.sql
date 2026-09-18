/*
  Warnings:

  - You are about to drop the column `department` on the `user` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "user" DROP COLUMN "department";

-- CreateTable
CREATE TABLE "staff_profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "designation" TEXT,
    "qualification" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "joiningDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_profile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "staff_profile_userId_key" ON "staff_profile"("userId");

-- AddForeignKey
ALTER TABLE "staff_profile" ADD CONSTRAINT "staff_profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
