import {
  DocumentationCoverageResult,
  DocumentationNextAction,
  DocumentationPublishState,
  FreshnessSummaryResult,
  PublishingSummaryResult,
  QualitySummaryResult,
} from './intelligence-types';

export class NextActionEngine {
  static calculate(
    analysisId: string,
    coverage: DocumentationCoverageResult,
    quality: QualitySummaryResult,
    freshness: FreshnessSummaryResult,
    publishing: PublishingSummaryResult,
    documents: Array<{ id: string; metadata: any; qualityScore?: number | null }>
  ): DocumentationNextAction {
    const totalDocs = documents.length;
    const firstDocId = documents[0]?.id;

    // Priority 1: No documentation exists
    if (totalDocs === 0) {
      return {
        type: 'GENERATE_DOCUMENTATION',
        title: 'Generate Initial Documentation',
        description: 'No documentation exists yet. Start by generating a comprehensive README for your repository.',
        href: `/analyze?analysisId=${analysisId}`,
        priority: 1,
        reasons: ['No documentation files have been generated for this repository.'],
      };
    }

    // Priority 2: Recommended documentation is missing
    if (coverage.missingDocuments.length > 0) {
      const nextMissing = coverage.missingDocuments[0];
      return {
        type: 'GENERATE_RECOMMENDED_DOCUMENTATION',
        title: `Generate Recommended ${nextMissing.documentType} Documentation`,
        description: `${nextMissing.reason} Generate ${nextMissing.fileName} to complete your documentation coverage.`,
        href: `#generate-recommended`,
        documentType: nextMissing.documentType,
        priority: 2,
        reasons: [
          `Recommended document '${nextMissing.documentType}' is missing.`,
          `Coverage is currently at ${coverage.percentage}%.`,
        ],
      };
    }

    // Priority 3: A document is potentially outdated or review recommended
    if (freshness.outdatedCount > 0 || freshness.reviewRecommendedCount > 0) {
      const targetDoc = documents.find(d => {
        const type = ((d.metadata as any)?.type || '').toUpperCase();
        return type === 'API' || type === 'README' || type === 'SETUP';
      }) || documents[0];

      return {
        type: 'REVIEW_FRESHNESS',
        title: `Review Outdated Documentation`,
        description: `Repository changes may affect ${freshness.outdatedCount + freshness.reviewRecommendedCount} section(s) across your documentation.`,
        href: `/studio/${targetDoc.id}?tab=freshness`,
        documentId: targetDoc.id,
        documentType: (targetDoc.metadata as any)?.type || 'README',
        priority: 3,
        reasons: [
          freshness.outdatedCount > 0 ? `${freshness.outdatedCount} document(s) are potentially outdated.` : '',
          freshness.reviewRecommendedCount > 0 ? `${freshness.reviewRecommendedCount} document(s) require review after code changes.` : '',
        ].filter(Boolean),
      };
    }

    // Priority 4: Freshness has never been checked after documentation generation
    if (freshness.status === 'UNKNOWN' || freshness.lastScannedAt === null) {
      return {
        type: 'RUN_FRESHNESS_SCAN',
        title: 'Run Freshness Scan',
        description: 'Verify whether recent repository commits or code changes have affected your documentation accuracy.',
        href: `#run-freshness-scan`,
        priority: 4,
        reasons: ['Documentation freshness has not been scanned yet for the current codebase state.'],
      };
    }

    // Priority 5: An important document has poor quality (<60)
    if (quality.below60Count > 0) {
      const lowQualityDoc = documents.find(d => (d.qualityScore || 0) < 60) || documents[0];
      const docType = (lowQualityDoc.metadata as any)?.type || 'README';
      return {
        type: 'IMPROVE_QUALITY',
        title: `Improve ${docType} Quality`,
        description: `The quality score for ${docType} is ${lowQualityDoc.qualityScore || 0}/100. Resolve structural and coverage warnings.`,
        href: `/studio/${lowQualityDoc.id}?tab=quality`,
        documentId: lowQualityDoc.id,
        documentType: docType,
        priority: 5,
        reasons: [`${docType} quality score (${lowQualityDoc.qualityScore || 0}) is below recommended threshold of 60.`],
      };
    }

    // Priority 6: Documentation updated after latest publish
    if (publishing.status === DocumentationPublishState.NEEDS_REPUBLISHING) {
      return {
        type: 'REPUBLISH_SITE',
        title: 'Republish Documentation Site',
        description: 'Documentation changes have been saved since your last deployment. Republish to update your live site.',
        href: `#publish-site`,
        priority: 6,
        reasons: ['Current documentation content differs from the live published site.'],
      };
    }

    // Priority 7: Documentation site has never been published
    if (publishing.status === DocumentationPublishState.NOT_PUBLISHED) {
      return {
        type: 'PREVIEW_SITE',
        title: 'Preview Documentation Site',
        description: 'Your repository documentation is in great shape. Preview and publish as a static documentation portal.',
        href: `/studio/${firstDocId}?action=preview-site`,
        documentId: firstDocId,
        priority: 7,
        reasons: ['Documentation is complete and healthy, ready to be published.'],
      };
    }

    // Priority 8: Everything is healthy
    return {
      type: 'OPEN_STUDIO',
      title: 'Open Documentation Studio',
      description: 'Your repository documentation is fully covered, high quality, and up to date. Open studio to edit or export.',
      href: `/studio/${firstDocId}`,
      documentId: firstDocId,
      priority: 8,
      reasons: ['All documentation health metrics are in optimal state.'],
    };
  }
}
