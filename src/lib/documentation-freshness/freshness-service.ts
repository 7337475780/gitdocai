import prisma from '../database/prisma';
import { DocumentationFreshnessStatus, DocumentImpactResult, FreshnessScanSummary } from './freshness-types';
import { FreshnessError } from './freshness-errors';
import { snapshotService } from './snapshot-service';
import { changeDetector } from './change-detector';
import { changeClassifier } from './change-classifier';
import { impactEngine } from './impact-engine';
import { VersionService } from '../documentation-versions/version-service';
import { QualityService } from '../documentation-quality/quality-service';
import { buildFreshnessPrompt } from '../ai/prompts/freshness-prompt';
import { AIOrchestrator } from '../ai/ai-orchestrator';
import { SectionParser } from '../documentation/section-parser';
import { ContextBuilder } from '../documentation/context-builder';

export const freshnessService = {
  async runFreshnessScan(repositoryAnalysisId: string, force: boolean = false): Promise<FreshnessScanSummary> {
    const analysis = await prisma.repositoryAnalysis.findUnique({
      where: { id: repositoryAnalysisId },
      include: { documents: true },
    });

    if (!analysis) {
      throw new FreshnessError('FRESHNESS_REPOSITORY_UNAVAILABLE', `Repository analysis ${repositoryAnalysisId} not found`, 404);
    }

    // 1. Get latest snapshot for analysis
    const latestSnapshot = await snapshotService.ensureSnapshotForAnalysis(repositoryAnalysisId);

    // 2. Check for recent scan if force is false
    if (!force) {
      const recentScan = await prisma.documentationFreshnessScan.findFirst({
        where: { repositoryAnalysisId },
        orderBy: { scannedAt: 'desc' },
        include: {
          impacts: {
            include: { document: true },
          },
        },
      });

      // Reuse scan if created within 24h and latestSnapshotId matches
      if (recentScan && recentScan.latestSnapshotId === latestSnapshot.id) {
        const threshold = 24 * 60 * 60 * 1000;
        if (Date.now() - new Date(recentScan.scannedAt).getTime() < threshold) {
          const summaryObj = recentScan.summary as any;
          return {
            scanId: recentScan.id,
            status: recentScan.status as DocumentationFreshnessStatus,
            scannedAt: recentScan.scannedAt.toISOString(),
            summary: summaryObj,
            repositoryChanges: summaryObj.repositoryChanges || { total: 0, highImportance: 0 },
          };
        }
      }
    }

    // 3. Process documents and evaluate freshness impacts
    const documents = analysis.documents;

    let totalChecked = documents.length;
    let upToDateCount = 0;
    let reviewRecommendedCount = 0;
    let outdatedCount = 0;
    let unknownCount = 0;

    let overallHighImportanceChanges = 0;
    let totalChangesDetected = 0;

    const documentImpactResults: DocumentImpactResult[] = [];

    for (const doc of documents) {
      // Ensure document baseline snapshot exists; if missing, initialize to latestSnapshot
      let baselineSnapshotId = doc.baselineSnapshotId;
      if (!baselineSnapshotId) {
        // Automatically set current latest snapshot as initial baseline if undefined
        await prisma.documentation.update({
          where: { id: doc.id },
          data: {
            baselineSnapshotId: latestSnapshot.id,
            baselineUpdatedAt: doc.createdAt,
          },
        });
        baselineSnapshotId = latestSnapshot.id;
      }

      const baselineSnapshot = await prisma.repositorySnapshot.findUnique({
        where: { id: baselineSnapshotId },
      });

      if (!baselineSnapshot) {
        documentImpactResults.push({
          documentId: doc.id,
          documentType: (doc.metadata as any)?.type || 'README',
          fileName: (doc.metadata as any)?.fileName || 'README.md',
          status: DocumentationFreshnessStatus.UNKNOWN,
          impactScore: 0,
          confidence: 0,
          summary: 'Baseline snapshot unavailable for comparison.',
          reasons: [],
          affectedSections: [],
          scoreFactors: {
            changeImportanceWeight: 0,
            relevantChangesCount: 0,
            confidenceAverage: 0,
            affectedSectionsCount: 0,
            hasDeterministicEvidence: false,
          },
        });
        unknownCount++;
        continue;
      }

      const baselineManifest = baselineSnapshot.fileManifest as any;
      const latestManifest = latestSnapshot.fileManifest as any;

      const rawChanges = changeDetector.detectChanges(baselineManifest, latestManifest);
      const classifiedChanges = changeClassifier.classify(rawChanges);

      totalChangesDetected += classifiedChanges.length;
      overallHighImportanceChanges += classifiedChanges.filter(c => c.importance === 'HIGH' || c.importance === 'CRITICAL').length;

      const docType = (doc.metadata as any)?.type || 'README';
      const fileName = (doc.metadata as any)?.fileName || 'README.md';

      const impact = impactEngine.evaluateImpact(
        doc.id,
        docType,
        fileName,
        doc.markdown,
        doc.sections,
        classifiedChanges
      );

      // If document was manually reviewed after the baseline updatedAt, adjust status if no critical changes exist
      if (doc.freshnessReviewedAt && doc.baselineUpdatedAt && doc.freshnessReviewedAt >= doc.baselineUpdatedAt) {
        if (impact.status !== DocumentationFreshnessStatus.OUTDATED) {
          impact.status = DocumentationFreshnessStatus.UP_TO_DATE;
          impact.summary = 'User confirmed document is up to date based on latest review.';
        }
      }

      if (impact.status === DocumentationFreshnessStatus.UP_TO_DATE) upToDateCount++;
      else if (impact.status === DocumentationFreshnessStatus.REVIEW_RECOMMENDED) reviewRecommendedCount++;
      else if (impact.status === DocumentationFreshnessStatus.OUTDATED) outdatedCount++;
      else unknownCount++;

      documentImpactResults.push(impact);
    }

    // Determine overall scan status
    let overallStatus = DocumentationFreshnessStatus.UP_TO_DATE;
    if (outdatedCount > 0) overallStatus = DocumentationFreshnessStatus.OUTDATED;
    else if (reviewRecommendedCount > 0) overallStatus = DocumentationFreshnessStatus.REVIEW_RECOMMENDED;
    else if (totalChangesDetected > 0) overallStatus = DocumentationFreshnessStatus.CHANGES_DETECTED;

    const summaryPayload = {
      documentsChecked: totalChecked,
      upToDate: upToDateCount,
      reviewRecommended: reviewRecommendedCount,
      outdated: outdatedCount,
      unknown: unknownCount,
      repositoryChanges: {
        total: totalChangesDetected,
        highImportance: overallHighImportanceChanges,
      },
    };

    // 4. Save scan in database
    const scan = await prisma.documentationFreshnessScan.create({
      data: {
        repositoryAnalysisId,
        baselineSnapshotId: documents[0]?.baselineSnapshotId || latestSnapshot.id,
        latestSnapshotId: latestSnapshot.id,
        status: overallStatus,
        summary: summaryPayload as any,
      },
    });

    // 5. Save impacts in database
    for (const res of documentImpactResults) {
      await prisma.documentationFreshnessImpact.create({
        data: {
          freshnessScanId: scan.id,
          documentId: res.documentId,
          status: res.status,
          impactScore: res.impactScore,
          confidence: res.confidence,
          summary: res.summary,
          reasons: res.reasons as any,
          affectedSections: res.affectedSections as any,
          deterministicEvidence: res.deterministicEvidence ? (res.deterministicEvidence as any) : null,
        },
      });
    }

    return {
      scanId: scan.id,
      status: overallStatus,
      scannedAt: scan.scannedAt.toISOString(),
      summary: summaryPayload,
      repositoryChanges: {
        total: totalChangesDetected,
        highImportance: overallHighImportanceChanges,
      },
    };
  },

  async getFreshnessSummary(repositoryAnalysisId: string) {
    let latestScan = await prisma.documentationFreshnessScan.findFirst({
      where: { repositoryAnalysisId },
      orderBy: { scannedAt: 'desc' },
      include: {
        impacts: {
          include: { document: true },
        },
      },
    });

    if (!latestScan) {
      await this.runFreshnessScan(repositoryAnalysisId, true);
      latestScan = await prisma.documentationFreshnessScan.findFirst({
        where: { repositoryAnalysisId },
        orderBy: { scannedAt: 'desc' },
        include: {
          impacts: {
            include: { document: true },
          },
        },
      });
    }

    if (!latestScan) {
      throw new FreshnessError('FRESHNESS_SCAN_FAILED', 'Failed to generate freshness scan summary', 500);
    }

    const documentSummaries = latestScan.impacts.map(imp => {
      const metadata = imp.document.metadata as any;
      return {
        documentId: imp.documentId,
        documentType: metadata?.type || 'README',
        fileName: metadata?.fileName || 'README.md',
        status: imp.status as DocumentationFreshnessStatus,
        impactScore: imp.impactScore,
        confidence: imp.confidence,
        summary: imp.summary,
      };
    });

    return {
      status: latestScan.status as DocumentationFreshnessStatus,
      lastScannedAt: latestScan.scannedAt.toISOString(),
      documents: documentSummaries,
    };
  },

  async getDocumentFreshnessDetail(documentId: string): Promise<any> {
    const doc = await prisma.documentation.findUnique({
      where: { id: documentId },
      include: {
        baselineSnapshot: true,
        repositoryAnalysis: true,
      },
    });

    if (!doc) {
      throw new FreshnessError('FRESHNESS_DOCUMENT_NOT_FOUND', `Document ${documentId} not found`, 404);
    }

    const latestImpact = await prisma.documentationFreshnessImpact.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
      include: { freshnessScan: true },
    });

    const latestSnapshot = await snapshotService.getLatestSnapshot(doc.repositoryAnalysisId);

    // If no impact recorded yet, run scan and re-query
    if (!latestImpact) {
      await this.runFreshnessScan(doc.repositoryAnalysisId, true);
      return this.getDocumentFreshnessDetail(documentId);
    }

    return {
      documentId: doc.id,
      status: latestImpact.status as DocumentationFreshnessStatus,
      impactScore: latestImpact.impactScore,
      confidence: latestImpact.confidence,
      summary: latestImpact.summary,
      reasons: (latestImpact.reasons as any) || [],
      affectedSections: (latestImpact.affectedSections as any) || [],
      deterministicEvidence: (latestImpact.deterministicEvidence as any) || null,
      baseline: {
        snapshotId: doc.baselineSnapshot?.id || null,
        commitSha: doc.baselineSnapshot?.commitSha || null,
        createdAt: doc.baselineSnapshot?.createdAt.toISOString() || doc.createdAt.toISOString(),
      },
      latest: {
        snapshotId: latestSnapshot?.id || null,
        commitSha: latestSnapshot?.commitSha || null,
        createdAt: latestSnapshot?.createdAt.toISOString() || new Date().toISOString(),
      },
    };
  },

  async markDocumentAsReviewed(documentId: string) {
    const doc = await prisma.documentation.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new FreshnessError('FRESHNESS_DOCUMENT_NOT_FOUND', `Document ${documentId} not found`, 404);
    }

    const latestSnapshot = await snapshotService.ensureSnapshotForAnalysis(doc.repositoryAnalysisId);

    const now = new Date();

    const updatedDoc = await prisma.documentation.update({
      where: { id: documentId },
      data: {
        baselineSnapshotId: latestSnapshot.id,
        baselineUpdatedAt: now,
        freshnessReviewedAt: now,
        freshnessReviewSource: 'USER_CONFIRMED',
      },
    });

    // Update existing impact status to UP_TO_DATE
    const latestImpact = await prisma.documentationFreshnessImpact.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });

    if (latestImpact) {
      await prisma.documentationFreshnessImpact.update({
        where: { id: latestImpact.id },
        data: {
          status: DocumentationFreshnessStatus.UP_TO_DATE,
          summary: 'User confirmed document is up to date based on latest repository review.',
          impactScore: 0,
        },
      });
    }

    return updatedDoc;
  },

  async regenerateAffectedSections(documentId: string, targetSections: string[], customInstructions?: string) {
    const doc = await prisma.documentation.findUnique({
      where: { id: documentId },
      include: { repositoryAnalysis: true },
    });

    if (!doc) {
      throw new FreshnessError('FRESHNESS_DOCUMENT_NOT_FOUND', `Document ${documentId} not found`, 404);
    }

    const latestSnapshot = await snapshotService.ensureSnapshotForAnalysis(doc.repositoryAnalysisId);
    const detail = await this.getDocumentFreshnessDetail(documentId);

    const docType = (doc.metadata as any)?.type || 'README';

    const prompt = buildFreshnessPrompt({
      documentType: docType,
      currentMarkdown: doc.markdown,
      sections: doc.sections as any,
      repositoryAnalysis: doc.repositoryAnalysis.analysisData,
      reasons: detail.reasons,
      targetSections,
      customInstructions,
    });

    const orchestrator = new AIOrchestrator();
    const sectionTitle = targetSections[0] || 'README';
    const aiResult = await orchestrator.generateSection(sectionTitle, doc.markdown, prompt.userPrompt);

    const updatedMarkdown = aiResult.result.markdown;
    const parsedSections = SectionParser.parse(updatedMarkdown);
    const updatedSections = parsedSections.length > 0 ? parsedSections : doc.sections;

    // Recalculate Quality Score
    const qualityResult = await QualityService.evaluate(documentId);

    // Update Document Baseline & Content
    const now = new Date();
    const updatedDoc = await prisma.documentation.update({
      where: { id: documentId },
      data: {
        markdown: updatedMarkdown,
        sections: updatedSections as any,
        qualityScore: qualityResult.overallScore,
        qualityData: qualityResult as any,
        qualityEvaluatedAt: now,
        baselineSnapshotId: latestSnapshot.id,
        baselineUpdatedAt: now,
        freshnessReviewedAt: now,
        freshnessReviewSource: 'SECTION_REGENERATED',
      },
    });

    // Create DocumentationVersion
    const version = await VersionService.createVersion({
      documentId,
      markdown: updatedMarkdown,
      sections: updatedSections,
      metadata: doc.metadata,
      qualityScore: qualityResult.overallScore,
      qualityData: qualityResult,
      sourceType: 'SECTION_REGENERATION',
      sourceLabel: `Regenerated sections: ${targetSections.join(', ')}`,
      baselineSnapshotId: latestSnapshot.id,
      baselineUpdatedAt: now,
    });

    // Update impact status to UP_TO_DATE
    const latestImpact = await prisma.documentationFreshnessImpact.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
    if (latestImpact) {
      await prisma.documentationFreshnessImpact.update({
        where: { id: latestImpact.id },
        data: {
          status: DocumentationFreshnessStatus.UP_TO_DATE,
          summary: 'Affected sections regenerated and updated to latest repository state.',
          impactScore: 0,
        },
      });
    }

    return {
      document: updatedDoc,
      version,
      quality: qualityResult,
    };
  },

  async previewFullRegeneration(documentId: string) {
    const doc = await prisma.documentation.findUnique({
      where: { id: documentId },
      include: { repositoryAnalysis: true },
    });

    if (!doc) {
      throw new FreshnessError('FRESHNESS_DOCUMENT_NOT_FOUND', `Document ${documentId} not found`, 404);
    }

    const detail = await this.getDocumentFreshnessDetail(documentId);
    const docType = (doc.metadata as any)?.type || 'README';

    const prompt = buildFreshnessPrompt({
      documentType: docType,
      currentMarkdown: doc.markdown,
      sections: doc.sections as any,
      repositoryAnalysis: doc.repositoryAnalysis.analysisData,
      reasons: detail.reasons,
      targetSections: [], // Empty means full document
      customInstructions: 'Regenerate complete document against latest repository analysis.',
    });

    const orchestrator = new AIOrchestrator();
    const analysisObj = typeof doc.repositoryAnalysis.analysisData === 'string' ? JSON.parse(doc.repositoryAnalysis.analysisData) : doc.repositoryAnalysis.analysisData;
    const context = ContextBuilder.build(analysisObj, doc.markdown);
    const aiResult = await orchestrator.generate(context, {
      template: 'professional',
      tone: 'technical',
    });

    const parsedSections = SectionParser.parse(aiResult.result.markdown);

    return {
      currentMarkdown: doc.markdown,
      proposedMarkdown: aiResult.result.markdown,
      proposedSections: parsedSections,
    };
  },

  async applyFullRegeneration(documentId: string, proposedMarkdown: string, proposedSections: any) {
    const doc = await prisma.documentation.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new FreshnessError('FRESHNESS_DOCUMENT_NOT_FOUND', `Document ${documentId} not found`, 404);
    }

    const latestSnapshot = await snapshotService.ensureSnapshotForAnalysis(doc.repositoryAnalysisId);
    const qualityResult = await QualityService.evaluate(documentId);

    const now = new Date();
    const updatedDoc = await prisma.documentation.update({
      where: { id: documentId },
      data: {
        markdown: proposedMarkdown,
        sections: proposedSections || doc.sections,
        qualityScore: qualityResult.overallScore,
        qualityData: qualityResult as any,
        qualityEvaluatedAt: now,
        baselineSnapshotId: latestSnapshot.id,
        baselineUpdatedAt: now,
        freshnessReviewedAt: now,
        freshnessReviewSource: 'DOCUMENT_REGENERATED',
      },
    });

    const version = await VersionService.createVersion({
      documentId,
      markdown: proposedMarkdown,
      sections: proposedSections || doc.sections,
      metadata: doc.metadata,
      qualityScore: qualityResult.overallScore,
      qualityData: qualityResult,
      sourceType: 'FULL_REGENERATION',
      sourceLabel: 'Full document regeneration based on latest repository state',
      baselineSnapshotId: latestSnapshot.id,
      baselineUpdatedAt: now,
    });

    // Reset impact status to UP_TO_DATE
    const latestImpact = await prisma.documentationFreshnessImpact.findFirst({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
    if (latestImpact) {
      await prisma.documentationFreshnessImpact.update({
        where: { id: latestImpact.id },
        data: {
          status: DocumentationFreshnessStatus.UP_TO_DATE,
          summary: 'Document regenerated and updated to latest repository state.',
          impactScore: 0,
        },
      });
    }

    return {
      document: updatedDoc,
      version,
      quality: qualityResult,
    };
  }
};
