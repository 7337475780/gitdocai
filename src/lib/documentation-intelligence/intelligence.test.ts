import { describe, it, expect } from 'vitest';
import { CoverageCalculator } from './coverage-calculator';
import { FreshnessSummaryCalculator } from './freshness-summary';
import { HealthCalculator } from './health-calculator';
import { NextActionEngine } from './next-action-engine';
import { PublishSummaryCalculator } from './publish-summary';
import { QualitySummaryCalculator } from './quality-summary';
import {
  CoverageStatus,
  DocumentationHealthStatus,
  DocumentationPublishState,
  QualityStatus,
} from './intelligence-types';

describe('Documentation Intelligence Engine Tests', () => {
  // -------------------------------------------------------------------------
  // COVERAGE TESTS
  // -------------------------------------------------------------------------
  describe('CoverageCalculator', () => {
    it('1. Calculates recommended documents based on repository analysis', () => {
      const analysisData = {
        projectType: 'backend',
        scripts: [{ name: 'test', command: 'vitest' }],
        tree: { files: [{ path: 'package.json' }, { path: 'src/api/users.ts' }] },
        metadata: { visibility: 'public' },
      };

      const recommended = CoverageCalculator.getRecommendedDocuments(analysisData);
      const types = recommended.map(r => r.documentType);

      expect(types).toContain('README');
      expect(types).toContain('SETUP');
      expect(types).toContain('API');
      expect(types).toContain('CONTRIBUTING');
    });

    it('2. Calculates coverage percentage using ONLY recommended documents in denominator', () => {
      const analysisData = {
        projectType: 'fullstack',
        scripts: [{ name: 'start', command: 'next start' }],
        tree: { files: Array(20).fill({ path: 'src/index.ts' }) },
      };

      // Recommended: README, SETUP, ARCHITECTURE, API (4 total)
      const generatedDocs = [
        { id: '1', metadata: { type: 'README' } },
        { id: '2', metadata: { type: 'SETUP' } },
      ];

      const result = CoverageCalculator.calculate(analysisData, generatedDocs);

      expect(result.recommendedCount).toBe(4);
      expect(result.generatedRecommendedCount).toBe(2);
      expect(result.percentage).toBe(50);
      expect(result.status).toBe(CoverageStatus.PARTIAL);
    });

    it('3. Optional documents do NOT reduce coverage percentage', () => {
      const analysisData = {
        projectType: 'frontend',
        tree: { files: [{ path: 'index.html' }] },
      };

      // Recommended: README only
      const generatedDocs = [{ id: '1', metadata: { type: 'README' } }];
      const result = CoverageCalculator.calculate(analysisData, generatedDocs);

      expect(result.recommendedCount).toBe(1);
      expect(result.percentage).toBe(100);
      expect(result.status).toBe(CoverageStatus.COMPLETE);
    });

    it('4. Returns NONE status when zero docs generated', () => {
      const analysisData = { projectType: 'backend' };
      const result = CoverageCalculator.calculate(analysisData, []);

      expect(result.percentage).toBe(0);
      expect(result.status).toBe(CoverageStatus.NONE);
    });
  });

  // -------------------------------------------------------------------------
  // QUALITY SUMMARY TESTS
  // -------------------------------------------------------------------------
  describe('QualitySummaryCalculator', () => {
    it('5. Does NOT average missing quality scores as zero', () => {
      const docs = [
        { qualityScore: 90 },
        { qualityScore: null },
        { qualityScore: 80 },
      ];

      const result = QualitySummaryCalculator.calculate(docs);

      expect(result.averageScore).toBe(85);
      expect(result.lowestScore).toBe(80);
      expect(result.unknownCount).toBe(1);
      expect(result.status).toBe(QualityStatus.GOOD);

      const excellentDocs = [
        { qualityScore: 95 },
        { qualityScore: null },
        { qualityScore: 90 },
      ];
      const excellentResult = QualitySummaryCalculator.calculate(excellentDocs);
      expect(excellentResult.averageScore).toBe(93);
      expect(excellentResult.status).toBe(QualityStatus.EXCELLENT);
    });

    it('6. Returns UNKNOWN quality when no doc has quality data', () => {
      const docs = [{ qualityScore: null }, { qualityScore: undefined }];
      const result = QualitySummaryCalculator.calculate(docs);

      expect(result.status).toBe(QualityStatus.UNKNOWN);
      expect(result.averageScore).toBeNull();
    });

    it('7. Returns POOR quality when any document score is below 50', () => {
      const docs = [{ qualityScore: 95 }, { qualityScore: 45 }];
      const result = QualitySummaryCalculator.calculate(docs);

      expect(result.status).toBe(QualityStatus.POOR);
      expect(result.lowestScore).toBe(45);
      expect(result.below60Count).toBe(1);
    });
  });

  // -------------------------------------------------------------------------
  // FRESHNESS SUMMARY TESTS
  // -------------------------------------------------------------------------
  describe('FreshnessSummaryCalculator', () => {
    it('8. Summarizes latest scan status correctly', () => {
      const scan = {
        scannedAt: new Date().toISOString(),
        impacts: [
          { documentId: '1', status: 'UP_TO_DATE' },
          { documentId: '2', status: 'REVIEW_RECOMMENDED' },
        ],
      };

      const result = FreshnessSummaryCalculator.calculate(scan, 2);

      expect(result.status).toBe('REVIEW_RECOMMENDED');
      expect(result.upToDateCount).toBe(1);
      expect(result.reviewRecommendedCount).toBe(1);
    });

    it('9. Returns UNKNOWN when scan is missing', () => {
      const result = FreshnessSummaryCalculator.calculate(null, 3);
      expect(result.status).toBe('UNKNOWN');
      expect(result.unknownCount).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // PUBLISHING SUMMARY TESTS
  // -------------------------------------------------------------------------
  describe('PublishSummaryCalculator', () => {
    it('10. Detects NEEDS_REPUBLISHING when doc is updated after last publish', () => {
      const site = {
        publishes: [
          {
            status: 'PUBLISHED',
            deploymentUrl: 'https://docs.example.com',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            completedAt: new Date(Date.now() - 3600000).toISOString(),
          },
        ],
      };

      const docs = [{ updatedAt: new Date() }];

      const result = PublishSummaryCalculator.calculate(site, docs);

      expect(result.status).toBe(DocumentationPublishState.NEEDS_REPUBLISHING);
      expect(result.siteUrl).toBe('https://docs.example.com');
    });

    it('11. Returns NOT_PUBLISHED when no publishes exist', () => {
      const result = PublishSummaryCalculator.calculate(null, []);
      expect(result.status).toBe(DocumentationPublishState.NOT_PUBLISHED);
    });
  });

  // -------------------------------------------------------------------------
  // HEALTH CALCULATOR TESTS
  // -------------------------------------------------------------------------
  describe('HealthCalculator', () => {
    it('12. Returns GETTING_STARTED when no documents exist', () => {
      const coverage: any = { generatedDocuments: [], generatedOptionalDocuments: [], missingDocuments: [] };
      const quality: any = { status: QualityStatus.UNKNOWN, below60Count: 0 };
      const freshness: any = { status: 'UNKNOWN' };

      const health = HealthCalculator.calculate(coverage, quality, freshness);
      expect(health.status).toBe(DocumentationHealthStatus.GETTING_STARTED);
    });

    it('13. Returns HEALTHY when complete, fresh, and good quality (publishing NOT required)', () => {
      const coverage: any = {
        generatedDocuments: [{ id: '1' }],
        generatedOptionalDocuments: [],
        missingDocuments: [],
      };
      const quality: any = { status: QualityStatus.GOOD, below60Count: 0 };
      const freshness: any = { status: 'UP_TO_DATE', outdatedCount: 0, reviewRecommendedCount: 0 };

      const health = HealthCalculator.calculate(coverage, quality, freshness);
      expect(health.status).toBe(DocumentationHealthStatus.HEALTHY);
    });

    it('14. Returns NEEDS_REVIEW when any document is OUTDATED', () => {
      const coverage: any = {
        generatedDocuments: [{ id: '1' }],
        generatedOptionalDocuments: [],
        missingDocuments: [],
      };
      const quality: any = { status: QualityStatus.EXCELLENT, below60Count: 0 };
      const freshness: any = { status: 'OUTDATED', outdatedCount: 1, reviewRecommendedCount: 0 };

      const health = HealthCalculator.calculate(coverage, quality, freshness);
      expect(health.status).toBe(DocumentationHealthStatus.NEEDS_REVIEW);
    });

    it('15. Returns NEEDS_ATTENTION when recommended docs are missing', () => {
      const coverage: any = {
        generatedDocuments: [{ id: '1' }],
        generatedOptionalDocuments: [],
        missingDocuments: [{ documentType: 'SETUP' }],
      };
      const quality: any = { status: QualityStatus.GOOD, below60Count: 0 };
      const freshness: any = { status: 'UP_TO_DATE', outdatedCount: 0, reviewRecommendedCount: 0 };

      const health = HealthCalculator.calculate(coverage, quality, freshness);
      expect(health.status).toBe(DocumentationHealthStatus.NEEDS_ATTENTION);
    });
  });

  // -------------------------------------------------------------------------
  // NEXT-ACTION ENGINE TESTS
  // -------------------------------------------------------------------------
  describe('NextActionEngine', () => {
    it('16. Prioritizes GENERATE_DOCUMENTATION when zero docs exist', () => {
      const coverage: any = { missingDocuments: [] };
      const quality: any = { below60Count: 0 };
      const freshness: any = { status: 'UNKNOWN', lastScannedAt: null };
      const publishing: any = { status: DocumentationPublishState.NOT_PUBLISHED };

      const nextAction = NextActionEngine.calculate('analysis-1', coverage, quality, freshness, publishing, []);

      expect(nextAction.type).toBe('GENERATE_DOCUMENTATION');
      expect(nextAction.priority).toBe(1);
      expect(nextAction.reasons.length).toBeGreaterThan(0);
    });

    it('17. Returns ONLY ONE primary action with explanation', () => {
      const coverage: any = { missingDocuments: [{ documentType: 'SETUP', reason: 'Needs setup' }] };
      const quality: any = { below60Count: 0 };
      const freshness: any = { status: 'UP_TO_DATE', lastScannedAt: new Date().toISOString() };
      const publishing: any = { status: DocumentationPublishState.NOT_PUBLISHED };
      const docs = [{ id: 'doc-1', metadata: { type: 'README' } }];

      const nextAction = NextActionEngine.calculate('analysis-1', coverage, quality, freshness, publishing, docs);

      expect(nextAction.type).toBe('GENERATE_RECOMMENDED_DOCUMENTATION');
      expect(nextAction.priority).toBe(2);
      expect(nextAction.title).toContain('SETUP');
    });

    it('18. Suggests OPEN_STUDIO when everything is healthy', () => {
      const coverage: any = { missingDocuments: [] };
      const quality: any = { below60Count: 0 };
      const freshness: any = { status: 'UP_TO_DATE', lastScannedAt: new Date().toISOString(), outdatedCount: 0, reviewRecommendedCount: 0 };
      const publishing: any = { status: DocumentationPublishState.PUBLISHED };
      const docs = [{ id: 'doc-1', metadata: { type: 'README' } }];

      const nextAction = NextActionEngine.calculate('analysis-1', coverage, quality, freshness, publishing, docs);

      expect(nextAction.type).toBe('OPEN_STUDIO');
      expect(nextAction.priority).toBe(8);
    });
  });
});
