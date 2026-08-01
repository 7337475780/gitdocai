-- CreateTable
CREATE TABLE "RepositoryAnalysis" (
    "id" TEXT NOT NULL,
    "repositoryUrl" TEXT NOT NULL,
    "repositoryOwner" TEXT NOT NULL,
    "repositoryName" TEXT NOT NULL,
    "repositoryFullName" TEXT NOT NULL,
    "defaultBranch" TEXT,
    "analysisData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepositoryAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documentation" (
    "id" TEXT NOT NULL,
    "repositoryAnalysisId" TEXT NOT NULL,
    "markdown" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "qualityScore" INTEGER,
    "generatedProvider" TEXT,
    "generatedModel" TEXT,
    "generationTimeMs" INTEGER,
    "attemptCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Documentation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepositoryAnalysis_repositoryOwner_repositoryName_idx" ON "RepositoryAnalysis"("repositoryOwner", "repositoryName");

-- CreateIndex
CREATE INDEX "RepositoryAnalysis_createdAt_idx" ON "RepositoryAnalysis"("createdAt");

-- CreateIndex
CREATE INDEX "Documentation_repositoryAnalysisId_idx" ON "Documentation"("repositoryAnalysisId");

-- CreateIndex
CREATE INDEX "Documentation_updatedAt_idx" ON "Documentation"("updatedAt");

-- AddForeignKey
ALTER TABLE "Documentation" ADD CONSTRAINT "Documentation_repositoryAnalysisId_fkey" FOREIGN KEY ("repositoryAnalysisId") REFERENCES "RepositoryAnalysis"("id") ON DELETE CASCADE ON UPDATE CASCADE;
