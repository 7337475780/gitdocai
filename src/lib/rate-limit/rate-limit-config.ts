export interface RateLimitRule {
  windowMs: number;
  max: number;
}

export type RateLimitCategory =
  | 'GENERAL_API'
  | 'REPOSITORY_ANALYSIS'
  | 'DOCUMENT_GENERATION'
  | 'QUALITY_EVALUATION'
  | 'FRESHNESS_SCAN'
  | 'GITHUB_COMMIT'
  | 'EXPORT'
  | 'PUBLISH';

export const RATE_LIMIT_CONFIG: Record<RateLimitCategory, RateLimitRule> = {
  GENERAL_API: { windowMs: 60 * 1000, max: 60 },
  REPOSITORY_ANALYSIS: { windowMs: 15 * 60 * 1000, max: 5 },
  DOCUMENT_GENERATION: { windowMs: 15 * 60 * 1000, max: 10 },
  QUALITY_EVALUATION: { windowMs: 15 * 60 * 1000, max: 20 },
  FRESHNESS_SCAN: { windowMs: 15 * 60 * 1000, max: 10 },
  GITHUB_COMMIT: { windowMs: 15 * 60 * 1000, max: 10 },
  EXPORT: { windowMs: 15 * 60 * 1000, max: 20 },
  PUBLISH: { windowMs: 30 * 60 * 1000, max: 5 },
};
