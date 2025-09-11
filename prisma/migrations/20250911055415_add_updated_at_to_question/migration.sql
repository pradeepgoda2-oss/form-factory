-- AlterEnum
ALTER TYPE "public"."QuestionType" ADD VALUE 'file';

-- AlterTable
ALTER TABLE "public"."Question" ADD COLUMN     "fileAccept" TEXT,
ADD COLUMN     "fileMaxSizeMB" INTEGER,
ADD COLUMN     "fileMultiple" BOOLEAN,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
