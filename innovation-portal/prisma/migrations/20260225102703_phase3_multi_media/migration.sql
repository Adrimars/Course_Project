-- DropIndex
DROP INDEX "attachments_ideaId_key";

-- AlterTable
ALTER TABLE "attachments" ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ideas" ADD COLUMN     "videoLinks" JSONB;
