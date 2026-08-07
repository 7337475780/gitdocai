import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock getGitHubSession
vi.mock('@/lib/github/github-session', () => ({
  getGitHubSession: vi.fn(),
}));

// Mock AIOrchestrator
vi.mock('@/lib/ai/ai-orchestrator', () => {
  return {
    AIOrchestrator: function (this: any) {
      this.generate = vi.fn().mockResolvedValue({
        result: { markdown: '# Mock Generated README\n\nThis is a mocked generated README for testing purposes that contains more than fifty characters to pass the validator.' },
        metadata: {
          provider: 'mock-gemini',
          model: 'gemini-1.5-flash',
          generationTimeMs: 120,
          attemptCount: 1,
        },
      });
    },
  };
});

// Mock prisma and services
vi.mock('@/lib/database/prisma', () => {
  const mockPrisma = {
    $transaction: vi.fn().mockImplementation((cb) => cb(mockPrisma)),
    documentation: {
      create: vi.fn().mockResolvedValue({ id: 'mock-doc-123' }),
      findUnique: vi.fn().mockResolvedValue({ id: 'mock-doc-123', revision: 1, markdown: '# Mock Generated README\n\nThis is a mocked generated README for testing purposes that contains more than fifty characters to pass the validator.' }),
    },
    documentationVersion: {
      create: vi.fn().mockResolvedValue({ id: 'mock-ver-123' }),
      count: vi.fn().mockResolvedValue(0),
      findFirst: vi.fn().mockResolvedValue(null),
    },
  };
  return {
    prisma: mockPrisma,
  };
});

vi.mock('@/lib/repository-analysis/repository-analysis.service', () => {
  return {
    repositoryAnalysisService: {
      getAnalysisById: vi.fn().mockResolvedValue({
        id: 'repo-analysis-123',
        repositoryUrl: 'https://github.com/test/test',
        repositoryOwner: 'test',
        repositoryName: 'test',
        analysisData: JSON.stringify({
          repository: {
            name: 'test',
            owner: 'test',
            url: 'https://github.com/test/test',
            mainBranch: 'main',
          },
          projectType: 'TypeScript Node.js App',
          packageManager: 'npm',
          technologies: [],
          scripts: [],
          environmentVars: [],
          signals: [],
          tree: { files: [] },
        }),
      }),
    },
  };
});

describe('Templates Generation API Route Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Rejects invalid template or option schema parameters', async () => {
    const response = await POST(
      new Request('http://localhost/api/documentation/generate', {
        method: 'POST',
        body: JSON.stringify({
          analysisId: 'repo-analysis-123',
          template: 'invalid-template',
          tone: 'professional',
        }),
      })
    );
    const json = await response.json();

    expect(json.success).toBe(false);
    expect(json.error.code).toBe('INVALID_REQUEST');
  });

  it('2. Successfully generates and persists documentation with custom options', async () => {
    const response = await POST(
      new Request('http://localhost/api/documentation/generate', {
        method: 'POST',
        body: JSON.stringify({
          analysisId: 'repo-analysis-123',
          template: 'api',
          tone: 'technical',
          title: 'My Custom API Title',
          includeInstallation: true,
          includeUsage: false,
          detailLevel: 'detailed',
        }),
      })
    );
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data.id).toBeDefined();
    expect(json.data.markdown).toBeDefined();
  });
});
