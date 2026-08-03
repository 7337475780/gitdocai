export enum DocumentationHealthStatus {
  GETTING_STARTED = 'GETTING_STARTED',
  HEALTHY = 'HEALTHY',
  NEEDS_ATTENTION = 'NEEDS_ATTENTION',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  UNKNOWN = 'UNKNOWN',
}

export enum CoverageStatus {
  COMPLETE = 'COMPLETE',
  PARTIAL = 'PARTIAL',
  MINIMAL = 'MINIMAL',
  NONE = 'NONE',
}

export enum QualityStatus {
  EXCELLENT = 'EXCELLENT',
  GOOD = 'GOOD',
  NEEDS_IMPROVEMENT = 'NEEDS_IMPROVEMENT',
  POOR = 'POOR',
  UNKNOWN = 'UNKNOWN',
}

export enum DocumentationPublishState {
  NOT_PUBLISHED = 'NOT_PUBLISHED',
  PUBLISHED = 'PUBLISHED',
  PUBLISHING = 'PUBLISHING',
  PUBLISH_FAILED = 'PUBLISH_FAILED',
  NEEDS_REPUBLISHING = 'NEEDS_REPUBLISHING',
}

export type NextActionType =
  | 'GENERATE_DOCUMENTATION'
  | 'GENERATE_RECOMMENDED_DOCUMENTATION'
  | 'REVIEW_FRESHNESS'
  | 'RUN_FRESHNESS_SCAN'
  | 'IMPROVE_QUALITY'
  | 'REPUBLISH_SITE'
  | 'PREVIEW_SITE'
  | 'OPEN_STUDIO';

export interface DocumentationNextAction {
  type: NextActionType;
  title: string;
  description: string;
  href: string;
  documentId?: string;
  documentType?: string;
  priority: number;
  reasons: string[];
}

export interface RecommendedDocumentInfo {
  documentType: string;
  fileName: string;
  reason: string;
  importance: 'README' | 'SETUP' | 'ARCHITECTURE' | 'API' | 'CONTRIBUTING';
}

export interface DocumentationCoverageResult {
  percentage: number;
  status: CoverageStatus;
  recommendedCount: number;
  generatedRecommendedCount: number;
  recommendedDocuments: RecommendedDocumentInfo[];
  generatedDocuments: Array<{ id: string; type: string; fileName: string }>;
  missingDocuments: RecommendedDocumentInfo[];
  optionalDocuments: RecommendedDocumentInfo[];
  generatedOptionalDocuments: Array<{ id: string; type: string; fileName: string }>;
}

export interface QualitySummaryResult {
  status: QualityStatus;
  averageScore: number | null;
  lowestScore: number | null;
  below60Count: number;
  between60And79Count: number;
  eightyOrAboveCount: number;
  unknownCount: number;
  userFacingLabel: string;
}

export interface FreshnessSummaryResult {
  status: 'UP_TO_DATE' | 'CHANGES_DETECTED' | 'REVIEW_RECOMMENDED' | 'OUTDATED' | 'UNKNOWN';
  lastScannedAt: string | null;
  upToDateCount: number;
  changesDetectedCount: number;
  reviewRecommendedCount: number;
  outdatedCount: number;
  unknownCount: number;
}

export interface PublishingSummaryResult {
  status: DocumentationPublishState;
  userFacingLabel: string;
  lastPublishedAt: string | null;
  siteUrl: string | null;
}

export interface DocumentStatusItem {
  id: string;
  documentType: string;
  title: string;
  fileName: string;
  qualityScore: number | null;
  qualityStatus: QualityStatus;
  freshnessStatus: string;
  freshnessImpactScore: number | null;
  affectedSectionsCount: number;
  lastUpdated: string;
  publishingState: string;
  primaryAction: {
    label: string;
    href: string;
  };
}

export interface AttentionItem {
  id: string;
  title: string;
  description: string;
  severity: 'High' | 'Medium' | 'Low';
  category: 'coverage' | 'quality' | 'freshness' | 'publishing';
  action: {
    label: string;
    href: string;
    documentId?: string;
  };
}

export interface RecentActivityItem {
  id: string;
  type: string;
  summary: string;
  documentId?: string | null;
  documentType?: string | null;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface RepositoryOverviewData {
  name: string;
  owner: string;
  branch: string;
  lastAnalyzedAt: string;
  analysisStatus: string;
}

export interface DocumentationHealthSummary {
  status: DocumentationHealthStatus;
  label: string;
  summary: string;
  calculatedAt: string;
}

export interface DocumentationIntelligenceData {
  repository: RepositoryOverviewData;
  health: DocumentationHealthSummary;
  coverage: DocumentationCoverageResult;
  quality: QualitySummaryResult;
  freshness: FreshnessSummaryResult;
  publishing: PublishingSummaryResult;
  nextAction: DocumentationNextAction;
  documents: DocumentStatusItem[];
  attentionItems: AttentionItem[];
  recentActivity: RecentActivityItem[];
}
