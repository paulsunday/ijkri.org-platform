/*
  Warnings:

  - The values [EDITOR] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `firstName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `isVerified` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.
  - Added the required column `name` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_INITIAL_REVIEW', 'UNDER_PEER_REVIEW', 'REVISION_REQUIRED', 'ACCEPTED', 'REJECTED', 'PUBLISHED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ReviewRecommendation" AS ENUM ('ACCEPT', 'MINOR_REVISION', 'MAJOR_REVISION', 'REJECT');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED', 'SUBMITTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DOIStatus" AS ENUM ('PENDING', 'REGISTERED', 'FAILED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('GENERAL', 'SUBMISSION', 'REVIEW', 'DECISION', 'PUBLICATION', 'PAYMENT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'SUBMIT_MANUSCRIPT', 'ASSIGN_REVIEWER', 'SUBMIT_REVIEW', 'MAKE_DECISION', 'PUBLISH_ARTICLE', 'REGISTER_DOI');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'EDITOR_IN_CHIEF', 'MANAGING_EDITOR', 'SECTION_EDITOR', 'REVIEWER', 'AUTHOR', 'READER');
ALTER TABLE "UserJournalRole" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
COMMIT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "firstName",
DROP COLUMN "isVerified",
DROP COLUMN "lastName",
DROP COLUMN "password",
DROP COLUMN "role",
ADD COLUMN     "affiliation" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "image" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "orcid" TEXT,
ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "phone" TEXT;

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "logo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publisher" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "website" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "logo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publisher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Journal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "publisherId" TEXT,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "issnPrint" TEXT,
    "issnOnline" TEXT,
    "description" TEXT,
    "aimsScope" TEXT,
    "authorGuidelines" TEXT,
    "ethicsPolicy" TEXT,
    "peerReviewPolicy" TEXT,
    "openAccessPolicy" TEXT,
    "apcInfo" TEXT,
    "contactEmail" TEXT,
    "websiteUrl" TEXT,
    "logo" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Journal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalSettings" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "submissionOpen" BOOLEAN NOT NULL DEFAULT true,
    "reviewType" TEXT NOT NULL DEFAULT 'DOUBLE_BLIND',
    "plagiarismThreshold" INTEGER,
    "defaultLanguage" TEXT NOT NULL DEFAULT 'English',
    "theme" TEXT,
    "homepageBanner" TEXT,
    "contactAddress" TEXT,
    "copyrightPolicy" TEXT,
    "license" TEXT,
    "footerText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserJournalRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserJournalRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorialBoardMember" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "affiliation" TEXT,
    "country" TEXT,
    "email" TEXT,
    "role" TEXT,
    "photoUrl" TEXT,
    "bio" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditorialBoardMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Volume" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Volume_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "volumeId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "coverImage" TEXT,
    "publishedAt" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Issue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "manuscriptType" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "coverLetter" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionFile" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubmissionKeyword" (
    "submissionId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,

    CONSTRAINT "SubmissionKeyword_pkey" PRIMARY KEY ("submissionId","keywordId")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewAssignment" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'INVITED',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acceptedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "blindType" TEXT NOT NULL DEFAULT 'DOUBLE_BLIND',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "commentsToEditor" TEXT,
    "commentsToAuthor" TEXT,
    "recommendation" "ReviewRecommendation" NOT NULL,
    "score" INTEGER,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorialDecision" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "editorId" TEXT NOT NULL,
    "decision" "SubmissionStatus" NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EditorialDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "issueId" TEXT,
    "categoryId" TEXT,
    "submissionId" TEXT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "abstract" TEXT NOT NULL,
    "body" TEXT,
    "pdfUrl" TEXT,
    "doi" TEXT,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleAuthor" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT,
    "affiliation" TEXT,
    "country" TEXT,
    "orcid" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArticleAuthor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleKeyword" (
    "articleId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,

    CONSTRAINT "ArticleKeyword_pkey" PRIMARY KEY ("articleId","keywordId")
);

-- CreateTable
CREATE TABLE "ArticleReference" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "citation" TEXT NOT NULL,
    "doi" TEXT,
    "url" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ArticleReference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoiRecord" (
    "id" TEXT NOT NULL,
    "articleId" TEXT,
    "doi" TEXT NOT NULL,
    "status" "DOIStatus" NOT NULL DEFAULT 'PENDING',
    "registeredAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoiRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "ActivityType" NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Publisher_slug_key" ON "Publisher"("slug");

-- CreateIndex
CREATE INDEX "Publisher_slug_idx" ON "Publisher"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Journal_slug_key" ON "Journal"("slug");

-- CreateIndex
CREATE INDEX "Journal_slug_idx" ON "Journal"("slug");

-- CreateIndex
CREATE INDEX "Journal_tenantId_idx" ON "Journal"("tenantId");

-- CreateIndex
CREATE INDEX "Journal_publisherId_idx" ON "Journal"("publisherId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalSettings_journalId_key" ON "JournalSettings"("journalId");

-- CreateIndex
CREATE INDEX "UserJournalRole_journalId_idx" ON "UserJournalRole"("journalId");

-- CreateIndex
CREATE INDEX "UserJournalRole_role_idx" ON "UserJournalRole"("role");

-- CreateIndex
CREATE UNIQUE INDEX "UserJournalRole_userId_journalId_role_key" ON "UserJournalRole"("userId", "journalId", "role");

-- CreateIndex
CREATE INDEX "EditorialBoardMember_journalId_idx" ON "EditorialBoardMember"("journalId");

-- CreateIndex
CREATE INDEX "Volume_journalId_idx" ON "Volume"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "Volume_journalId_number_year_key" ON "Volume"("journalId", "number", "year");

-- CreateIndex
CREATE INDEX "Issue_journalId_idx" ON "Issue"("journalId");

-- CreateIndex
CREATE INDEX "Issue_volumeId_idx" ON "Issue"("volumeId");

-- CreateIndex
CREATE UNIQUE INDEX "Issue_volumeId_number_key" ON "Issue"("volumeId", "number");

-- CreateIndex
CREATE INDEX "Submission_journalId_idx" ON "Submission"("journalId");

-- CreateIndex
CREATE INDEX "Submission_authorId_idx" ON "Submission"("authorId");

-- CreateIndex
CREATE INDEX "Submission_status_idx" ON "Submission"("status");

-- CreateIndex
CREATE INDEX "SubmissionFile_submissionId_idx" ON "SubmissionFile"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Keyword_name_key" ON "Keyword"("name");

-- CreateIndex
CREATE INDEX "Category_journalId_idx" ON "Category"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_journalId_slug_key" ON "Category"("journalId", "slug");

-- CreateIndex
CREATE INDEX "ReviewAssignment_reviewerId_idx" ON "ReviewAssignment"("reviewerId");

-- CreateIndex
CREATE INDEX "ReviewAssignment_status_idx" ON "ReviewAssignment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewAssignment_submissionId_reviewerId_key" ON "ReviewAssignment"("submissionId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_assignmentId_key" ON "Review"("assignmentId");

-- CreateIndex
CREATE INDEX "EditorialDecision_submissionId_idx" ON "EditorialDecision"("submissionId");

-- CreateIndex
CREATE INDEX "EditorialDecision_editorId_idx" ON "EditorialDecision"("editorId");

-- CreateIndex
CREATE UNIQUE INDEX "Article_submissionId_key" ON "Article"("submissionId");

-- CreateIndex
CREATE INDEX "Article_journalId_idx" ON "Article"("journalId");

-- CreateIndex
CREATE INDEX "Article_issueId_idx" ON "Article"("issueId");

-- CreateIndex
CREATE INDEX "Article_status_idx" ON "Article"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Article_journalId_slug_key" ON "Article"("journalId", "slug");

-- CreateIndex
CREATE INDEX "ArticleAuthor_articleId_idx" ON "ArticleAuthor"("articleId");

-- CreateIndex
CREATE INDEX "ArticleReference_articleId_idx" ON "ArticleReference"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "DoiRecord_articleId_key" ON "DoiRecord"("articleId");

-- CreateIndex
CREATE UNIQUE INDEX "DoiRecord_doi_key" ON "DoiRecord"("doi");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "ActivityLog_userId_idx" ON "ActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ActivityLog_action_idx" ON "ActivityLog"("action");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Journal" ADD CONSTRAINT "Journal_publisherId_fkey" FOREIGN KEY ("publisherId") REFERENCES "Publisher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalSettings" ADD CONSTRAINT "JournalSettings_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJournalRole" ADD CONSTRAINT "UserJournalRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserJournalRole" ADD CONSTRAINT "UserJournalRole_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialBoardMember" ADD CONSTRAINT "EditorialBoardMember_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Volume" ADD CONSTRAINT "Volume_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_volumeId_fkey" FOREIGN KEY ("volumeId") REFERENCES "Volume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionFile" ADD CONSTRAINT "SubmissionFile_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionKeyword" ADD CONSTRAINT "SubmissionKeyword_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubmissionKeyword" ADD CONSTRAINT "SubmissionKeyword_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAssignment" ADD CONSTRAINT "ReviewAssignment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAssignment" ADD CONSTRAINT "ReviewAssignment_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ReviewAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialDecision" ADD CONSTRAINT "EditorialDecision_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorialDecision" ADD CONSTRAINT "EditorialDecision_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleAuthor" ADD CONSTRAINT "ArticleAuthor_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleKeyword" ADD CONSTRAINT "ArticleKeyword_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleKeyword" ADD CONSTRAINT "ArticleKeyword_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleReference" ADD CONSTRAINT "ArticleReference_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoiRecord" ADD CONSTRAINT "DoiRecord_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
