-- CreateEnum
CREATE TYPE "DocumentationFreshnessStatus" AS ENUM ('UP_TO_DATE', 'CHANGES_DETECTED', 'REVIEW_RECOMMENDED', 'OUTDATED', 'UNKNOWN');

-- AlterTable
ALTER TABLE "Documentation" ADD COLUMN     "baselineSnapshotId" TEXT,
ADD COLUMN     "baselineUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "freshnessReviewSource" TEXT,
ADD COLUMN     "freshnessReviewedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "DocumentationVersion" ADD COLUMN     "baselineSnapshotId" TEXT,
ADD COLUMN     "baselineUpdatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "RepositorySnapshot" (
    "id" TEXT NOT NULL,
    "repositoryAnalysisId" TEXT NOT NULL,
    "commitSha" TEXT,
    "branch" TEXT,
    "fileManifest" JSONB NOT NULL,
    "analysisFingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepositorySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentationFreshnessScan" (
    "id" TEXT NOT NULL,
    "repositoryAnalysisId" TEXT NOT NULL,
    "baselineSnapshotId" TEXT,
    "latestSnapshotId" TEXT,
    "status" "DocumentationFreshnessStatus" NOT NULL,
    "summary" JSONB NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentationFreshnessScan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentationFreshnessImpact" (
    "id" TEXT NOT NULL,
    "freshnessScanId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "status" "DocumentationFreshnessStatus" NOT NULL,
    "impactScore" INTEGER NOT NULL,
    "confidence" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "reasons" JSONB NOT NULL,
    "affectedSections" JSONB NOT NULL,
    "deterministicEvidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentationFreshnessImpact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepositorySnapshot_repositoryAnalysisId_createdAt_idx" ON "RepositorySnapshot"("repositoryAnalysisId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentationFreshnessScan_repositoryAnalysisId_scannedAt_idx" ON "DocumentationFreshnessScan"("repositoryAnalysisId", "scannedAt");

-- CreateIndex
CREATE INDEX "DocumentationFreshnessImpact_freshnessScanId_documentId_idx" ON "DocumentationFreshnessImpact"("freshnessScanId", "documentId");

-- CreateIndex
CREATE INDEX "DocumentationFreshnessImpact_documentId_status_idx" ON "DocumentationFreshnessImpact"("documentId", "status");

-- AddForeignKey
ALTER TABLE "RepositorySnapshot" ADD CONSTRAINT "RepositorySnapshot_repositoryAnalysisId_fkey" FOREIGN KEY ("repositoryAnalysisId") REFERENCES "RepositoryAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentationFreshnessScan" ADD CONSTRAINT "DocumentationFreshnessScan_repositoryAnalysisId_fkey" FOREIGN KEY ("repositoryAnalysisId") REFERENCES "RepositoryAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentationFreshnessScan" ADD CONSTRAINT "DocumentationFreshnessScan_baselineSnapshotId_fkey" FOREIGN KEY ("baselineSnapshotId") REFERENCES "RepositorySnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentationFreshnessScan" ADD CONSTRAINT "DocumentationFreshnessScan_latestSnapshotId_fkey" FOREIGN KEY ("latestSnapshotId") REFERENCES "RepositorySnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentationFreshnessImpact" ADD CONSTRAINT "DocumentationFreshnessImpact_freshnessScanId_fkey" FOREIGN KEY ("freshnessScanId") REFERENCES "DocumentationFreshnessScan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentationFreshnessImpact" ADD CONSTRAINT "DocumentationFreshnessImpact_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Documentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documentation" ADD CONSTRAINT "Documentation_baselineSnapshotId_fkey" FOREIGN KEY ("baselineSnapshotId") REFERENCES "RepositorySnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentationVersion" ADD CONSTRAINT "DocumentationVersion_baselineSnapshotId_fkey" FOREIGN KEY ("baselineSnapshotId") REFERENCES "RepositorySnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
