import { describe, it, expect } from 'vitest';
import { changeDetector } from './change-detector';
import { RepositoryFileManifest, RepositoryChangeType } from './freshness-types';

describe('ChangeDetector', () => {
  const baseline: RepositoryFileManifest = {
    files: {
      'src/index.ts': { hash: 'h1', size: 100 },
      'src/old.ts': { hash: 'h2', size: 200 },
      'package.json': { hash: 'hp1', size: 300 },
    },
    dependencies: { lodash: '4.17.21' },
    scripts: { dev: 'next dev', test: 'vitest' },
    envVars: ['DATABASE_URL', 'OLD_VAR'],
    apiRoutes: ['/api/users', '/api/legacy'],
  };

  it('detects added, removed, modified, and renamed files', () => {
    const latest: RepositoryFileManifest = {
      files: {
        'src/index.ts': { hash: 'h1_modified', size: 120 }, // modified
        'src/new.ts': { hash: 'h2', size: 200 }, // renamed from old.ts
        'src/created.ts': { hash: 'h3', size: 50 }, // added
        'package.json': { hash: 'hp1', size: 300 },
      },
      dependencies: { lodash: '4.17.21' },
      scripts: { dev: 'next dev', test: 'vitest' },
      envVars: ['DATABASE_URL', 'OLD_VAR'],
      apiRoutes: ['/api/users', '/api/legacy'],
    };

    const changes = changeDetector.detectChanges(baseline, latest);

    expect(changes.some(c => c.type === RepositoryChangeType.FILE_RENAMED && c.path === 'src/new.ts')).toBe(true);
    expect(changes.some(c => c.type === RepositoryChangeType.FILE_ADDED && c.path === 'src/created.ts')).toBe(true);
    expect(changes.some(c => c.type === RepositoryChangeType.FILE_MODIFIED && c.path === 'src/index.ts')).toBe(true);
  });

  it('detects script changes and package dependency updates', () => {
    const latest: RepositoryFileManifest = {
      ...baseline,
      dependencies: { lodash: '4.17.21', axios: '1.6.0' }, // added axios
      scripts: { dev: 'next dev --turbo' }, // modified dev script, removed test script
    };

    const changes = changeDetector.detectChanges(baseline, latest);

    expect(changes.some(c => c.type === RepositoryChangeType.DEPENDENCY_CHANGED && c.summary.includes('axios'))).toBe(true);
    expect(changes.some(c => c.type === RepositoryChangeType.SCRIPT_CHANGED && c.summary.includes('dev'))).toBe(true);
    expect(changes.some(c => c.type === RepositoryChangeType.SCRIPT_CHANGED && c.importance === 'CRITICAL')).toBe(true);
  });

  it('detects environment variable and API route removals', () => {
    const latest: RepositoryFileManifest = {
      ...baseline,
      envVars: ['DATABASE_URL'], // OLD_VAR removed
      apiRoutes: ['/api/users'], // /api/legacy removed
    };

    const changes = changeDetector.detectChanges(baseline, latest);

    const envChange = changes.find(c => c.type === RepositoryChangeType.ENVIRONMENT_CHANGED && c.evidence?.includes('OLD_VAR'));
    const apiChange = changes.find(c => c.type === RepositoryChangeType.API_CHANGED && c.evidence?.includes('/api/legacy'));

    expect(envChange).toBeDefined();
    expect(envChange?.importance).toBe('CRITICAL');

    expect(apiChange).toBeDefined();
    expect(apiChange?.importance).toBe('CRITICAL');
  });
});
