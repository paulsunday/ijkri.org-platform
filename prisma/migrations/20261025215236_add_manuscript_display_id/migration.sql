-- AlterTable
ALTER TABLE "Submission" ADD COLUMN "displayId" TEXT;

-- CreateTable
CREATE TABLE "ManuscriptSequence" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManuscriptSequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Submission_displayId_key" ON "Submission"("displayId");

-- CreateIndex
CREATE UNIQUE INDEX "ManuscriptSequence_journalId_year_key" ON "ManuscriptSequence"("journalId", "year");

-- AddForeignKey
ALTER TABLE "ManuscriptSequence" ADD CONSTRAINT "ManuscriptSequence_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
