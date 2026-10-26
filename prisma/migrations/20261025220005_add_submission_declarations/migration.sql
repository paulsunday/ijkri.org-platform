-- AlterTable
ALTER TABLE "Submission" ADD COLUMN "declarationOriginalWork" BOOLEAN,
ADD COLUMN "declarationNotUnderReview" BOOLEAN,
ADD COLUMN "declarationConflictOfInterest" BOOLEAN,
ADD COLUMN "declarationEthicsApproval" TEXT,
ADD COLUMN "declarationPolicyConsent" BOOLEAN,
ADD COLUMN "declarationsAcceptedAt" TIMESTAMP(3);
