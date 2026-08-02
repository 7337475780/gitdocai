import { describe, it, expect } from 'vitest';
import { snapshotService } from './snapshot-service';
import { RepositoryFileManifest } from './freshness-types';

describe('SnapshotService', () => {
  const sampleManifest: RepositoryFileManifest = {
    commitSha: 'abc1234',
    branch: 'main',
    files: {
      'src/index.ts': { hash: 'hash1', size: 100 },
      'package.json': { hash: 'hash2', size: 500 },
    },
    dependencies: { react: '19.0.0' },
    scripts: { dev: 'next dev' },
    envVars: ['DATABASE_URL'],
    apiRoutes: ['/api/users'],
  };

  it('calculates deterministic fingerprints for identical manifests', () => {
    const fp1 = snapshotService.calculateFingerprint(sampleManifest, 'abc1234');
    const fp2 = snapshotService.calculateFingerprint(sampleManifest, 'abc1234');
    expect(fp1).toBe(fp2);
    expect(fp1.length).toBe(64);
  });

  it('produces different fingerprints when manifest or commit SHA changes', () => {
    const fp1 = snapshotService.calculateFingerprint(sampleManifest, 'abc1234');
    const fp2 = snapshotService.calculateFingerprint(sampleManifest, 'def5678');

    const modifiedManifest: RepositoryFileManifest = {
      ...sampleManifest,
      scripts: { dev: 'next dev --turbo' },
    };
    const fp3 = snapshotService.calculateFingerprint(modifiedManifest, 'abc1234');

    expect(fp1).not.toBe(fp2);
    expect(fp1).not.toBe(fp3);
  });

  it('extracts file manifests cleanly from repository analysis data', () => {
    const analysisData = {
      fileTree: [
        { path: 'src/app/page.tsx', type: 'file', size: 250 },
        { path: 'package.json', type: 'file', size: 400 },
      ],
      packageJson: {
        dependencies: { next: '16.0.0' },
        scripts: { build: 'next build' },
      },
      envVars: ['PORT'],
    };

    const manifest = snapshotService.extractManifestFromAnalysis(analysisData);
    expect(manifest.files['src/app/page.tsx']).toBeDefined();
    expect(manifest.dependencies?.next).toBe('16.0.0');
    expect(manifest.scripts?.build).toBe('next build');
    expect(manifest.envVars).toContain('PORT');
  });
});
