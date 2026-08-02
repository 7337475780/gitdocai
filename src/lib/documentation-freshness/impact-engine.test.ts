import { describe, it, expect } from 'vitest';
import { impactEngine } from './impact-engine';
import { RepositoryChange, RepositoryChangeType, DocumentationFreshnessStatus } from './freshness-types';

describe('ImpactEngine', () => {
  const sampleMarkdown = `# Readme Title
## Available Scripts
Run \`npm run dev\` to start the server or \`npm run test\` for tests.

## Environment Variables
Requires \`DATABASE_URL\` and \`SECRET_KEY\`.

## API Endpoints
- GET /api/users
- DELETE /api/users/:id
`;

  it('assigns UP_TO_DATE status when no relevant changes exist', () => {
    const changes: RepositoryChange[] = [];
    const result = impactEngine.evaluateImpact('doc1', 'README', 'README.md', sampleMarkdown, [], changes);

    expect(result.status).toBe(DocumentationFreshnessStatus.UP_TO_DATE);
    expect(result.impactScore).toBe(0);
    expect(result.affectedSections.length).toBe(0);
  });

  it('assigns REVIEW_RECOMMENDED when script or env var changes affect sections', () => {
    const changes: RepositoryChange[] = [
      {
        type: RepositoryChangeType.SCRIPT_CHANGED,
        path: 'package.json',
        importance: 'HIGH',
        summary: 'Script "dev" changed',
        confidence: 95,
      },
    ];

    const result = impactEngine.evaluateImpact('doc1', 'README', 'README.md', sampleMarkdown, [], changes);

    expect(result.status).toBe(DocumentationFreshnessStatus.REVIEW_RECOMMENDED);
    expect(result.impactScore).toBeGreaterThan(0);
    expect(result.affectedSections.some(s => s.heading.includes('Scripts'))).toBe(true);
  });

  it('assigns OUTDATED when deterministic evidence proves a documented item was removed', () => {
    const changes: RepositoryChange[] = [
      {
        type: RepositoryChangeType.SCRIPT_CHANGED,
        path: 'package.json',
        importance: 'CRITICAL',
        summary: 'Script removed: test',
        evidence: 'removed_script:test',
        confidence: 100,
      },
    ];

    const result = impactEngine.evaluateImpact('doc1', 'README', 'README.md', sampleMarkdown, [], changes);

    expect(result.status).toBe(DocumentationFreshnessStatus.OUTDATED);
    expect(result.deterministicEvidence).toBeDefined();
    expect(result.deterministicEvidence?.item).toBe('test');
    expect(result.impactScore).toBeGreaterThanOrEqual(70);
  });

  it('separates impact score from confidence rating', () => {
    const changes: RepositoryChange[] = [
      {
        type: RepositoryChangeType.CONFIGURATION_CHANGED,
        path: 'tsconfig.json',
        importance: 'MEDIUM',
        summary: 'Compiler options updated',
        confidence: 55,
      },
    ];

    const result = impactEngine.evaluateImpact('doc1', 'SETUP', 'SETUP.md', sampleMarkdown, [], changes);

    expect(result.impactScore).toBeGreaterThan(0);
    expect(result.confidence).toBe(55);
    expect(result.impactScore).not.toBe(result.confidence);
  });
});
