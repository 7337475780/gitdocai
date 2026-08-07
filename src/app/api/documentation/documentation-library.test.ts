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
      documentation: {
        findMany: vi.fn(),
      },
    },
  };
});

describe('Documentation Library API Route Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDocs = [
    {
      id: 'doc-1',
      repositoryAnalysisId: 'analysis-1',
      qualityScore: 95,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      metadata: JSON.stringify({ title: 'React Guide', type: 'README' }),
      revision: 1,
      repositoryAnalysis: {
        repositoryName: 'react-app',
        repositoryOwner: 'testuser',
      },
      freshnessImpacts: [{ status: 'UP_TO_DATE' }],
    },
    {
      id: 'doc-2',
      repositoryAnalysisId: 'analysis-2',
      qualityScore: 50,
      createdAt: new Date('2026-01-03T00:00:00.000Z'),
      updatedAt: new Date('2026-01-04T00:00:00.000Z'),
      metadata: JSON.stringify({ title: 'API Documentation', type: 'API' }),
      revision: 2,
      repositoryAnalysis: {
        repositoryName: 'node-api',
        repositoryOwner: 'testuser',
      },
      freshnessImpacts: [{ status: 'OUTDATED' }],
    },
  ];

  it('1. Returns empty list when user is not authenticated', async () => {
    vi.mocked(getGitHubSession).mockResolvedValue({
      user: undefined,
    } as any);

    const req = new Request('http://localhost/api/documentation');
    const response = await GET(req);
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(0);
  });

  it('2. Filters database queries by authenticated user repositoryOwner', async () => {
    vi.mocked(getGitHubSession).mockResolvedValue({
      user: { login: 'testuser', name: 'Test User' },
    } as any);

    vi.mocked(prisma.documentation.findMany).mockResolvedValue(mockDocs as any);

    const req = new Request('http://localhost/api/documentation');
    const response = await GET(req);
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(2);
    expect(prisma.documentation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          repositoryAnalysis: {
            repositoryOwner: 'testuser',
          },
        },
      })
    );
  });

  it('3. Filters by search query correctly', async () => {
    vi.mocked(getGitHubSession).mockResolvedValue({
      user: { login: 'testuser', name: 'Test User' },
    } as any);
    vi.mocked(prisma.documentation.findMany).mockResolvedValue(mockDocs as any);

    const req = new Request('http://localhost/api/documentation?search=React');
    const response = await GET(req);
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].title).toBe('React Guide');
  });

  it('4. Filters by type correctly', async () => {
    vi.mocked(getGitHubSession).mockResolvedValue({
      user: { login: 'testuser', name: 'Test User' },
    } as any);
    vi.mocked(prisma.documentation.findMany).mockResolvedValue(mockDocs as any);

    const req = new Request('http://localhost/api/documentation?type=api');
    const response = await GET(req);
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].type).toBe('API');
  });

  it('5. Filters by quality status correctly', async () => {
    vi.mocked(getGitHubSession).mockResolvedValue({
      user: { login: 'testuser', name: 'Test User' },
    } as any);
    vi.mocked(prisma.documentation.findMany).mockResolvedValue(mockDocs as any);

    const req = new Request('http://localhost/api/documentation?quality=poor');
    const response = await GET(req);
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('doc-2');
  });

  it('6. Filters by freshness status correctly', async () => {
    vi.mocked(getGitHubSession).mockResolvedValue({
      user: { login: 'testuser', name: 'Test User' },
    } as any);
    vi.mocked(prisma.documentation.findMany).mockResolvedValue(mockDocs as any);

    const req = new Request('http://localhost/api/documentation?freshness=outdated');
    const response = await GET(req);
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].id).toBe('doc-2');
  });

  it('7. Sorts by title correctly', async () => {
    vi.mocked(getGitHubSession).mockResolvedValue({
      user: { login: 'testuser', name: 'Test User' },
    } as any);
    vi.mocked(prisma.documentation.findMany).mockResolvedValue(mockDocs as any);

    const req = new Request('http://localhost/api/documentation?sort=title&order=asc');
    const response = await GET(req);
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data[0].title).toBe('API Documentation'); // alphabetically first
  });
});
