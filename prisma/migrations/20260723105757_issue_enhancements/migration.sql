-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "endPage" INTEGER,
ADD COLUMN     "startPage" INTEGER;

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN     "editorial" TEXT,
ADD COLUMN     "fullIssuePdf" TEXT,
ADD COLUMN     "slug" TEXT;
