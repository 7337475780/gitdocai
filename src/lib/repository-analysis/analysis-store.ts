import { RepositoryAnalysisResult } from '@/schemas/analysis';

export type RepositoryAnalysisRecord = {
  analysisId: string;
  analysis: RepositoryAnalysisResult;
  createdAt: Date;
};

class RepositoryAnalysisStore {
  private analyses = new Map<string, RepositoryAnalysisRecord>();

  save(record: RepositoryAnalysisRecord): void {
    this.analyses.set(record.analysisId, record);
  }

  get(analysisId: string): RepositoryAnalysisRecord | null {
    return this.analyses.get(analysisId) ?? null;
  }

  has(analysisId: string): boolean {
    return this.analyses.has(analysisId);
  }

  delete(analysisId: string): boolean {
    return this.analyses.delete(analysisId);
  }
}

export const repositoryAnalysisStore = new RepositoryAnalysisStore();
