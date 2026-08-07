import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/database/prisma';
import { getGitHubSession } from '@/lib/github/github-session';

// Mock getGitHubSession
vi.mock('@/lib/github/github-session', () => ({
  getGitHubSession: vi.fn(),
}));

// Mock prisma client
vi.mock('@/lib/database/prisma', () => {
  return {
    prisma: {
      documentationActivity: {
        count: vi.fn(),
        findMany: vi.fn(),
      },
    },
  };
});

describe('Unified History API Route Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Returns empty list when user is not authenticated', async () => {
    vi.mocked(getGitHubSession).mockResolvedValue({
      user: undefined,
    } as any);

    const response = await GET(new Request('http://localhost/api/history'));
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data.activities).toHaveLength(0);
    expect(json.data.pagination.total).toBe(0);
  });

  it('2. Filters query by authenticated user repositoryOwner', async () => {
    vi.mocked(getGitHubSession).mockResolvedValue({
      user: { login: 'testuser', name: 'Test User' },
    } as any);

    vi.mocked(prisma.documentationActivity.count).mockResolvedValue(1);
    vi.mocked(prisma.documentationActivity.findMany).mockResolvedValue([
      {
        id: 'act-1',
        type: 'DOCUMENT_GENERATED',
        summary: 'Readme generated',
        createdAt: new Date(),
        metadata: {},
        repositoryAnalysisId: 'repo-1',
        documentId: 'doc-1',
        repositoryAnalysis: {
          id: 'repo-1',
          repositoryName: 'test-repo',
          repositoryOwner: 'testuser',
          repositoryFullName: 'testuser/test-repo',
        },
        document: {
          id: 'doc-1',
          metadata: { title: 'Readme' },
        },
      },
    ] as any);

    const response = await GET(new Request('http://localhost/api/history'));
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data.activities).toHaveLength(1);
    expect(json.data.activities[0].summary).toBe('Readme generated');
    expect(prisma.documentationActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          repositoryAnalysis: {
            repositoryOwner: 'testuser',
          },
        }),
      })
    );
  });

  it('3. Respects query filters: type, repository, document, status, search, sorting, and pagination', async () => {
    vi.mocked(getGitHubSession).mockResolvedValue({
      user: { login: 'testuser', name: 'Test User' },
    } as any);

    vi.mocked(prisma.documentationActivity.count).mockResolvedValue(0);
    vi.mocked(prisma.documentationActivity.findMany).mockResolvedValue([]);

    const url = 'http://localhost/api/history?page=2&limit=5&type=DOCUMENT_UPDATED&repositoryAnalysisId=repo-abc&documentId=doc-xyz&status=SUCCESS&query=cool&sortBy=oldest';
    await GET(new Request(url));

    expect(prisma.documentationActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        orderBy: { createdAt: 'asc' },
        where: expect.objectContaining({
          type: 'DOCUMENT_UPDATED',
          repositoryAnalysisId: 'repo-abc',
          documentId: 'doc-xyz',
          metadata: {
            path: ['status'],
            equals: 'SUCCESS',
          },
          OR: [
            { summary: { contains: 'cool', mode: 'insensitive' } },
            { repositoryAnalysis: { repositoryName: { contains: 'cool', mode: 'insensitive' } } },
            { document: { metadata: { path: ['title'], string_contains: 'cool' } } },
          ],
        }),
      })
    );
  });
});
