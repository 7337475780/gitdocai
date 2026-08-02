import { DocumentationVersionSource } from '@prisma/client';

export interface VersionSummary {
  versionId: string;
  versionNumber: number;
  sourceType: DocumentationVersionSource;
  sourceLabel: string | null;
  qualityScore: number | null;
  createdAt: string;
  isCurrent: boolean;
}

export interface VersionListResponse {
  versions: VersionSummary[];
  page: number;
  hasNextPage: boolean;
}

export interface VersionDetail {
  versionId: string;
  versionNumber: number;
  markdown: string;
  sections: any;
  metadata: any;
  qualityScore: number | null;
  qualityData: any;
  sourceType: DocumentationVersionSource;
  sourceLabel: string | null;
  createdAt: string;
}

export interface SectionDiff {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  section: string;
  before: string;
  after: string;
}

export interface VersionComparisonResult {
  baseVersion: {
    versionId: string;
    versionNumber: number;
  };
  compareVersion: {
    versionId: string;
    versionNumber: number;
  };
  summary: {
    addedLines: number;
    removedLines: number;
    changedSections: number;
  };
  changes: SectionDiff[];
}
