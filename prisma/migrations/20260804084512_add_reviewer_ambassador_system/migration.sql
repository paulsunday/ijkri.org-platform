-- CreateEnum
CREATE TYPE "AmbassadorStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "AmbassadorLevel" AS ENUM ('NONE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('REVIEW_REWARD', 'SUBMISSION_REWARD', 'PUBLICATION_REWARD', 'REFERRAL_BONUS', 'WITHDRAWAL', 'WITHDRAWAL_REVERSAL', 'ADMIN_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "WalletTransactionDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "WalletTransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'REVERSED');

-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('OUTSTANDING_REVIEWER', 'BRONZE_AMBASSADOR', 'SILVER_AMBASSADOR', 'GOLD_AMBASSADOR', 'PLATINUM_AMBASSADOR', 'TOP_REVIEWER', 'TOP_AMBASSADOR');

-- CreateEnum
CREATE TYPE "ReferralStage" AS ENUM ('REGISTERED', 'SUBMITTED', 'DESK_REVIEW', 'PEER_REVIEW', 'REVISION_REQUIRED', 'ACCEPTED', 'PUBLISHED', 'REJECTED');

-- AlterTable
ALTER TABLE "PaymentWebhookLog" ADD COLUMN     "withdrawalRequestId" TEXT;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "referrerAssignedAt" TIMESTAMP(3),
ADD COLUMN     "referrerReviewerId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "referredAt" TIMESTAMP(3),
ADD COLUMN     "referredByCode" TEXT,
ADD COLUMN     "referredByReviewerId" TEXT;

