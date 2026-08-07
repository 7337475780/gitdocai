import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/database/prisma';
import { getGitHubSession } from '@/lib/github/github-session';
import { HealthService } from '@/lib/documentation-intelligence/health-service';

// Mock getGitHubSession
vi.mock('@/lib/github/github-session', () => ({
  getGitHubSession: vi.fn(),
}));

// Mock HealthService
vi.mock('@/lib/documentation-intelligence/health-service', () => ({
  HealthService: {
    getDocumentationIntelligence: vi.fn(),
  },
}));

// Mock prisma client
vi.mock('@/lib/database/prisma', () => {
  return {
    prisma: {
      repositoryAnalysis: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      documentation: {
        findMany: vi.fn(),
      },
      documentationActivity: {
        findMany: vi.fn(),
      },
    },
  };
});

describe('Dashboard API Route Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Returns empty dashboard when user is not authenticated', async () => {
    vi.mocked(getGitHubSession).mockResolvedValue({
      user: undefined,
    } as any);

    const response = await GET();
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data.overview.totalRepositories).toBe(0);
    expect(json.data.overview.totalDocuments).toBe(0);
    expect(json.data.latestAnalysis).toBeNull();
    expect(json.data.recentActivity).toHaveLength(0);
  });

  it('2. Returns empty dashboard when user has no repositories', async () => {
    vi.mocked(getGitHubSession).mockResolvedValue({
      user: { login: 'testuser', name: 'Test User' },
    } as any);

    vi.mocked(prisma.repositoryAnalysis.findMany).mockResolvedValue([]);

    const response = await GET();
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data.overview.totalRepositories).toBe(0);
    expect(json.data.latestAnalysis).toBeNull();
  });

  it('3. Filters database queries by authenticated user repositoryOwner', async () => {
    vi.mocked(getGitHubSession).mockResolvedValue({
      user: { login: 'testuser', name: 'Test User' },
    } as any);

    vi.mocked(prisma.repositoryAnalysis.findMany).mockResolvedValue([
      {
        id: 'analysis-123',
        repositoryName: 'test-repo',
        repositoryOwner: 'testuser',
        createdAt: new Date(),
        _count: { documents: 2 },
      },
    ] as any);

    vi.mocked(HealthService.getDocumentationIntelligence).mockResolvedValue({
      repository: {
        name: 'test-repo',
        owner: 'testuser',
        branch: 'main',
        lastAnalyzedAt: new Date().toISOString(),
        analysisStatus: 'COMPLETED',
      },
      health: { score: 90, label: 'HEALTHY', summary: 'All good' },
      coverage: { percentage: 100, status: 'COMPLETE', recommendedCount: 2, generatedRecommendedCount: 2, missingDocuments: [] },
      quality: { averageScore: 85, status: 'GOOD', userFacingLabel: 'Good', lowestScore: 80, unknownCount: 0, below60Count: 0 },
      freshness: { status: 'UP_TO_DATE', upToDateCount: 2, reviewRecommendedCount: 0, changesDetectedCount: 0, outdatedCount: 0, unknownCount: 0 },
      publishing: { status: 'PUBLISHED', siteUrl: 'https://test.com' },
      nextAction: { type: 'OPEN_STUDIO', priority: 8, title: 'Open Studio', description: 'Review docs', href: '/studio' },
      documents: [],
      attentionItems: [],
      recentActivity: [],
    } as any);

    vi.mocked(prisma.documentationActivity.findMany).mockResolvedValue([]);

    const response = await GET();
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data.overview.totalRepositories).toBe(1);
    expect(json.data.overview.totalDocuments).toBe(2);
    expect(prisma.repositoryAnalysis.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { repositoryOwner: 'testuser' },
      })
    );
  });

  it('4. Correctly computes metrics for multi-analysis states', async () => {
    vi.mocked(getGitHubSession).mockResolvedValue({
      user: { login: 'testuser', name: 'Test User' },
    } as any);

    vi.mocked(prisma.repositoryAnalysis.findMany).mockResolvedValue([
      {
        id: 'analysis-1',
        repositoryName: 'repo-1',
        repositoryOwner: 'testuser',
        createdAt: new Date(),
        _count: { documents: 1 },
      },
      {
        id: 'analysis-2',
        repositoryName: 'repo-2',
        repositoryOwner: 'testuser',
        createdAt: new Date(),
        _count: { documents: 1 },
      },
    ] as any);

    vi.mocked(HealthService.getDocumentationIntelligence).mockResolvedValue({
      repository: { name: 'repo-1', owner: 'testuser', branch: 'main', lastAnalyzedAt: new Date().toISOString(), analysisStatus: 'COMPLETED' },
      health: { score: 90, label: 'HEALTHY', summary: 'All good' },
      coverage: { percentage: 100, status: 'COMPLETE', recommendedCount: 2, generatedRecommendedCount: 2, missingDocuments: [] },
      quality: { averageScore: 90, status: 'EXCELLENT', userFacingLabel: 'Excellent', lowestScore: 90, unknownCount: 0, below60Count: 0 },
      freshness: { status: 'UP_TO_DATE', upToDateCount: 1, reviewRecommendedCount: 0, changesDetectedCount: 0, outdatedCount: 0, unknownCount: 0 },
      publishing: { status: 'PUBLISHED', siteUrl: 'https://test.com' },
      nextAction: { type: 'OPEN_STUDIO', priority: 8, title: 'Open Studio', description: 'Review docs', href: '/studio' },
      documents: [],
      attentionItems: [],
      recentActivity: [],
    } as any);

    vi.mocked(prisma.documentation.findMany).mockResolvedValue([
      { qualityScore: 90, repositoryAnalysisId: 'analysis-1' },
      { qualityScore: 80, repositoryAnalysisId: 'analysis-2' },
    ] as any);

    vi.mocked(prisma.documentationActivity.findMany).mockResolvedValue([]);

    const response = await GET();
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data.overview.totalRepositories).toBe(2);
    expect(json.data.overview.averageQualityScore).toBe(85); // average of 90 and 80
  });
});
