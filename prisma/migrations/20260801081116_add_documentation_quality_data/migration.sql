-- AlterTable
ALTER TABLE "Documentation" ADD COLUMN     "qualityData" JSONB,
ADD COLUMN     "qualityEvaluatedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DocumentationImprovementProposal" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "targetSection" TEXT,
    "currentContentHash" TEXT NOT NULL,
    "proposedContent" TEXT NOT NULL,
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "appliedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentationImprovementProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentationImprovementProposal_documentId_idx" ON "DocumentationImprovementProposal"("documentId");

-- AddForeignKey
ALTER TABLE "DocumentationImprovementProposal" ADD CONSTRAINT "DocumentationImprovementProposal_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Documentation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
