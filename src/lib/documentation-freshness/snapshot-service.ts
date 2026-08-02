import { createHash } from 'crypto';
import prisma from '../database/prisma';
import { RepositoryFileManifest, SnapshotFacts } from './freshness-types';
import { FreshnessError } from './freshness-errors';

export const snapshotService = {
  calculateFingerprint(fileManifest: RepositoryFileManifest, commitSha?: string): string {
    const raw = JSON.stringify({
      commitSha: commitSha || '',
      files: fileManifest.files || {},
      dependencies: fileManifest.dependencies || {},
      scripts: fileManifest.scripts || {},
      envVars: fileManifest.envVars || [],
      apiRoutes: fileManifest.apiRoutes || [],
      dbSchemas: fileManifest.dbSchemas || [],
    });
    return createHash('sha256').update(raw).digest('hex');
  },

  extractManifestFromAnalysis(analysisData: any): RepositoryFileManifest {
    const files: Record<string, { hash: string; size?: number; lastModified?: string }> = {};
    
    // Extract files from repository structure / files in analysisData
    if (analysisData?.fileTree) {
      const walk = (items: any[]) => {
        for (const item of items) {
          if (item.type === 'file' || item.path) {
            files[item.path] = {
              hash: item.hash || createHash('sha256').update(item.path + (item.size || 0)).digest('hex'),
              size: item.size,
            };
          }
          if (item.children && Array.isArray(item.children)) {
            walk(item.children);
          }
        }
      };
      if (Array.isArray(analysisData.fileTree)) {
        walk(analysisData.fileTree);
      }
    }

    if (analysisData?.files && typeof analysisData.files === 'object') {
      for (const [path, info] of Object.entries<any>(analysisData.files)) {
        files[path] = {
          hash: info.hash || createHash('sha256').update(path + (info.content || '')).digest('hex'),
          size: info.size || (info.content ? info.content.length : 0),
        };
      }
    }

    const dependencies = analysisData?.dependencies || analysisData?.packageJson?.dependencies || {};
    const scripts = analysisData?.scripts || analysisData?.packageJson?.scripts || {};
    const envVars = analysisData?.envVars || analysisData?.environmentVariables || [];
    const apiRoutes = analysisData?.apiRoutes || analysisData?.endpoints || [];
    const dbSchemas = analysisData?.dbSchemas || analysisData?.prismaSchema ? [analysisData.prismaSchema] : [];
    const dockerFiles = analysisData?.dockerFiles || [];
    const ciFiles = analysisData?.ciFiles || [];

    return {
      commitSha: analysisData?.commitSha,
      branch: analysisData?.branch,
      files,
      dependencies,
      scripts,
      envVars,
      apiRoutes,
      dbSchemas,
      dockerFiles,
      ciFiles,
    };
  },

  async createSnapshot(data: {
    repositoryAnalysisId: string;
    commitSha?: string;
    branch?: string;
    fileManifest: RepositoryFileManifest;
  }) {
    const fingerprint = this.calculateFingerprint(data.fileManifest, data.commitSha);

    // Check if an identical snapshot already exists for this repository analysis
    const existing = await prisma.repositorySnapshot.findFirst({
      where: {
        repositoryAnalysisId: data.repositoryAnalysisId,
        analysisFingerprint: fingerprint,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      return existing;
    }

    return await prisma.repositorySnapshot.create({
      data: {
        repositoryAnalysisId: data.repositoryAnalysisId,
        commitSha: data.commitSha || null,
        branch: data.branch || null,
        fileManifest: data.fileManifest as any,
        analysisFingerprint: fingerprint,
      },
    });
  },

  async getLatestSnapshot(repositoryAnalysisId: string) {
    return await prisma.repositorySnapshot.findFirst({
      where: { repositoryAnalysisId },
      orderBy: { createdAt: 'desc' },
    });
  },

  async getSnapshotById(snapshotId: string) {
    const snapshot = await prisma.repositorySnapshot.findUnique({
      where: { id: snapshotId },
    });
    if (!snapshot) {
      throw new FreshnessError('FRESHNESS_SNAPSHOT_FAILED', `Snapshot ${snapshotId} not found`, 404);
    }
    return snapshot;
  },

  async ensureSnapshotForAnalysis(repositoryAnalysisId: string, customManifest?: RepositoryFileManifest, commitSha?: string, branch?: string) {
    const analysis = await prisma.repositoryAnalysis.findUnique({
      where: { id: repositoryAnalysisId },
    });
    if (!analysis) {
      throw new FreshnessError('FRESHNESS_REPOSITORY_UNAVAILABLE', `Repository analysis ${repositoryAnalysisId} not found`, 404);
    }

    const manifest = customManifest || this.extractManifestFromAnalysis(analysis.analysisData);
    const resolvedSha = commitSha || manifest.commitSha || undefined;
    const resolvedBranch = branch || manifest.branch || analysis.defaultBranch || undefined;

    return await this.createSnapshot({
      repositoryAnalysisId,
      commitSha: resolvedSha,
      branch: resolvedBranch,
      fileManifest: manifest,
    });
  }
};
