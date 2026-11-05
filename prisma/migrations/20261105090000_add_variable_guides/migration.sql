-- CreateTable
CREATE TABLE "VariableGuide" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discipline" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariableGuide_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VariableGuide_journalId_slug_key" ON "VariableGuide"("journalId", "slug");

-- CreateIndex
CREATE INDEX "VariableGuide_journalId_isPublished_idx" ON "VariableGuide"("journalId", "isPublished");

-- AddForeignKey
ALTER TABLE "VariableGuide" ADD CONSTRAINT "VariableGuide_journalId_fkey" FOREIGN KEY ("journalId") REFERENCES "Journal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
