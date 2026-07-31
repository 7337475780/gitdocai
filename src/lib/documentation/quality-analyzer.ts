import { DocumentSection } from './section-parser';

export interface QualityResult {
  score: number;
  label: string;
  suggestions: string[];
}

export class QualityAnalyzer {
  /**
   * Prechecks the generated document quality by inspecting the sections.
   */
  static analyze(sections: DocumentSection[]): QualityResult {
    let score = 0;
    const suggestions: string[] = [];

    const hasTitle = sections.some(s => s.level === 1);
    const hasSetup = sections.some(s => s.id.includes('install') || s.id.includes('setup') || s.id.includes('getting-started'));
    const hasTech = sections.some(s => s.id.includes('tech') || s.id.includes('stack') || s.id.includes('built-with'));
    const hasUsage = sections.some(s => s.id.includes('usage') || s.id.includes('script') || s.id.includes('run'));

    if (hasTitle) score += 20;
    else suggestions.push('Missing a primary Title (H1) section.');

    if (hasSetup) score += 30;
    else suggestions.push('Consider adding an Installation or Setup section.');

    if (hasTech) score += 20;
    else suggestions.push('Consider adding a Tech Stack or Built With section.');

    if (hasUsage) score += 20;
    else suggestions.push('Consider adding a Usage or Scripts section.');

    // Just give 10 points for having some content length
    if (sections.length > 3) score += 10;

    let label = 'Needs Improvement';
    if (score >= 90) label = 'Excellent';
    else if (score >= 70) label = 'Good';
    else if (score >= 50) label = 'Fair';

    return {
      score,
      label,
      suggestions,
    };
  }
}
