-- CreateEnum
CREATE TYPE "ScoreGrade" AS ENUM ('A_PLUS', 'A', 'B_PLUS', 'B', 'C');

-- CreateEnum
CREATE TYPE "ScoreTrend" AS ENUM ('UP', 'DOWN', 'STABLE');

-- CreateEnum
CREATE TYPE "MarketingAssetType" AS ENUM ('WHATSAPP_FLYER', 'FACEBOOK_FLYER', 'LINKEDIN_BANNER', 'INSTAGRAM_SQUARE', 'TWITTER_BANNER', 'A4_POSTER', 'QR_POSTER', 'BUSINESS_CARD');

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ConflictType" AS ENUM ('SAME_INSTITUTION', 'SAME_DEPARTMENT', 'PREVIOUS_COAUTHOR', 'SAME_ORCID_COLLABORATION', 'SAME_EMAIL_DOMAIN', 'PREVIOUS_REVIEWER_OF_AUTHOR', 'PREVIOUS_EDITOR_OF_AUTHOR', 'REFERRAL_CONFLICT');

-- CreateEnum
CREATE TYPE "ConflictSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- AlterTable
ALTER TABLE "ReviewAssignment" ADD COLUMN     "editorialRatedAt" TIMESTAMP(3),
ADD COLUMN     "editorialRatedById" TEXT,
ADD COLUMN     "editorialRating" INTEGER,
ADD COLUMN     "editorialRatingNotes" TEXT;

-- AlterTable
ALTER TABLE "ReviewerAmbassador" ADD COLUMN     "contactEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPublicProfileEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "slug" TEXT;

-- CreateTable
CREATE TABLE "ReviewerPerformanceSnapshot" (
    "id" TEXT NOT NULL,
    "ambassadorId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "grade" "ScoreGrade" NOT NULL,
    "trend" "ScoreTrend" NOT NULL DEFAULT 'STABLE',
    "breakdown" JSONB NOT NULL,
    "strengths" JSONB NOT NULL,
    "improvements" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewerPerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewerScoringSettings" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "reviewQualityWeight" INTEGER NOT NULL DEFAULT 20,
    "completionTimeWeight" INTEGER NOT NULL DEFAULT 15,
    "editorialRatingWeight" INTEGER NOT NULL DEFAULT 15,
    "completedReviewsWeight" INTEGER NOT NULL DEFAULT 10,
    "invitationAcceptanceWeight" INTEGER NOT NULL DEFAULT 10,
    "referralPublicationWeight" INTEGER NOT NULL DEFAULT 10,
    "latePenaltyWeight" INTEGER NOT NULL DEFAULT 10,
    "recommendationAccuracyWeight" INTEGER NOT NULL DEFAULT 5,
    "withdrawalPenaltyWeight" INTEGER NOT NULL DEFAULT 5,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewerScoringSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingTemplate" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "assetType" "MarketingAssetType" NOT NULL,
    "backgroundImageUrl" TEXT NOT NULL,
    "defaultCaption" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralCampaign" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rewardMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1,
    "reviewBonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "submissionBonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "publicationBonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "referralBonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "targetDiscipline" TEXT,
    "targetCountry" TEXT,
    "targetInstitution" TEXT,
    "maxBudget" DECIMAL(12,2),
    "spentBudget" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bannerImageUrl" TEXT,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignRewardLog" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "walletTransactionId" TEXT NOT NULL,
    "submissionId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignRewardLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConflictOfInterestCheck" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "conflictType" "ConflictType" NOT NULL,
    "severity" "ConflictSeverity" NOT NULL,
    "reason" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "blocked" BOOLEAN NOT NULL DEFAULT false,
    "overriddenById" TEXT,
    "overriddenAt" TIMESTAMP(3),
    "overrideReason" TEXT,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConflictOfInterestCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrcidProfileSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "biography" TEXT,
    "employments" JSONB,
    "educations" JSONB,
    "keywords" JSONB,
    "worksCount" INTEGER NOT NULL DEFAULT 0,
    "publicProfileUrl" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrcidProfileSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReviewerPerformanceSnapshot_ambassadorId_calculatedAt_idx" ON "ReviewerPerformanceSnapshot"("ambassadorId", "calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewerScoringSettings_journalId_key" ON "ReviewerScoringSettings"("journalId");

-- CreateIndex
CREATE INDEX "MarketingTemplate_journalId_assetType_idx" ON "MarketingTemplate"("journalId", "assetType");

-- CreateIndex
CREATE INDEX "MarketingTemplate_journalId_assetType_isActive_idx" ON "MarketingTemplate"("journalId", "assetType", "isActive");

-- CreateIndex
CREATE INDEX "ReferralCampaign_journalId_status_idx" ON "ReferralCampaign"("journalId", "status");

-- CreateIndex
CREATE INDEX "ReferralCampaign_startDate_endDate_idx" ON "ReferralCampaign"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignRewardLog_walletTransactionId_key" ON "CampaignRewardLog"("walletTransactionId");

-- CreateIndex
CREATE INDEX "CampaignRewardLog_campaignId_idx" ON "CampaignRewardLog"("campaignId");

-- CreateIndex
CREATE INDEX "ConflictOfInterestCheck_submissionId_idx" ON "ConflictOfInterestCheck"("submissionId");

-- CreateIndex
CREATE INDEX "ConflictOfInterestCheck_reviewerId_idx" ON "ConflictOfInterestCheck"("reviewerId");

-- CreateIndex
CREATE INDEX "ConflictOfInterestCheck_severity_idx" ON "ConflictOfInterestCheck"("severity");

-- CreateIndex
CREATE UNIQUE INDEX "OrcidProfileSnapshot_userId_key" ON "OrcidProfileSnapshot"("userId");

-- CreateIndex
CREATE INDEX "ReviewAssignment_editorialRatedById_idx" ON "ReviewAssignment"("editorialRatedById");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewerAmbassador_slug_key" ON "ReviewerAmbassador"("slug");

-- AddForeignKey
ALTER TABLE "ReviewAssignment" ADD CONSTRAINT "ReviewAssignment_editorialRatedById_fkey" FOREIGN KEY ("editorialRatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerPerformanceSnapshot" ADD CONSTRAINT "ReviewerPerformanceSnapshot_ambassadorId_fkey" FOREIGN KEY ("ambassadorId") REFERENCES "ReviewerAmbassador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerScoringSettings" ADD CONSTRAINT "ReviewerScoringSettings_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerScoringSettings" ADD CONSTRAINT "ReviewerScoringSettings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingTemplate" ADD CONSTRAINT "MarketingTemplate_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketingTemplate" ADD CONSTRAINT "MarketingTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCampaign" ADD CONSTRAINT "ReferralCampaign_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralCampaign" ADD CONSTRAINT "ReferralCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignRewardLog" ADD CONSTRAINT "CampaignRewardLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "ReferralCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictOfInterestCheck" ADD CONSTRAINT "ConflictOfInterestCheck_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictOfInterestCheck" ADD CONSTRAINT "ConflictOfInterestCheck_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConflictOfInterestCheck" ADD CONSTRAINT "ConflictOfInterestCheck_overriddenById_fkey" FOREIGN KEY ("overriddenById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrcidProfileSnapshot" ADD CONSTRAINT "OrcidProfileSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

