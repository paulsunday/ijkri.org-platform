/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Issue` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Issue_slug_key" ON "Issue"("slug");
