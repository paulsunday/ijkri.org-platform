-- CreateEnum
CREATE TYPE "EventRegistrationStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- AlterEnum
ALTER TYPE "PaymentPurpose" ADD VALUE 'EVENT_REGISTRATION';

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "fee" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "price" DECIMAL(10,2);

-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "status" "EventRegistrationStatus" NOT NULL DEFAULT 'CONFIRMED',
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "eventRegistrationId" TEXT;

-- CreateIndex
CREATE INDEX "Payment_eventRegistrationId_idx" ON "Payment"("eventRegistrationId");

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_eventRegistrationId_fkey" FOREIGN KEY ("eventRegistrationId") REFERENCES "EventRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
