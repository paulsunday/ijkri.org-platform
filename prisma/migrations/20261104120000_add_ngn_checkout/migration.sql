-- AlterEnum
ALTER TYPE "Currency" ADD VALUE 'NGN';

-- AlterTable
ALTER TABLE "Journal" ADD COLUMN     "ngnExchangeRate" DECIMAL(12,4);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "exchangeRate" DECIMAL(12,4);
