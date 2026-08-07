import { prisma } from '../database/prisma';
import { ActivityService } from './activity-service';
import { CoverageCalculator } from './coverage-calculator';
import { FreshnessSummaryCalculator } from './freshness-summary';
import { HealthCalculator } from './health-calculator';
import { RepositoryNotFoundError, IntelligenceCalculationError } from './intelligence-errors';
import {
  AttentionItem,
  DocumentStatusItem,
  DocumentationIntelligenceData,
  DocumentationPublishState,
  QualityStatus,
} from './intelligence-types';
import { NextActionEngine } from './next-action-engine';
import { PublishSummaryCalculator } from './publish-summary';
import { QualitySummaryCalculator } from './quality-summary';

interface CacheEntry {
  data: DocumentationIntelligenceData;
  timestamp: number;
}

const healthCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15000; // 15s brief cache

export class HealthService {
  /**
   * Invalidate in-memory cache for a given repository analysis
   */
  static invalidateCache(repositoryAnalysisId: string): void {
    healthCache.delete(repositoryAnalysisId);
  }

  /**
   * Fetch and calculate total documentation intelligence for a repository analysis.
   */
  static async getDocumentationIntelligence(
    repositoryAnalysisId: string,
    forceRefresh: boolean = false
  ): Promise<DocumentationIntelligenceData> {
    if (!forceRefresh) {
      const cached = healthCache.get(repositoryAnalysisId);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached.data;
      }
    }

