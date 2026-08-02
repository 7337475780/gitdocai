export enum DocumentationFreshnessStatus {
  UP_TO_DATE = 'UP_TO_DATE',
  CHANGES_DETECTED = 'CHANGES_DETECTED',
  REVIEW_RECOMMENDED = 'REVIEW_RECOMMENDED',
  OUTDATED = 'OUTDATED',
  UNKNOWN = 'UNKNOWN',
}

export enum RepositoryChangeType {
  FILE_ADDED = 'FILE_ADDED',
  FILE_REMOVED = 'FILE_REMOVED',
  FILE_MODIFIED = 'FILE_MODIFIED',
  FILE_RENAMED = 'FILE_RENAMED',
  DEPENDENCY_CHANGED = 'DEPENDENCY_CHANGED',
  SCRIPT_CHANGED = 'SCRIPT_CHANGED',
  ENVIRONMENT_CHANGED = 'ENVIRONMENT_CHANGED',
  API_CHANGED = 'API_CHANGED',
  DATABASE_CHANGED = 'DATABASE_CHANGED',
  CONFIGURATION_CHANGED = 'CONFIGURATION_CHANGED',
  ARCHITECTURE_CHANGED = 'ARCHITECTURE_CHANGED',
  AUTHENTICATION_CHANGED = 'AUTHENTICATION_CHANGED',
  DOCKER_CHANGED = 'DOCKER_CHANGED',
  CI_CHANGED = 'CI_CHANGED',
  UNKNOWN = 'UNKNOWN',
}

export type ChangeImportance = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RepositoryChange {
  type: RepositoryChangeType;
  path: string;
  previousPath?: string;
  importance: ChangeImportance;
  summary: string;
  evidence?: string;
  confidence: number;
}

export interface AffectedSection {
  sectionId?: string;
  heading: string;
  status: DocumentationFreshnessStatus;
  reason: string;
}

export interface DeterministicEvidence {
  type: 'REMOVED_API_ENDPOINT' | 'REMOVED_SCRIPT' | 'REMOVED_ENV_VAR' | 'REMOVED_PACKAGE' | 'INVALID_COMMAND';
  item: string;
  details: string;
}

export interface ImpactScoreFactors {
  changeImportanceWeight: number;
  relevantChangesCount: number;
  confidenceAverage: number;
  affectedSectionsCount: number;
  hasDeterministicEvidence: boolean;
}

export interface DocumentImpactResult {
  documentId: string;
  documentType: string;
  fileName: string;
  status: DocumentationFreshnessStatus;
  impactScore: number;
  confidence: number;
  summary: string;
  reasons: RepositoryChange[];
  affectedSections: AffectedSection[];
  deterministicEvidence?: DeterministicEvidence | null;
  scoreFactors: ImpactScoreFactors;
}

export interface FreshnessScanSummary {
  scanId: string;
  status: DocumentationFreshnessStatus;
  scannedAt: string;
  summary: {
    documentsChecked: number;
    upToDate: number;
    reviewRecommended: number;
    outdated: number;
    unknown: number;
  };
  repositoryChanges: {
    total: number;
    highImportance: number;
  };
}

export interface RepositoryFileManifest {
  commitSha?: string;
  branch?: string;
  files: Record<string, { hash: string; size?: number; lastModified?: string }>;
  dependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  envVars?: string[];
  apiRoutes?: string[];
  dbSchemas?: string[];
  dockerFiles?: string[];
  ciFiles?: string[];
}

export interface SnapshotFacts {
  commitSha?: string;
  branch?: string;
  fileManifest: RepositoryFileManifest;
  fingerprint: string;
  createdAt: string;
}
