-- CreateEnum
CREATE TYPE "CareerApplicationStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "CareerPosition" AS ENUM ('EDITOR_IN_CHIEF', 'MANAGING_EDITOR', 'SECTION_EDITOR', 'REVIEWER', 'COPYEDITOR', 'PROOFREADER', 'TYPESETTER', 'EDITORIAL_ASSISTANT');

-- CreateTable
CREATE TABLE "CareerApplication" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "userId" TEXT,
    "position" "CareerPosition" NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "country" TEXT NOT NULL,
    "affiliation" TEXT,
    "department" TEXT,
    "currentPosition" TEXT,
    "highestQualification" TEXT NOT NULL,
    "fieldOfStudy" TEXT,
    "yearsExperience" INTEGER NOT NULL,
    "publicationCount" INTEGER,
    "areasOfExpertise" TEXT,
    "professionalSkills" TEXT,
    "orcid" TEXT,
    "googleScholarUrl" TEXT,
    "researchGateUrl" TEXT,
    "linkedinUrl" TEXT,
    "scopusId" TEXT,
    "webOfScienceId" TEXT,
    "cvUrl" TEXT,
    "coverLetterUrl" TEXT,
    "certificatesUrl" TEXT,
    "portfolioUrl" TEXT,
    "professionalStatement" TEXT NOT NULL,
    "availability" TEXT,
    "salaryExpectation" TEXT,
    "consentAccepted" BOOLEAN NOT NULL DEFAULT false,
    "declarationAccepted" BOOLEAN NOT NULL DEFAULT false,
    "status" "CareerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "reviewNotes" TEXT,
    "interviewDate" TIMESTAMP(3),
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CareerApplication_journalId_idx" ON "CareerApplication"("journalId");

-- CreateIndex
CREATE INDEX "CareerApplication_userId_idx" ON "CareerApplication"("userId");

-- CreateIndex
CREATE INDEX "CareerApplication_email_idx" ON "CareerApplication"("email");

-- CreateIndex
CREATE INDEX "CareerApplication_position_idx" ON "CareerApplication"("position");

-- CreateIndex
CREATE INDEX "CareerApplication_status_idx" ON "CareerApplication"("status");

-- CreateIndex
CREATE INDEX "CareerApplication_reviewedById_idx" ON "CareerApplication"("reviewedById");

-- AddForeignKey
ALTER TABLE "CareerApplication" ADD CONSTRAINT "CareerApplication_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerApplication" ADD CONSTRAINT "CareerApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerApplication" ADD CONSTRAINT "CareerApplication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
