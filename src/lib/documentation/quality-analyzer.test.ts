import { describe, it, expect } from 'vitest';
import { QualityAnalyzer } from './quality-analyzer';
import { DocumentSection } from './section-parser';

describe('QualityAnalyzer', () => {
  it('should score high for complete documentation', () => {
    const sections: DocumentSection[] = [
      { id: 'title', title: 'Title', level: 1, content: '# Title', startLine: 0, endLine: 0 },
      { id: 'installation', title: 'Installation', level: 2, content: '...', startLine: 0, endLine: 0 },
      { id: 'tech-stack', title: 'Tech Stack', level: 2, content: '...', startLine: 0, endLine: 0 },
      { id: 'usage', title: 'Usage', level: 2, content: '...', startLine: 0, endLine: 0 }
    ];

    const result = QualityAnalyzer.analyze(sections);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.label).toBe('Excellent');
    expect(result.suggestions.length).toBe(0);
  });

  it('should suggest improvements for missing sections', () => {
    const sections: DocumentSection[] = [
      { id: 'title', title: 'Title', level: 1, content: '# Title', startLine: 0, endLine: 0 },
    ];

    const result = QualityAnalyzer.analyze(sections);
    expect(result.score).toBe(20);
    expect(result.label).toBe('Needs Improvement');
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions[0]).toContain('Installation');
  });
});
