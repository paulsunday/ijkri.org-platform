-- CreateTable
CREATE TABLE "SubmissionAuthor" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "affiliation" TEXT,
    "department" TEXT,
    "country" TEXT,
    "orcid" TEXT,
    "isCorresponding" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubmissionAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubmissionAuthor_submissionId_idx" ON "SubmissionAuthor"("submissionId");

-- CreateIndex
CREATE INDEX "SubmissionAuthor_submissionId_sortOrder_idx" ON "SubmissionAuthor"("submissionId", "sortOrder");

-- AddForeignKey
ALTER TABLE "SubmissionAuthor" ADD CONSTRAINT "SubmissionAuthor_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
