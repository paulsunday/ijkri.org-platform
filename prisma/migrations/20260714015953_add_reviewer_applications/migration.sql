-- CreateEnum
CREATE TYPE "ReviewerApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "ReviewerApplication" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "userId" TEXT,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "affiliation" TEXT NOT NULL,
    "department" TEXT,
    "country" TEXT NOT NULL,
    "currentPosition" TEXT NOT NULL,
    "highestQualification" TEXT NOT NULL,
    "primaryField" TEXT NOT NULL,
    "secondaryFields" TEXT,
    "areasOfExpertise" TEXT NOT NULL,
    "researchInterests" TEXT,
    "orcid" TEXT,
    "googleScholarUrl" TEXT,
    "researchGateUrl" TEXT,
    "scopusId" TEXT,
    "webOfScienceId" TEXT,
    "profileUrl" TEXT,
    "yearsResearchExperience" INTEGER NOT NULL,
    "yearsReviewExperience" INTEGER,
    "publicationCount" INTEGER,
    "journalsReviewedFor" TEXT,
    "preferredTopics" TEXT,
    "availability" TEXT,
    "professionalStatement" TEXT NOT NULL,
    "cvUrl" TEXT,
    "recentPublicationUrl" TEXT,
    "conflictDeclaration" BOOLEAN NOT NULL,
    "ethicsAgreement" BOOLEAN NOT NULL,
    "dataConsent" BOOLEAN NOT NULL,
    "status" "ReviewerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewerApplication_journalId_idx" ON "ReviewerApplication"("journalId");

-- CreateIndex
CREATE INDEX "ReviewerApplication_userId_idx" ON "ReviewerApplication"("userId");

-- CreateIndex
CREATE INDEX "ReviewerApplication_email_idx" ON "ReviewerApplication"("email");

-- CreateIndex
CREATE INDEX "ReviewerApplication_status_idx" ON "ReviewerApplication"("status");

-- CreateIndex
CREATE INDEX "ReviewerApplication_reviewedById_idx" ON "ReviewerApplication"("reviewedById");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewerApplication_journalId_email_key" ON "ReviewerApplication"("journalId", "email");

-- AddForeignKey
ALTER TABLE "ReviewerApplication" ADD CONSTRAINT "ReviewerApplication_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerApplication" ADD CONSTRAINT "ReviewerApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerApplication" ADD CONSTRAINT "ReviewerApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
