-- CreateEnum
CREATE TYPE "ProductionStage" AS ENUM ('COPYEDITING', 'TYPESETTING', 'PROOFREADING', 'FINAL_APPROVAL');

-- CreateEnum
CREATE TYPE "ProductionStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ProductionFileType" AS ENUM ('SOURCE_MANUSCRIPT', 'COPYEDITED_MANUSCRIPT', 'TYPESET_DOCUMENT', 'PDF_GALLEY', 'HTML_GALLEY', 'XML_GALLEY', 'PROOF_FILE', 'FINAL_PUBLICATION_FILE', 'SUPPLEMENTARY_FILE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubmissionStatus" ADD VALUE 'COPYEDITING';
ALTER TYPE "SubmissionStatus" ADD VALUE 'TYPESETTING';
ALTER TYPE "SubmissionStatus" ADD VALUE 'PROOFREADING';
ALTER TYPE "SubmissionStatus" ADD VALUE 'AUTHOR_PROOF_APPROVAL';
ALTER TYPE "SubmissionStatus" ADD VALUE 'READY_FOR_PUBLICATION';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'COPYEDITOR';
ALTER TYPE "UserRole" ADD VALUE 'TYPESETTER';
ALTER TYPE "UserRole" ADD VALUE 'PROOFREADER';
ALTER TYPE "UserRole" ADD VALUE 'PUBLISHER';

-- CreateTable
CREATE TABLE "ProductionAssignment" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "assigneeId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "stage" "ProductionStage" NOT NULL,
    "status" "ProductionStatus" NOT NULL DEFAULT 'PENDING',
    "round" INTEGER NOT NULL DEFAULT 1,
    "instructions" TEXT,
    "dueDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionFile" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "productionAssignmentId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "fileType" "ProductionFileType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "versionNumber" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionNote" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "productionAssignmentId" TEXT,
    "authorId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionAssignment_submissionId_idx" ON "ProductionAssignment"("submissionId");

-- CreateIndex
CREATE INDEX "ProductionAssignment_assigneeId_idx" ON "ProductionAssignment"("assigneeId");

-- CreateIndex
CREATE INDEX "ProductionAssignment_assignedById_idx" ON "ProductionAssignment"("assignedById");

-- CreateIndex
CREATE INDEX "ProductionAssignment_stage_idx" ON "ProductionAssignment"("stage");

-- CreateIndex
CREATE INDEX "ProductionAssignment_status_idx" ON "ProductionAssignment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionAssignment_submissionId_stage_round_key" ON "ProductionAssignment"("submissionId", "stage", "round");

-- CreateIndex
CREATE INDEX "ProductionFile_submissionId_idx" ON "ProductionFile"("submissionId");

-- CreateIndex
CREATE INDEX "ProductionFile_productionAssignmentId_idx" ON "ProductionFile"("productionAssignmentId");

-- CreateIndex
CREATE INDEX "ProductionFile_uploadedById_idx" ON "ProductionFile"("uploadedById");

-- CreateIndex
CREATE INDEX "ProductionFile_fileType_idx" ON "ProductionFile"("fileType");

-- CreateIndex
CREATE INDEX "ProductionFile_isFinal_idx" ON "ProductionFile"("isFinal");

-- CreateIndex
CREATE INDEX "ProductionNote_submissionId_idx" ON "ProductionNote"("submissionId");

-- CreateIndex
CREATE INDEX "ProductionNote_productionAssignmentId_idx" ON "ProductionNote"("productionAssignmentId");

-- CreateIndex
CREATE INDEX "ProductionNote_authorId_idx" ON "ProductionNote"("authorId");

-- AddForeignKey
ALTER TABLE "ProductionAssignment" ADD CONSTRAINT "ProductionAssignment_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionAssignment" ADD CONSTRAINT "ProductionAssignment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionAssignment" ADD CONSTRAINT "ProductionAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionFile" ADD CONSTRAINT "ProductionFile_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionFile" ADD CONSTRAINT "ProductionFile_productionAssignmentId_fkey" FOREIGN KEY ("productionAssignmentId") REFERENCES "ProductionAssignment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionFile" ADD CONSTRAINT "ProductionFile_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionNote" ADD CONSTRAINT "ProductionNote_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionNote" ADD CONSTRAINT "ProductionNote_productionAssignmentId_fkey" FOREIGN KEY ("productionAssignmentId") REFERENCES "ProductionAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionNote" ADD CONSTRAINT "ProductionNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
