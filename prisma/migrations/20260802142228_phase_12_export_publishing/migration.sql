-- CreateEnum
CREATE TYPE "DocumentationSiteStatus" AS ENUM ('DRAFT', 'GENERATING', 'READY', 'PUBLISHING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "DocumentationPublishStatus" AS ENUM ('PENDING', 'BUILDING', 'DEPLOYING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "DocumentationSite" (
    "id" TEXT NOT NULL,
    "repositoryAnalysisId" TEXT NOT NULL,
    "status" "DocumentationSiteStatus" NOT NULL DEFAULT 'DRAFT',
    "siteName" TEXT NOT NULL,
    "slug" TEXT,
    "configuration" JSONB NOT NULL,
    "manifest" JSONB,
    "generatedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "lastPublishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentationSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentationSitePublish" (
    "id" TEXT NOT NULL,
    "documentationSiteId" TEXT NOT NULL,
    "status" "DocumentationPublishStatus" NOT NULL DEFAULT 'PENDING',
    "deploymentUrl" TEXT,
    "deploymentId" TEXT,
    "manifest" JSONB NOT NULL,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentationSitePublish_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DocumentationSite_repositoryAnalysisId_key" ON "DocumentationSite"("repositoryAnalysisId");

-- CreateIndex
CREATE INDEX "DocumentationSite_status_idx" ON "DocumentationSite"("status");

-- CreateIndex
CREATE INDEX "DocumentationSitePublish_documentationSiteId_createdAt_idx" ON "DocumentationSitePublish"("documentationSiteId", "createdAt");

-- AddForeignKey
ALTER TABLE "DocumentationSite" ADD CONSTRAINT "DocumentationSite_repositoryAnalysisId_fkey" FOREIGN KEY ("repositoryAnalysisId") REFERENCES "RepositoryAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentationSitePublish" ADD CONSTRAINT "DocumentationSitePublish_documentationSiteId_fkey" FOREIGN KEY ("documentationSiteId") REFERENCES "DocumentationSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