-- CreateTable
CREATE TABLE "ReviewerAmbassador" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "referralCode" TEXT NOT NULL,
    "status" "AmbassadorStatus" NOT NULL DEFAULT 'ACTIVE',
    "level" "AmbassadorLevel" NOT NULL DEFAULT 'NONE',
    "publishedReferralCount" INTEGER NOT NULL DEFAULT 0,
    "totalReferralCount" INTEGER NOT NULL DEFAULT 0,
    "levelAchievedAt" TIMESTAMP(3),
    "suspendedAt" TIMESTAMP(3),
    "suspendedReason" TEXT,
    "suspendedById" TEXT,
    "regeneratedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewerAmbassador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbassadorWallet" (
    "id" TEXT NOT NULL,
    "ambassadorId" TEXT NOT NULL,
    "currentBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "pendingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "lifetimeEarnings" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalWithdrawn" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmbassadorWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "direction" "WalletTransactionDirection" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "status" "WalletTransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "idempotencyKey" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "description" TEXT NOT NULL,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbassadorRewardSetting" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "reviewReward" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "submissionReward" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "publicationReward" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "referralBonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmbassadorRewardSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbassadorPayoutAccount" (
    "id" TEXT NOT NULL,
    "ambassadorId" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountName" TEXT NOT NULL,
    "paystackRecipientCode" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmbassadorPayoutAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithdrawalRequest" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "ambassadorId" TEXT NOT NULL,
    "payoutAccountId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "internalReference" TEXT NOT NULL,
    "paystackTransferCode" TEXT,
    "paystackTransferId" TEXT,
    "failureReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithdrawalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AmbassadorCertificate" (
    "id" TEXT NOT NULL,
    "ambassadorId" TEXT NOT NULL,
    "type" "CertificateType" NOT NULL,
    "title" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "periodLabel" TEXT,
    "metadata" JSONB,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AmbassadorCertificate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralEvent" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "referredUserId" TEXT,
    "submissionId" TEXT,
    "stage" "ReferralStage" NOT NULL,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReviewerAmbassador_userId_key" ON "ReviewerAmbassador"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewerAmbassador_referralCode_key" ON "ReviewerAmbassador"("referralCode");

-- CreateIndex
CREATE INDEX "ReviewerAmbassador_journalId_idx" ON "ReviewerAmbassador"("journalId");

-- CreateIndex
CREATE INDEX "ReviewerAmbassador_status_idx" ON "ReviewerAmbassador"("status");

-- CreateIndex
CREATE INDEX "ReviewerAmbassador_level_idx" ON "ReviewerAmbassador"("level");

-- CreateIndex
CREATE UNIQUE INDEX "AmbassadorWallet_ambassadorId_key" ON "AmbassadorWallet"("ambassadorId");

-- CreateIndex
CREATE INDEX "AmbassadorWallet_ambassadorId_idx" ON "AmbassadorWallet"("ambassadorId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletTransaction_idempotencyKey_key" ON "WalletTransaction"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_idx" ON "WalletTransaction"("walletId");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_idx" ON "WalletTransaction"("type");

-- CreateIndex
CREATE INDEX "WalletTransaction_status_idx" ON "WalletTransaction"("status");

-- CreateIndex
CREATE INDEX "WalletTransaction_createdAt_idx" ON "WalletTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_sourceType_sourceId_idx" ON "WalletTransaction"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "AmbassadorRewardSetting_journalId_key" ON "AmbassadorRewardSetting"("journalId");

-- CreateIndex
CREATE UNIQUE INDEX "AmbassadorPayoutAccount_ambassadorId_key" ON "AmbassadorPayoutAccount"("ambassadorId");

-- CreateIndex
CREATE UNIQUE INDEX "AmbassadorPayoutAccount_paystackRecipientCode_key" ON "AmbassadorPayoutAccount"("paystackRecipientCode");

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalRequest_internalReference_key" ON "WithdrawalRequest"("internalReference");

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalRequest_paystackTransferCode_key" ON "WithdrawalRequest"("paystackTransferCode");

-- CreateIndex
CREATE UNIQUE INDEX "WithdrawalRequest_paystackTransferId_key" ON "WithdrawalRequest"("paystackTransferId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_walletId_idx" ON "WithdrawalRequest"("walletId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_ambassadorId_idx" ON "WithdrawalRequest"("ambassadorId");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_status_idx" ON "WithdrawalRequest"("status");

-- CreateIndex
CREATE INDEX "WithdrawalRequest_requestedAt_idx" ON "WithdrawalRequest"("requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "AmbassadorCertificate_certificateNumber_key" ON "AmbassadorCertificate"("certificateNumber");

-- CreateIndex
CREATE INDEX "AmbassadorCertificate_ambassadorId_idx" ON "AmbassadorCertificate"("ambassadorId");

-- CreateIndex
CREATE INDEX "AmbassadorCertificate_type_idx" ON "AmbassadorCertificate"("type");

-- CreateIndex
CREATE UNIQUE INDEX "AmbassadorCertificate_ambassadorId_type_periodLabel_key" ON "AmbassadorCertificate"("ambassadorId", "type", "periodLabel");

-- CreateIndex
CREATE INDEX "ReferralEvent_reviewerId_idx" ON "ReferralEvent"("reviewerId");

-- CreateIndex
CREATE INDEX "ReferralEvent_submissionId_idx" ON "ReferralEvent"("submissionId");

-- CreateIndex
CREATE INDEX "ReferralEvent_stage_idx" ON "ReferralEvent"("stage");

-- CreateIndex
CREATE INDEX "ReferralEvent_occurredAt_idx" ON "ReferralEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_withdrawalRequestId_idx" ON "PaymentWebhookLog"("withdrawalRequestId");

-- CreateIndex
CREATE INDEX "Submission_referrerReviewerId_idx" ON "Submission"("referrerReviewerId");

-- CreateIndex
CREATE INDEX "User_referredByReviewerId_idx" ON "User"("referredByReviewerId");

-- AddForeignKey
ALTER TABLE "PaymentWebhookLog" ADD CONSTRAINT "PaymentWebhookLog_withdrawalRequestId_fkey" FOREIGN KEY ("withdrawalRequestId") REFERENCES "WithdrawalRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_referredByReviewerId_fkey" FOREIGN KEY ("referredByReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_referrerReviewerId_fkey" FOREIGN KEY ("referrerReviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerAmbassador" ADD CONSTRAINT "ReviewerAmbassador_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerAmbassador" ADD CONSTRAINT "ReviewerAmbassador_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewerAmbassador" ADD CONSTRAINT "ReviewerAmbassador_suspendedById_fkey" FOREIGN KEY ("suspendedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbassadorWallet" ADD CONSTRAINT "AmbassadorWallet_ambassadorId_fkey" FOREIGN KEY ("ambassadorId") REFERENCES "ReviewerAmbassador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "AmbassadorWallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbassadorRewardSetting" ADD CONSTRAINT "AmbassadorRewardSetting_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbassadorRewardSetting" ADD CONSTRAINT "AmbassadorRewardSetting_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbassadorPayoutAccount" ADD CONSTRAINT "AmbassadorPayoutAccount_ambassadorId_fkey" FOREIGN KEY ("ambassadorId") REFERENCES "ReviewerAmbassador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "AmbassadorWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_ambassadorId_fkey" FOREIGN KEY ("ambassadorId") REFERENCES "ReviewerAmbassador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_payoutAccountId_fkey" FOREIGN KEY ("payoutAccountId") REFERENCES "AmbassadorPayoutAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WithdrawalRequest" ADD CONSTRAINT "WithdrawalRequest_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmbassadorCertificate" ADD CONSTRAINT "AmbassadorCertificate_ambassadorId_fkey" FOREIGN KEY ("ambassadorId") REFERENCES "ReviewerAmbassador"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralEvent" ADD CONSTRAINT "ReferralEvent_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralEvent" ADD CONSTRAINT "ReferralEvent_referredUserId_fkey" FOREIGN KEY ("referredUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralEvent" ADD CONSTRAINT "ReferralEvent_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
