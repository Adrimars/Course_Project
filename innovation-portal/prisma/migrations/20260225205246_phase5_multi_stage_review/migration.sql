-- CreateEnum
CREATE TYPE "StageDecision" AS ENUM ('APPROVED', 'REJECTED', 'RETURNED');

-- AlterTable
ALTER TABLE "ideas" ADD COLUMN     "currentStageOrder" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "pipelineId" TEXT;

-- CreateTable
CREATE TABLE "review_pipelines" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_stages" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" VARCHAR(1000),
    "stageOrder" INTEGER NOT NULL,
    "reviewerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "review_stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_reviews" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" "StageDecision" NOT NULL,
    "feedback" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "review_stages_pipelineId_stageOrder_key" ON "review_stages"("pipelineId", "stageOrder");

-- AddForeignKey
ALTER TABLE "ideas" ADD CONSTRAINT "ideas_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "review_pipelines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_stages" ADD CONSTRAINT "review_stages_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "review_pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_stages" ADD CONSTRAINT "review_stages_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_reviews" ADD CONSTRAINT "stage_reviews_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_reviews" ADD CONSTRAINT "stage_reviews_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "review_stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_reviews" ADD CONSTRAINT "stage_reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
