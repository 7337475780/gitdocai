import { describe, it, expect } from 'vitest';
import { freshnessService } from './freshness-service';

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
