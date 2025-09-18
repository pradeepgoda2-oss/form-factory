/*
  Warnings:

  - You are about to drop the column `userEmail` on the `Response` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Response" DROP CONSTRAINT "Response_formId_fkey";

-- DropIndex
DROP INDEX "public"."Response_formId_createdAt_idx";

-- AlterTable
ALTER TABLE "public"."FormQuestion" ADD COLUMN     "col" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "order" INTEGER,
ADD COLUMN     "row" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "span" INTEGER NOT NULL DEFAULT 12;

-- AlterTable
ALTER TABLE "public"."Response" DROP COLUMN "userEmail",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "name" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Response" ADD CONSTRAINT "Response_formId_fkey" FOREIGN KEY ("formId") REFERENCES "public"."Form"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
