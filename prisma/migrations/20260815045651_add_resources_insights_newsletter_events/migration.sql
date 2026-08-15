-- CreateEnum
CREATE TYPE "ResourceCategory" AS ENUM ('RESEARCH_METHODOLOGY', 'DATA_ANALYSIS', 'ACADEMIC_WRITING', 'PUBLISHING');

-- CreateEnum
CREATE TYPE "ResourceFormat" AS ENUM ('ARTICLE', 'GUIDE', 'TEMPLATE', 'VIDEO');

-- CreateEnum
CREATE TYPE "InsightCategory" AS ENUM ('RESEARCH_METHODS', 'ACADEMIC_WRITING', 'STATISTICS', 'PUBLISHING', 'RESEARCH_ETHICS', 'INNOVATION', 'MANAGEMENT', 'BUSINESS', 'TECHNOLOGY');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SEMINAR', 'WEBINAR', 'WORKSHOP', 'CONFERENCE', 'EDITORIAL_SESSION');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ResourceGuide" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "category" "ResourceCategory" NOT NULL,
    "format" "ResourceFormat" NOT NULL DEFAULT 'GUIDE',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT,
    "externalUrl" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResourceGuide_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "category" "InsightCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorName" TEXT,
    "coverImage" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "unsubscribeToken" TEXT NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unsubscribedAt" TIMESTAMP(3),

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL DEFAULT 'WEBINAR',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "speakerName" TEXT,
    "speakerTitle" TEXT,
    "registrationUrl" TEXT,
    "recordingUrl" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'UPCOMING',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceGuide_journalId_idx" ON "ResourceGuide"("journalId");

-- CreateIndex
CREATE INDEX "ResourceGuide_category_idx" ON "ResourceGuide"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ResourceGuide_journalId_slug_key" ON "ResourceGuide"("journalId", "slug");

-- CreateIndex
CREATE INDEX "Insight_journalId_idx" ON "Insight"("journalId");

-- CreateIndex
CREATE INDEX "Insight_category_idx" ON "Insight"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Insight_journalId_slug_key" ON "Insight"("journalId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribeToken_key" ON "NewsletterSubscriber"("unsubscribeToken");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_journalId_idx" ON "NewsletterSubscriber"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_journalId_email_key" ON "NewsletterSubscriber"("journalId", "email");

-- CreateIndex
CREATE INDEX "Event_journalId_idx" ON "Event"("journalId");

-- CreateIndex
CREATE INDEX "Event_status_idx" ON "Event"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Event_journalId_slug_key" ON "Event"("journalId", "slug");

-- AddForeignKey
ALTER TABLE "ResourceGuide" ADD CONSTRAINT "ResourceGuide_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Insight" ADD CONSTRAINT "Insight_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "NewsletterSubscriber_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
