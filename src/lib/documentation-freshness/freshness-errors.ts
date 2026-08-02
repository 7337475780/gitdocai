export type FreshnessErrorCode =
  | 'FRESHNESS_SCAN_FAILED'
  | 'FRESHNESS_BASELINE_MISSING'
  | 'FRESHNESS_REPOSITORY_UNAVAILABLE'
  | 'FRESHNESS_SNAPSHOT_FAILED'
  | 'FRESHNESS_CHANGE_DETECTION_FAILED'
  | 'FRESHNESS_IMPACT_ANALYSIS_FAILED'
  | 'FRESHNESS_DOCUMENT_NOT_FOUND'
  | 'FRESHNESS_REVIEW_CONFLICT'
  | 'FRESHNESS_SECTION_NOT_FOUND'
  | 'FRESHNESS_SECTION_REGENERATION_FAILED'
  | 'FRESHNESS_DOCUMENT_REGENERATION_FAILED'
  | 'FRESHNESS_REGENERATION_INVALID'
  | 'FRESHNESS_SCAN_LIMIT_EXCEEDED'
  | 'FRESHNESS_LATEST_STATE_UNAVAILABLE';

export class FreshnessError extends Error {
  public readonly code: FreshnessErrorCode;
  public readonly statusCode: number;

  constructor(code: FreshnessErrorCode, message: string, statusCode: number = 400) {
    super(message);
    this.name = 'FreshnessError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, FreshnessError.prototype);
  }
}
