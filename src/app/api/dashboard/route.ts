import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { HealthService } from '@/lib/documentation-intelligence/health-service';
import { DocumentationIntelligenceData } from '@/lib/documentation-intelligence/intelligence-types';
import { getGitHubSession } from '@/lib/github/github-session';

export interface DashboardData {
  overview: {
    totalRepositories: number;
    totalDocuments: number;
    averageHealthScore: number | null;
    averageQualityScore: number | null;
    averageCoverage: number | null;
    documentsNeedingReview: number;
  };
  latestAnalysis: {
    id: string;
    repositoryName: string;
    repositoryOwner: string;
    intelligence: DocumentationIntelligenceData;
  } | null;
  recentActivity: Array<{
    id: string;
    type: string;
    summary: string;
    documentId: string | null;
    repositoryAnalysisId: string;
    repositoryName: string;
    createdAt: string;
    metadata?: Record<string, any>;
  }>;
  repositories: Array<{
    id: string;
    repositoryName: string;
    repositoryOwner: string;
    documentCount: number;
    createdAt: string;
  }>;
}

export async function GET() {
  try {
    const session = await getGitHubSession();
    const userLogin = session?.user?.login;

    // Filter by authenticated user's login. If no authenticated session exists, return an empty state.
    if (!userLogin) {
      return NextResponse.json({
        success: true,
        data: {
          overview: {
            totalRepositories: 0,
            totalDocuments: 0,
            averageHealthScore: null,
            averageQualityScore: null,
            averageCoverage: null,
            documentsNeedingReview: 0,
          },
          latestAnalysis: null,
          recentActivity: [],
          repositories: [],
        } satisfies DashboardData,
      });
    }

    // 1. Fetch all repository analyses for the current user
    const analyses = await prisma.repositoryAnalysis.findMany({
      where: {
        repositoryOwner: userLogin,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        repositoryName: true,
        repositoryOwner: true,
        createdAt: true,
        _count: {
          select: { documents: true },
        },
      },
    });

    const totalRepositories = analyses.length;
    const totalDocuments = analyses.reduce((sum, a) => sum + a._count.documents, 0);

    // 2. If no analyses exist, return empty dashboard
    if (totalRepositories === 0) {
      return NextResponse.json({
        success: true,
        data: {
          overview: {
            totalRepositories: 0,
            totalDocuments: 0,
            averageHealthScore: null,
            averageQualityScore: null,
            averageCoverage: null,
            documentsNeedingReview: 0,
          },
          latestAnalysis: null,
          recentActivity: [],
          repositories: [],
        } satisfies DashboardData,
      });
    }

    // 3. Get intelligence data for the latest analysis (reuse HealthService)
    const latestAnalysisRecord = analyses[0];
    let latestIntelligence: DocumentationIntelligenceData | null = null;

    try {
      latestIntelligence = await HealthService.getDocumentationIntelligence(
        latestAnalysisRecord.id
      );
    } catch {
      // If the latest fails, we still show overview metrics
    }

    // 4. Compute aggregated metrics across all user's analyses
    let averageHealthScore: number | null = null;
    let averageQualityScore: number | null = null;
    let averageCoverage: number | null = null;
    let documentsNeedingReview = 0;

    if (latestIntelligence) {
      if (analyses.length === 1) {
        averageQualityScore = latestIntelligence.quality.averageScore;
        averageCoverage = latestIntelligence.coverage.percentage;
        documentsNeedingReview =
          latestIntelligence.freshness.outdatedCount +
          latestIntelligence.freshness.reviewRecommendedCount;
        averageHealthScore = deriveHealthScore(latestIntelligence);
      } else {
        const allDocs = await prisma.documentation.findMany({
          where: {
            repositoryAnalysis: {
              repositoryOwner: userLogin,
            },
          },
          select: { qualityScore: true, repositoryAnalysisId: true },
        });

        const qualityScores = allDocs
          .filter(d => typeof d.qualityScore === 'number')
          .map(d => d.qualityScore as number);

        averageQualityScore =
          qualityScores.length > 0
            ? Math.round(qualityScores.reduce((s, v) => s + v, 0) / qualityScores.length)
            : null;

        // Coverage: average across analyses that have intelligence data
        averageCoverage = latestIntelligence.coverage.percentage;

        // Freshness: sum across latest analysis (freshness is per-analysis)
        documentsNeedingReview =
          latestIntelligence.freshness.outdatedCount +
          latestIntelligence.freshness.reviewRecommendedCount;

        averageHealthScore = deriveHealthScore(latestIntelligence);
      }
    }

    // 5. Fetch user's recent activity (across all user's analyses, most recent 10)
    const activityRecords = await prisma.documentationActivity.findMany({
      where: {
        repositoryAnalysis: {
          repositoryOwner: userLogin,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        repositoryAnalysis: {
          select: { repositoryName: true },
        },
      },
    });

    const recentActivity = activityRecords.map(r => ({
      id: r.id,
      type: r.type,
      summary: r.summary,
      documentId: r.documentId,
      repositoryAnalysisId: r.repositoryAnalysisId,
      repositoryName: r.repositoryAnalysis.repositoryName,
      createdAt: r.createdAt.toISOString(),
      metadata: (r.metadata as Record<string, any>) || undefined,
    }));

    // 6. Build repository list
    const repositories = analyses.map(a => ({
      id: a.id,
      repositoryName: a.repositoryName,
      repositoryOwner: a.repositoryOwner,
      documentCount: a._count.documents,
      createdAt: a.createdAt.toISOString(),
    }));

    const data: DashboardData = {
      overview: {
        totalRepositories,
        totalDocuments,
        averageHealthScore,
        averageQualityScore,
        averageCoverage,
        documentsNeedingReview,
      },
      latestAnalysis: latestIntelligence
        ? {
            id: latestAnalysisRecord.id,
            repositoryName: latestAnalysisRecord.repositoryName,
            repositoryOwner: latestAnalysisRecord.repositoryOwner,
            intelligence: latestIntelligence,
          }
        : null,
      recentActivity,
      repositories,
    };

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DASHBOARD_LOAD_FAILED',
          message: 'Unable to load dashboard data.',
        },
      },
      { status: 500 }
    );
  }
}

/**
 * Derive a numeric health score (0-100) from intelligence data.
 * Weights: coverage 30%, quality 40%, freshness 30%
 */
function deriveHealthScore(intelligence: DocumentationIntelligenceData): number {
  const coverageScore = intelligence.coverage.percentage;
  const qualityScore = intelligence.quality.averageScore ?? 0;

  // Freshness score: based on ratio of up-to-date documents
  const totalFreshnessDocs =
    intelligence.freshness.upToDateCount +
    intelligence.freshness.changesDetectedCount +
    intelligence.freshness.reviewRecommendedCount +
    intelligence.freshness.outdatedCount +
    intelligence.freshness.unknownCount;

  const freshnessScore =
    totalFreshnessDocs > 0
      ? Math.round(
          ((intelligence.freshness.upToDateCount +
            intelligence.freshness.changesDetectedCount * 0.7) /
            totalFreshnessDocs) *
            100
        )
      : 50; // Default to 50 when freshness hasn't been scanned

  return Math.round(coverageScore * 0.3 + qualityScore * 0.4 + freshnessScore * 0.3);
}
