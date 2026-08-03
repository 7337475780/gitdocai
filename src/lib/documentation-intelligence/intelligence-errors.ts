export class DocumentationIntelligenceError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number = 500) {
    super(message);
    this.name = 'DocumentationIntelligenceError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class RepositoryNotFoundError extends DocumentationIntelligenceError {
  constructor(analysisId: string) {
    super(
      'INTELLIGENCE_REPOSITORY_NOT_FOUND',
      `Repository analysis '${analysisId}' was not found.`,
      404
    );
  }
}

export class AccessDeniedError extends DocumentationIntelligenceError {
  constructor() {
    super(
      'INTELLIGENCE_ACCESS_DENIED',
      'You do not have permission to access intelligence for this repository.',
      403
    );
  }
}

export class IntelligenceCalculationError extends DocumentationIntelligenceError {
  constructor(details?: string) {
    super(
      'INTELLIGENCE_CALCULATION_FAILED',
      details ? `Failed to calculate intelligence: ${details}` : 'Documentation health calculation failed.',
      500
    );
  }
}

export class CoverageCalculationError extends DocumentationIntelligenceError {
  constructor(details?: string) {
    super(
      'INTELLIGENCE_COVERAGE_FAILED',
      details ? `Coverage calculation failed: ${details}` : 'Documentation coverage calculation failed.',
      500
    );
  }
}

export class QualitySummaryError extends DocumentationIntelligenceError {
  constructor(details?: string) {
    super(
      'INTELLIGENCE_QUALITY_SUMMARY_FAILED',
      details ? `Quality summary failed: ${details}` : 'Documentation quality summary failed.',
      500
    );
  }
}

export class FreshnessSummaryError extends DocumentationIntelligenceError {
  constructor(details?: string) {
    super(
      'INTELLIGENCE_FRESHNESS_SUMMARY_FAILED',
      details ? `Freshness summary failed: ${details}` : 'Documentation freshness summary failed.',
      500
    );
  }
}

export class PublishSummaryError extends DocumentationIntelligenceError {
  constructor(details?: string) {
    super(
      'INTELLIGENCE_PUBLISH_SUMMARY_FAILED',
      details ? `Publishing summary failed: ${details}` : 'Documentation publish summary failed.',
      500
    );
  }
}

export class NextActionError extends DocumentationIntelligenceError {
  constructor(details?: string) {
    super(
      'INTELLIGENCE_NEXT_ACTION_FAILED',
      details ? `Next action engine failed: ${details}` : 'Failed to calculate primary next action.',
      500
    );
  }
}

export class ActivityServiceError extends DocumentationIntelligenceError {
  constructor(details?: string) {
    super(
      'INTELLIGENCE_ACTIVITY_FAILED',
      details ? `Activity operation failed: ${details}` : 'Documentation activity log operation failed.',
      500
    );
  }
}

export class IntelligenceIssuesError extends DocumentationIntelligenceError {
  constructor(details?: string) {
    super(
      'INTELLIGENCE_ISSUES_FAILED',
      details ? `Issues query failed: ${details}` : 'Failed to query documentation issues.',
      500
    );
  }
}

export class GenerateRecommendedError extends DocumentationIntelligenceError {
  constructor(details?: string) {
    super(
      'INTELLIGENCE_GENERATE_RECOMMENDED_FAILED',
      details ? `Failed to generate recommended documents: ${details}` : 'Recommended documentation generation failed.',
      500
    );
  }
}

export class DuplicateDocumentError extends DocumentationIntelligenceError {
  constructor(documentType: string) {
    super(
      'INTELLIGENCE_DUPLICATE_DOCUMENT',
      `Documentation of type '${documentType}' already exists for this repository.`,
      409
    );
  }
}
