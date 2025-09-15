-- AlterTable
ALTER TABLE "public"."Form" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Form_sortOrder_idx" ON "public"."Form"("sortOrder");
