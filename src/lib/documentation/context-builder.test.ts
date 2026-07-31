import { describe, it, expect } from 'vitest';
import { ContextBuilder } from './context-builder';
import { RepositoryAnalysisResult } from '@/types';

describe('ContextBuilder', () => {
  it('should build a compact context and filter unnecessary files', () => {
    const mockAnalysis: RepositoryAnalysisResult = {
      repositoryName: 'test-repo',
      owner: 'test-owner',
      url: 'https://github.com/test/repo',
      description: 'A test',
      primaryLanguage: 'TypeScript',
      projectType: 'Frontend Web Application',
      packageManager: 'npm',
      framework: 'React',
      styling: 'Tailwind',
      mainBranch: 'main',
      status: 'Active',
      technologies: [{ name: 'React', category: 'Framework', confidence: 'high', evidence: [] }],
      signals: [{ type: 'Environment', value: 'API_KEY' }],
      scripts: [{ name: 'dev', command: 'vite' }],
      readinessScore: 80,
      readinessDetails: { score: 80, label: 'Good', present: [], recommended: [] },
      metadata: {} as any,
      languages: [],
      tree: {
        truncated: false,
        files: [
          { path: 'src/main.ts', type: 'blob', size: 100 },
          { path: 'node_modules/test/index.js', type: 'blob', size: 100 },
          { path: '.git/config', type: 'blob', size: 100 }
        ]
      }
    };

    const context = ContextBuilder.build(mockAnalysis);
    
    expect(context.repository.name).toBe('test-repo');
    expect(context.packageManager).toBe('npm');
    expect(context.technologies[0].name).toBe('React');
    expect(context.environmentVars).toContain('API_KEY');
    
    // Should filter out node_modules and .git
    expect(context.tree.length).toBe(1);
    expect(context.tree[0]).toBe('src/main.ts');
  });

  it('should truncate large existing READMEs', () => {
    const mockAnalysis = {
      tree: { files: [] },
      technologies: [],
      signals: [],
      scripts: [],
    } as unknown as RepositoryAnalysisResult;

    const largeReadme = 'A'.repeat(2000);
    const context = ContextBuilder.build(mockAnalysis, largeReadme);

    expect(context.existingReadmeExcerpt?.length).toBeLessThan(1600);
    expect(context.existingReadmeExcerpt).toContain('... (truncated)');
  });
});
