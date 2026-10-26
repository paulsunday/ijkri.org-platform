-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('CC_BY_4', 'COPYRIGHT_TRANSFER');

-- CreateEnum
CREATE TYPE "AgreementSignatureMode" AS ENUM ('CORRESPONDING_AUTHOR_ONLY', 'ALL_AUTHORS');

-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'SENT', 'PARTIALLY_SIGNED', 'SIGNED', 'DECLINED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'AGREEMENT';

-- AlterTable
ALTER TABLE "JournalSettings" ADD COLUMN "agreementSignatureMode" "AgreementSignatureMode" NOT NULL DEFAULT 'CORRESPONDING_AUTHOR_ONLY',
ADD COLUMN "defaultLicenseType" "LicenseType" NOT NULL DEFAULT 'CC_BY_4';

-- CreateTable
CREATE TABLE "PublicationAgreement" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "licenseType" "LicenseType" NOT NULL,
    "signatureMode" "AgreementSignatureMode" NOT NULL,
    "templateVersion" TEXT NOT NULL,
    "agreementText" TEXT NOT NULL,
    "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "pdfFileUrl" TEXT,
    "pdfSha256" TEXT,
    "sentAt" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublicationAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementSignature" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "submissionAuthorId" TEXT,
    "userId" TEXT,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "tokenHash" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "typedLegalName" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgreementSignature_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PublicationAgreement_submissionId_key" ON "PublicationAgreement"("submissionId");

-- CreateIndex
CREATE INDEX "PublicationAgreement_status_idx" ON "PublicationAgreement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AgreementSignature_tokenHash_key" ON "AgreementSignature"("tokenHash");

-- CreateIndex
CREATE INDEX "AgreementSignature_agreementId_idx" ON "AgreementSignature"("agreementId");

-- CreateIndex
CREATE INDEX "AgreementSignature_submissionAuthorId_idx" ON "AgreementSignature"("submissionAuthorId");

-- CreateIndex
CREATE INDEX "AgreementSignature_userId_idx" ON "AgreementSignature"("userId");

-- AddForeignKey
ALTER TABLE "PublicationAgreement" ADD CONSTRAINT "PublicationAgreement_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementSignature" ADD CONSTRAINT "AgreementSignature_agreementId_fkey" FOREIGN KEY ("agreementId") REFERENCES "PublicationAgreement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementSignature" ADD CONSTRAINT "AgreementSignature_submissionAuthorId_fkey" FOREIGN KEY ("submissionAuthorId") REFERENCES "SubmissionAuthor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgreementSignature" ADD CONSTRAINT "AgreementSignature_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
