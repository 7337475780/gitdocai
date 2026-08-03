import {
  DocumentationCoverageResult,
  DocumentationHealthStatus,
  DocumentationHealthSummary,
  FreshnessSummaryResult,
  QualitySummaryResult,
} from './intelligence-types';

export class HealthCalculator {
  static calculate(
    coverage: DocumentationCoverageResult,
    quality: QualitySummaryResult,
    freshness: FreshnessSummaryResult
  ): DocumentationHealthSummary {
    const totalDocs = coverage.generatedDocuments.length + coverage.generatedOptionalDocuments.length;

    let status: DocumentationHealthStatus;
    let label: string;
    let summary: string;

    // 1. GETTING_STARTED: No documentation exists yet
    if (totalDocs === 0) {
      status = DocumentationHealthStatus.GETTING_STARTED;
      label = 'Getting Started';
      summary = 'No generated documentation exists for this repository yet.';
    }
    // 2. NEEDS_REVIEW: One or more documents are outdated or need review
    else if (freshness.status === 'OUTDATED' || freshness.status === 'REVIEW_RECOMMENDED') {
      status = DocumentationHealthStatus.NEEDS_REVIEW;
      label = 'Needs Review';
      const affectedCount = freshness.outdatedCount + freshness.reviewRecommendedCount;
      summary = `${affectedCount} document${affectedCount === 1 ? '' : 's'} may be affected by recent repository changes.`;
    }
    // 3. NEEDS_ATTENTION: Recommended documents are missing OR an important document has low quality (<60)
    else if (coverage.missingDocuments.length > 0 || quality.below60Count > 0) {
      status = DocumentationHealthStatus.NEEDS_ATTENTION;
      label = 'Needs Attention';
      if (coverage.missingDocuments.length > 0 && quality.below60Count > 0) {
        summary = `${coverage.missingDocuments.length} recommended document(s) missing and ${quality.below60Count} document(s) have low quality.`;
      } else if (coverage.missingDocuments.length > 0) {
        summary = `${coverage.missingDocuments.length} recommended document(s) are missing.`;
      } else {
        summary = `${quality.below60Count} document(s) are below the recommended quality score.`;
      }
    }
    // 4. UNKNOWN: Freshness has never been checked and no issues found
    else if (freshness.status === 'UNKNOWN' && quality.status === 'UNKNOWN') {
      status = DocumentationHealthStatus.UNKNOWN;
      label = 'Unknown State';
      summary = 'Documentation freshness and quality have not been evaluated.';
    }
    // 5. HEALTHY: Everything in order
    else {
      status = DocumentationHealthStatus.HEALTHY;
      label = 'Healthy';
      summary = 'Documentation coverage is complete, quality is strong, and documents are up to date.';
    }

    return {
      status,
      label,
      summary,
      calculatedAt: new Date().toISOString(),
    };
  }
}
