import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { prisma } from '@/lib/database/prisma';
import { getGitHubSession } from '@/lib/github/github-session';
import { listGitHubRepositories } from '@/lib/github/github-repositories';

// Mock session
vi.mock('@/lib/github/github-session', () => ({
  getGitHubSession: vi.fn(),
}));

// Mock repositories service
vi.mock('@/lib/github/github-repositories', () => ({
  listGitHubRepositories: vi.fn(),
}));

// Mock prisma client
vi.mock('@/lib/database/prisma', () => {
  return {
    prisma: {
      repositoryAnalysis: {
        findMany: vi.fn(),
      },
    },
  };
});

describe('GitHub Repositories API Endpoint Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockReposPayload = {
    repositories: [
      {
        owner: 'testowner',
        name: 'repo-one',
        fullName: 'testowner/repo-one',
        defaultBranch: 'main',
        private: false,
        language: 'TypeScript',
        updatedAt: '2026-01-01T00:00:00.000Z',
        visibility: 'public',
      },
      {
        owner: 'testowner',
        name: 'repo-two',
        fullName: 'testowner/repo-two',
        defaultBranch: 'main',
        private: true,
        language: 'JavaScript',
        updatedAt: '2026-01-02T00:00:00.000Z',
        visibility: 'private',
      },
    ],
    page: 1,
    hasNextPage: false,
  };

  it('1. Returns 401 when user is not connected/authenticated', async () => {
    vi.mocked(getGitHubSession).mockResolvedValue({
      user: undefined,
    } as any);

    const req = new Request('http://localhost/api/github/repositories');
    const response = await GET(req as any);
    const json = await response.json();

    expect(response.status).toBe(401);
    expect(json.success).toBe(false);
    expect(json.error).toBe('Not connected to GitHub');
  });

  it('2. Returns repository list with analysisStatus injected from database analyses', async () => {
    vi.mocked(getGitHubSession).mockResolvedValue({
      user: { login: 'testuser', name: 'Test User' },
    } as any);

    vi.mocked(listGitHubRepositories).mockResolvedValue(mockReposPayload as any);

    // Mock existing database analyses
    vi.mocked(prisma.repositoryAnalysis.findMany).mockResolvedValue([
      {
        id: 'analysis-123',
        repositoryFullName: 'testowner/repo-one',
      },
    ] as any);

    const req = new Request('http://localhost/api/github/repositories');
    const response = await GET(req as any);
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.repositories).toHaveLength(2);

    // Verifies analysis ID and status cross-referencing
    expect(json.data.repositories[0].analysisId).toBe('analysis-123');
    expect(json.data.repositories[0].analysisStatus).toBe('COMPLETED');
    expect(json.data.repositories[1].analysisId).toBeNull();
    expect(json.data.repositories[1].analysisStatus).toBe('NONE');
  });
});
