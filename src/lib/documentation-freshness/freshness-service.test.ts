import { describe, it, expect, vi } from 'vitest';
import { freshnessService } from './freshness-service';
import { DocumentationFreshnessStatus } from './freshness-types';

describe('FreshnessService', () => {
  it('defines the core service methods correctly', () => {
    expect(freshnessService.runFreshnessScan).toBeDefined();
    expect(freshnessService.getFreshnessSummary).toBeDefined();
    expect(freshnessService.getDocumentFreshnessDetail).toBeDefined();
    expect(freshnessService.markDocumentAsReviewed).toBeDefined();
    expect(freshnessService.regenerateAffectedSections).toBeDefined();
    expect(freshnessService.previewFullRegeneration).toBeDefined();
    expect(freshnessService.applyFullRegeneration).toBeDefined();
  });
});
