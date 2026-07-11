/*
  Warnings:

  - A unique constraint covering the columns `[submissionId,reviewerId,reviewRound]` on the table `ReviewAssignment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ReviewAssignment_submissionId_reviewerId_key";

-- AlterTable
ALTER TABLE "ReviewAssignment" ADD COLUMN     "reviewRound" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "submissionVersionId" TEXT;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "currentReviewRound" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "ReviewAssignment_submissionId_idx" ON "ReviewAssignment"("submissionId");

-- CreateIndex
CREATE INDEX "ReviewAssignment_submissionVersionId_idx" ON "ReviewAssignment"("submissionVersionId");

-- CreateIndex
CREATE INDEX "ReviewAssignment_reviewRound_idx" ON "ReviewAssignment"("reviewRound");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewAssignment_submissionId_reviewerId_reviewRound_key" ON "ReviewAssignment"("submissionId", "reviewerId", "reviewRound");

-- AddForeignKey
ALTER TABLE "ReviewAssignment" ADD CONSTRAINT "ReviewAssignment_submissionVersionId_fkey" FOREIGN KEY ("submissionVersionId") REFERENCES "SubmissionVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
