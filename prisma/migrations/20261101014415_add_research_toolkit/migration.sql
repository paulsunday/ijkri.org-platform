-- CreateEnum
CREATE TYPE "DegreeLevel" AS ENUM ('ND', 'HND', 'BSC', 'PGD', 'MSC', 'MPHIL', 'PHD');

-- CreateEnum
CREATE TYPE "TopicReservationStatus" AS ENUM ('ACTIVE', 'RELEASED', 'CONVERTED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'RESEARCH_TOOLKIT';

-- AlterEnum
ALTER TYPE "PaymentPurpose" ADD VALUE 'RESEARCH_TOOLKIT';

-- AlterTable
ALTER TABLE "Journal" ADD COLUMN     "toolkitPrice" DECIMAL(10,2) NOT NULL DEFAULT 2.00,
ADD COLUMN     "topicReservationMonths" INTEGER NOT NULL DEFAULT 9;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "toolkitAccessId" TEXT;

-- CreateTable
CREATE TABLE "ToolkitAccess" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "grantedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolkitAccess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchTopic" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rawTopicText" TEXT NOT NULL,
    "degreeLevel" "DegreeLevel" NOT NULL,
    "discipline" TEXT,
    "breakdown" JSONB,
    "checkerFindings" JSONB,
    "objectives" JSONB,
    "researchQuestions" JSONB,
    "hypotheses" JSONB,
    "signatureKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicReservation" (
    "id" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "signatureKey" TEXT NOT NULL,
    "status" "TopicReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "seminarHeldAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudiedTopicSignature" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "variableKey" TEXT NOT NULL,
    "sector" TEXT NOT NULL DEFAULT '',
    "locationKey" TEXT NOT NULL DEFAULT '',
    "count" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudiedTopicSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ToolkitAccess_journalId_idx" ON "ToolkitAccess"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "ToolkitAccess_userId_journalId_key" ON "ToolkitAccess"("userId", "journalId");

-- CreateIndex
CREATE INDEX "ResearchTopic_journalId_idx" ON "ResearchTopic"("journalId");

-- CreateIndex
CREATE INDEX "ResearchTopic_userId_idx" ON "ResearchTopic"("userId");

-- CreateIndex
CREATE INDEX "ResearchTopic_signatureKey_idx" ON "ResearchTopic"("signatureKey");

-- CreateIndex
CREATE UNIQUE INDEX "TopicReservation_topicId_key" ON "TopicReservation"("topicId");

-- CreateIndex
CREATE INDEX "TopicReservation_journalId_idx" ON "TopicReservation"("journalId");

-- CreateIndex
CREATE INDEX "TopicReservation_userId_idx" ON "TopicReservation"("userId");

-- CreateIndex
CREATE INDEX "TopicReservation_status_idx" ON "TopicReservation"("status");

-- CreateIndex
CREATE INDEX "TopicReservation_expiresAt_idx" ON "TopicReservation"("expiresAt");

-- CreateIndex
CREATE INDEX "TopicReservation_signatureKey_idx" ON "TopicReservation"("signatureKey");

-- CreateIndex
-- Enforces "first claim": at most one ACTIVE reservation per
-- journal+signatureKey at a time. Expressed as a hand-written partial
-- unique index because Prisma's schema language cannot declare a
-- conditional unique constraint.
CREATE UNIQUE INDEX "TopicReservation_active_signature_key" ON "TopicReservation"("journalId", "signatureKey") WHERE "status" = 'ACTIVE';

-- CreateIndex
CREATE INDEX "StudiedTopicSignature_journalId_idx" ON "StudiedTopicSignature"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "StudiedTopicSignature_journalId_variableKey_sector_location_key" ON "StudiedTopicSignature"("journalId", "variableKey", "sector", "locationKey");

-- CreateIndex
CREATE INDEX "Payment_toolkitAccessId_idx" ON "Payment"("toolkitAccessId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_toolkitAccessId_fkey" FOREIGN KEY ("toolkitAccessId") REFERENCES "ToolkitAccess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolkitAccess" ADD CONSTRAINT "ToolkitAccess_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolkitAccess" ADD CONSTRAINT "ToolkitAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchTopic" ADD CONSTRAINT "ResearchTopic_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchTopic" ADD CONSTRAINT "ResearchTopic_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicReservation" ADD CONSTRAINT "TopicReservation_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "ResearchTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicReservation" ADD CONSTRAINT "TopicReservation_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicReservation" ADD CONSTRAINT "TopicReservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudiedTopicSignature" ADD CONSTRAINT "StudiedTopicSignature_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
