-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('APC', 'SUBSCRIPTION', 'ARTICLE_PURCHASE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE', 'PARTIALLY_WAIVED', 'WAIVED', 'VOID');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYSTACK');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD');

-- CreateEnum
CREATE TYPE "ArticleAccessType" AS ENUM ('OPEN_ACCESS', 'SUBSCRIPTION', 'PAY_PER_VIEW', 'SUBSCRIPTION_OR_PAY_PER_VIEW');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESSFUL', 'FAILED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "accessType" "ArticleAccessType" NOT NULL DEFAULT 'OPEN_ACCESS';

-- AlterTable
ALTER TABLE "Journal" ADD COLUMN     "apcAmount" DECIMAL(10,2) NOT NULL DEFAULT 97.00,
ADD COLUMN     "articlePrice" DECIMAL(10,2) NOT NULL DEFAULT 2.00,
ADD COLUMN     "currency" "Currency" NOT NULL DEFAULT 'USD',
ADD COLUMN     "subscriptionAmount" DECIMAL(10,2) NOT NULL DEFAULT 6.00;

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "dueAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "waivedAt" TIMESTAMP(3),
    "waivedAmount" DECIMAL(10,2),
    "waivedReason" TEXT,
    "waivedById" TEXT,
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "processedById" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "internalReference" TEXT NOT NULL,
    "providerReference" TEXT,
    "reason" TEXT NOT NULL,
    "providerResponse" JSONB,
    "failureReason" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "subscriptionId" TEXT,
    "articlePurchaseId" TEXT,
    "providerStatus" TEXT,
    "providerChannel" TEXT,
    "providerFees" DECIMAL(10,2),
    "paidAmount" DECIMAL(10,2),
    "customerEmail" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "purpose" "PaymentPurpose" NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'PAYSTACK',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "internalReference" TEXT NOT NULL,
    "providerReference" TEXT,
    "receiptNumber" TEXT,
    "authorizationUrl" TEXT,
    "providerResponse" JSONB,
    "failureReason" TEXT,
    "initiatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "refundedAt" TIMESTAMP(3),
    "refundedAmount" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "startsAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "durationMonths" INTEGER NOT NULL DEFAULT 1,
    "planName" TEXT NOT NULL DEFAULT 'Reader Subscription',

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticlePurchase" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "accessGrantedAt" TIMESTAMP(3),
    "accessRevokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticlePurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookLog" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'PAYSTACK',
    "providerEventId" TEXT,
    "eventType" TEXT NOT NULL,
    "signatureValid" BOOLEAN NOT NULL DEFAULT false,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processingAttempts" INTEGER NOT NULL DEFAULT 0,
    "payload" JSONB NOT NULL,
    "errorMessage" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "PaymentWebhookLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_submissionId_key" ON "Invoice"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_invoiceNumber_key" ON "Invoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Invoice_journalId_idx" ON "Invoice"("journalId");

-- CreateIndex
CREATE INDEX "Invoice_userId_idx" ON "Invoice"("userId");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE INDEX "Invoice_dueAt_idx" ON "Invoice"("dueAt");

-- CreateIndex
CREATE INDEX "Invoice_waivedById_idx" ON "Invoice"("waivedById");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_internalReference_key" ON "Refund"("internalReference");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_providerReference_key" ON "Refund"("providerReference");

-- CreateIndex
CREATE INDEX "Refund_paymentId_idx" ON "Refund"("paymentId");

-- CreateIndex
CREATE INDEX "Refund_processedById_idx" ON "Refund"("processedById");

-- CreateIndex
CREATE INDEX "Refund_status_idx" ON "Refund"("status");

-- CreateIndex
CREATE INDEX "Refund_requestedAt_idx" ON "Refund"("requestedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_internalReference_key" ON "Payment"("internalReference");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerReference_key" ON "Payment"("providerReference");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_receiptNumber_key" ON "Payment"("receiptNumber");

-- CreateIndex
CREATE INDEX "Payment_journalId_idx" ON "Payment"("journalId");

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_subscriptionId_idx" ON "Payment"("subscriptionId");

-- CreateIndex
CREATE INDEX "Payment_articlePurchaseId_idx" ON "Payment"("articlePurchaseId");

-- CreateIndex
CREATE INDEX "Payment_purpose_idx" ON "Payment"("purpose");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Payment_createdAt_idx" ON "Payment"("createdAt");

-- CreateIndex
CREATE INDEX "Subscription_journalId_idx" ON "Subscription"("journalId");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_expiresAt_idx" ON "Subscription"("expiresAt");

-- CreateIndex
CREATE INDEX "ArticlePurchase_journalId_idx" ON "ArticlePurchase"("journalId");

-- CreateIndex
CREATE INDEX "ArticlePurchase_articleId_idx" ON "ArticlePurchase"("articleId");

-- CreateIndex
CREATE INDEX "ArticlePurchase_userId_idx" ON "ArticlePurchase"("userId");

-- CreateIndex
CREATE INDEX "ArticlePurchase_accessGrantedAt_idx" ON "ArticlePurchase"("accessGrantedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ArticlePurchase_userId_articleId_key" ON "ArticlePurchase"("userId", "articleId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookLog_providerEventId_key" ON "PaymentWebhookLog"("providerEventId");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_paymentId_idx" ON "PaymentWebhookLog"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_eventType_idx" ON "PaymentWebhookLog"("eventType");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_processed_idx" ON "PaymentWebhookLog"("processed");

-- CreateIndex
CREATE INDEX "PaymentWebhookLog_receivedAt_idx" ON "PaymentWebhookLog"("receivedAt");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_waivedById_fkey" FOREIGN KEY ("waivedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_articlePurchaseId_fkey" FOREIGN KEY ("articlePurchaseId") REFERENCES "ArticlePurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticlePurchase" ADD CONSTRAINT "ArticlePurchase_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticlePurchase" ADD CONSTRAINT "ArticlePurchase_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticlePurchase" ADD CONSTRAINT "ArticlePurchase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookLog" ADD CONSTRAINT "PaymentWebhookLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
