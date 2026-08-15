-- AlterTable
ALTER TABLE "JournalSettings" ADD COLUMN     "cfpButtonText" TEXT,
ADD COLUMN     "cfpButtonUrl" TEXT,
ADD COLUMN     "cfpDeadline" TIMESTAMP(3),
ADD COLUMN     "cfpEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cfpMessage" TEXT,
ADD COLUMN     "cfpTitle" TEXT;
