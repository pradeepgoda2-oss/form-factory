-- AlterTable
ALTER TABLE "public"."Response" ADD COLUMN     "userEmail" TEXT;

-- CreateIndex
CREATE INDEX "Response_formId_createdAt_idx" ON "public"."Response"("formId", "createdAt");