    try {
      // 1. Single optimized database query
      const repositoryAnalysis = await prisma.repositoryAnalysis.findUnique({
        where: { id: repositoryAnalysisId },
        select: {
          id: true,
          repositoryName: true,
          repositoryOwner: true,
          defaultBranch: true,
          analysisData: true,
          createdAt: true,
          documents: {
            select: {
              id: true,
              metadata: true,
              qualityScore: true,
              qualityData: true,
              qualityEvaluatedAt: true,
              updatedAt: true,
              createdAt: true,
            },
          },
          freshnessScans: {
            take: 1,
            orderBy: { scannedAt: 'desc' },
            include: {
              impacts: true,
            },
          },
          site: {
            include: {
              publishes: {
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
      });

      if (!repositoryAnalysis) {
        throw new RepositoryNotFoundError(repositoryAnalysisId);
      }

      const analysisData =
        typeof repositoryAnalysis.analysisData === 'string'
          ? JSON.parse(repositoryAnalysis.analysisData)
          : repositoryAnalysis.analysisData;

      const latestFreshnessScan = repositoryAnalysis.freshnessScans[0] || null;
      const documents = repositoryAnalysis.documents || [];

      // 2. Compute component summaries
      const coverage = CoverageCalculator.calculate(analysisData, documents);
      const quality = QualitySummaryCalculator.calculate(documents);
      const freshness = FreshnessSummaryCalculator.calculate(latestFreshnessScan, documents.length);
      const publishing = PublishSummaryCalculator.calculate(repositoryAnalysis.site, documents);
      const health = HealthCalculator.calculate(coverage, quality, freshness);

      // 3. Compute next action
      const nextAction = NextActionEngine.calculate(
        repositoryAnalysisId,
        coverage,
        quality,
        freshness,
        publishing,
        documents
      );

      // 4. Map document status items with priority sorting
      const documentItems = this.buildDocumentStatusItems(
        documents,
        latestFreshnessScan,
        publishing.status
      );

      // 5. Build attention items (top actionable issues)
      const attentionItems = this.buildAttentionItems(
        repositoryAnalysisId,
        coverage,
        quality,
        freshness,
        publishing,
        documents
      );

      // 6. Fetch recent activities
      const recentActivity = await ActivityService.getRecentActivities(repositoryAnalysisId, 5);

      const result: DocumentationIntelligenceData = {
        repository: {
          name: repositoryAnalysis.repositoryName,
          owner: repositoryAnalysis.repositoryOwner,
          branch: repositoryAnalysis.defaultBranch || 'main',
          lastAnalyzedAt: repositoryAnalysis.createdAt.toISOString(),
          analysisStatus: 'COMPLETED',
        },
        health,
        coverage,
        quality,
        freshness,
        publishing,
        nextAction,
        documents: documentItems,
        attentionItems,
        recentActivity,
      };

      // Update cache
      healthCache.set(repositoryAnalysisId, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error: any) {
      if (error instanceof RepositoryNotFoundError) {
        throw error;
      }
      console.error('Error calculating documentation intelligence:', error);
      throw new IntelligenceCalculationError(error?.message);
    }
  }

  /**
   * Format & sort document status list.
   * Priority:
   * 1. Potentially outdated
   * 2. Review recommended
   * 3. Low quality (<60)
   * 4. Missing quality
   * 5. Changes detected
   * 6. Up to date
   * Secondary sort: README > SETUP > ARCHITECTURE > API > CONTRIBUTING
   */
  private static buildDocumentStatusItems(
    documents: Array<{
      id: string;
      metadata: any;
      qualityScore: number | null;
      updatedAt: Date;
    }>,
    latestFreshnessScan: any,
    publishState: DocumentationPublishState
  ): DocumentStatusItem[] {
    const freshnessImpactMap = new Map<string, { status: string; score: number; sectionsCount: number }>();
    if (latestFreshnessScan?.impacts) {
      for (const imp of latestFreshnessScan.impacts) {
        const affectedSections = Array.isArray(imp.affectedSections) ? imp.affectedSections.length : 0;
        freshnessImpactMap.set(imp.documentId, {
          status: imp.status || 'UNKNOWN',
          score: imp.impactScore || 0,
          sectionsCount: affectedSections,
        });
      }
    }

    const items: Array<DocumentStatusItem & { priorityRank: number; importanceRank: number }> = documents.map(doc => {
      const type = ((doc.metadata as any)?.type || (doc.metadata as any)?.documentType || 'README').toUpperCase();
      const fileName = (doc.metadata as any)?.fileName || `${type}.md`;
      const title = (doc.metadata as any)?.title || type;

      const freshInfo = freshnessImpactMap.get(doc.id) || {
        status: 'UNKNOWN',
        score: null,
        sectionsCount: 0,
      };

      const qScore = doc.qualityScore;
      let qualityStatus = QualityStatus.UNKNOWN;
      if (qScore !== null && qScore !== undefined) {
        if (qScore >= 90) qualityStatus = QualityStatus.EXCELLENT;
        else if (qScore >= 75) qualityStatus = QualityStatus.GOOD;
        else if (qScore >= 60) qualityStatus = QualityStatus.NEEDS_IMPROVEMENT;
        else qualityStatus = QualityStatus.POOR;
      }

      // Determine priority rank
      let priorityRank = 6;
      if (freshInfo.status === 'OUTDATED') priorityRank = 1;
      else if (freshInfo.status === 'REVIEW_RECOMMENDED') priorityRank = 2;
      else if (qScore !== null && qScore !== undefined && qScore < 60) priorityRank = 3;
      else if (qScore === null || qScore === undefined) priorityRank = 4;
      else if (freshInfo.status === 'CHANGES_DETECTED') priorityRank = 5;
      else priorityRank = 6;

      // Determine importance rank
      const importanceOrder: Record<string, number> = {
        README: 1,
        SETUP: 2,
        ARCHITECTURE: 3,
        API: 4,
        CONTRIBUTING: 5,
      };
      const importanceRank = importanceOrder[type] || 99;

      let primaryActionLabel = 'Open';
      let primaryActionHref = `/studio/${doc.id}`;
      if (freshInfo.status === 'OUTDATED' || freshInfo.status === 'REVIEW_RECOMMENDED') {
        primaryActionLabel = 'Review';
        primaryActionHref = `/studio/${doc.id}?tab=freshness`;
      } else if (qScore !== null && qScore !== undefined && qScore < 60) {
        primaryActionLabel = 'Improve';
        primaryActionHref = `/studio/${doc.id}?tab=quality`;
      }

      return {
        id: doc.id,
        documentType: type,
        title,
        fileName,
        qualityScore: qScore,
        qualityStatus,
        freshnessStatus: freshInfo.status,
        freshnessImpactScore: freshInfo.score,
        affectedSectionsCount: freshInfo.sectionsCount,
        lastUpdated: new Date(doc.updatedAt).toISOString(),
        publishingState: publishState,
        primaryAction: {
          label: primaryActionLabel,
          href: primaryActionHref,
        },
        priorityRank,
        importanceRank,
      };
    });

    items.sort((a, b) => {
      if (a.priorityRank !== b.priorityRank) return a.priorityRank - b.priorityRank;
      return a.importanceRank - b.importanceRank;
    });

    return items.map(({ priorityRank: _p, importanceRank: _i, ...rest }) => rest);
  }

  /**
   * Build actionable attention items (top 5 max).
   */
  private static buildAttentionItems(
    repositoryAnalysisId: string,
    coverage: any,
    quality: any,
    freshness: any,
    publishing: any,
    documents: any[]
  ): AttentionItem[] {
    const items: AttentionItem[] = [];

    // 1. Missing recommended docs
    for (const missing of coverage.missingDocuments) {
      items.push({
        id: `missing-${missing.documentType}`,
        title: `${missing.documentType} documentation is missing`,
        description: missing.reason,
        severity: missing.importance === 'README' || missing.importance === 'SETUP' ? 'High' : 'Medium',
        category: 'coverage',
        action: {
          label: `Generate ${missing.documentType}`,
          href: `#generate-recommended`,
        },
      });
    }

    // 2. Outdated / review recommended docs
    if (freshness.outdatedCount > 0) {
      items.push({
        id: 'freshness-outdated',
        title: 'Documentation is potentially outdated',
        description: `${freshness.outdatedCount} document(s) have significant repository code changes detected.`,
        severity: 'High',
        category: 'freshness',
        action: {
          label: 'Review changes',
          href: `/studio/${documents[0]?.id}?tab=freshness`,
        },
      });
    } else if (freshness.reviewRecommendedCount > 0) {
      items.push({
        id: 'freshness-review',
        title: 'Documentation review recommended',
        description: `${freshness.reviewRecommendedCount} document(s) have code modifications that may affect section accuracy.`,
        severity: 'Medium',
        category: 'freshness',
        action: {
          label: 'Review changes',
          href: `/studio/${documents[0]?.id}?tab=freshness`,
        },
      });
    } else if (freshness.status === 'UNKNOWN' && documents.length > 0) {
      items.push({
        id: 'freshness-unscanned',
        title: 'Documentation freshness has not been checked',
        description: 'Scan your repository to verify if existing documentation matches your active codebase.',
        severity: 'Low',
        category: 'freshness',
        action: {
          label: 'Run freshness scan',
          href: `#run-freshness-scan`,
        },
      });
    }

    // 3. Low quality docs
    const lowQualityDocs = documents.filter(d => d.qualityScore !== null && d.qualityScore < 60);
    for (const lowDoc of lowQualityDocs) {
      const type = (lowDoc.metadata as any)?.type || 'README';
      items.push({
        id: `quality-${lowDoc.id}`,
        title: `${type} quality is below recommended level`,
        description: `Score is ${lowDoc.qualityScore}/100. Key structural sections or prerequisite details are missing.`,
        severity: 'High',
        category: 'quality',
        action: {
          label: 'Improve quality',
          href: `/studio/${lowDoc.id}?tab=quality`,
          documentId: lowDoc.id,
        },
      });
    }

    // 4. Publishing status
    if (publishing.status === DocumentationPublishState.NEEDS_REPUBLISHING) {
      items.push({
        id: 'publish-outdated',
        title: 'Documentation site needs republishing',
        description: 'New updates have been saved to your documentation since the last site deployment.',
        severity: 'Medium',
        category: 'publishing',
        action: {
          label: 'Republish site',
          href: `#publish-site`,
        },
      });
    }

    // De-duplicate items by id and limit to top 5
    const seen = new Set<string>();
    const uniqueItems: AttentionItem[] = [];
    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        uniqueItems.push(item);
      }
      if (uniqueItems.length >= 5) break;
    }

    return uniqueItems;
  }
}
