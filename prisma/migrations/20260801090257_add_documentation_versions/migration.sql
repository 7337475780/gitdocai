-- CreateEnum
CREATE TYPE "DocumentationVersionSource" AS ENUM ('INITIAL_GENERATION', 'MANUAL_EDIT', 'SECTION_REGENERATION', 'FULL_REGENERATION', 'QUALITY_IMPROVEMENT', 'RESTORE');

-- CreateTable
CREATE TABLE "DocumentationVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "markdown" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "sections" JSONB,
    "metadata" JSONB,
    "qualityScore" INTEGER,
    "qualityData" JSONB,
    "sourceType" "DocumentationVersionSource" NOT NULL,
    "sourceLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentationVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentationVersion_documentId_createdAt_idx" ON "DocumentationVersion"("documentId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentationVersion_documentId_versionNumber_key" ON "DocumentationVersion"("documentId", "versionNumber");

-- AddForeignKey
ALTER TABLE "DocumentationVersion" ADD CONSTRAINT "DocumentationVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Documentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
