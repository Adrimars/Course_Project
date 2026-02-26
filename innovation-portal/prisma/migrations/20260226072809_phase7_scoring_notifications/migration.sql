-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('STATUS_CHANGE', 'ASSIGNMENT', 'JOIN_REQUEST', 'SCORE_RECEIVED', 'FEEDBACK', 'SYSTEM');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "link" VARCHAR(500),
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idea_scores" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "scorerId" TEXT NOT NULL,
    "feasibility" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "novelty" INTEGER NOT NULL,
    "costEffectiveness" INTEGER NOT NULL,
    "comment" VARCHAR(2000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "idea_scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "idea_scores_ideaId_scorerId_key" ON "idea_scores"("ideaId", "scorerId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_scores" ADD CONSTRAINT "idea_scores_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idea_scores" ADD CONSTRAINT "idea_scores_scorerId_fkey" FOREIGN KEY ("scorerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
