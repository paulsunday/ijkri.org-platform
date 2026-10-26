-- CreateEnum
CREATE TYPE "StaticPageKey" AS ENUM ('ABOUT', 'AIMS_SCOPE', 'AUTHOR_GUIDELINES', 'PEER_REVIEW', 'PUBLICATION_ETHICS', 'WHY_IJKRI', 'FAQ', 'TERMS', 'PRIVACY');

-- CreateTable
CREATE TABLE "StaticPage" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "key" "StaticPageKey" NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT,
    "body" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById" TEXT,

    CONSTRAINT "StaticPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaticPage_journalId_key_key" ON "StaticPage"("journalId", "key");

-- AddForeignKey
ALTER TABLE "StaticPage" ADD CONSTRAINT "StaticPage_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaticPage" ADD CONSTRAINT "StaticPage_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
