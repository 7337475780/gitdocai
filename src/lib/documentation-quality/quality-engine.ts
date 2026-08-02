import { RepositoryAnalysisResult } from '@/types';
import { DocumentationQualityResult, DocumentationQualityIssue, DocumentationQualityStrength } from './quality-types';
import { MarkdownAnalyzer } from './markdown-analyzer';
import { RepositoryCoverage } from './repository-coverage';
import { ScoreCalculator } from './score-calculator';
import { QUALITY_RULES } from './quality-rules';

export class QualityEngine {
  static evaluate(markdown: string, analysis: RepositoryAnalysisResult): DocumentationQualityResult {
    // 1. Run markdown analysis
    const analyzed = MarkdownAnalyzer.analyze(markdown);

    // 2. Run repository-coverage checks
    const coverageIssues = RepositoryCoverage.analyze(analyzed, analysis);

    // 3. Compile structural and markdown quality issues
    const structuralIssues: DocumentationQualityIssue[] = [];

    // DOC001: Missing title
    if (!analyzed.hasH1) {
      structuralIssues.push({
        ...QUALITY_RULES.DOC001,
        evidence: 'No Level 1 heading (# Title) found.',
      });
    }

    // DOC002: Project purpose unclear
    const firstSection = analyzed.headings[0];
    const introWordCount = firstSection ? firstSection.content.split(/\s+/).filter(Boolean).length : 0;
    if (analyzed.headings.length === 0 || (analyzed.headings.length > 0 && introWordCount < 15)) {
      structuralIssues.push({
        ...QUALITY_RULES.DOC002,
        evidence: `Introduction has ${introWordCount} words.`,
      });
    }

    // DOC011: Duplicate headings
    if (analyzed.duplicateHeadings.length > 0) {
      structuralIssues.push({
        ...QUALITY_RULES.DOC011,
        evidence: `Duplicates: ${analyzed.duplicateHeadings.join(', ')}`,
      });
    }

    // DOC012: Inconsistent hierarchy
    if (analyzed.headingJumps.length > 0) {
      const jumpsStr = analyzed.headingJumps.map(j => `H${j.from}->H${j.to} on "${j.heading}"`).join(', ');
      structuralIssues.push({
        ...QUALITY_RULES.DOC012,
        evidence: `Hierarchy jumps: ${jumpsStr}`,
      });
    }

    // DOC013: Empty sections
    if (analyzed.emptySections.length > 0) {
      structuralIssues.push({
        ...QUALITY_RULES.DOC013,
        evidence: `Empty headings: ${analyzed.emptySections.join(', ')}`,
      });
    }

    // DOC014: Placeholders
    if (analyzed.placeholders.length > 0) {
      const count = analyzed.placeholders.length;
      const samples = analyzed.placeholders.slice(0, 3).map(p => `Line ${p.line}: "${p.evidence}"`).join('; ');
      structuralIssues.push({
        ...QUALITY_RULES.DOC014,
        evidence: `${count} placeholders detected (${samples})`,
      });
    }

    // DOC015: README too short for complexity
    const fileCount = analysis.tree?.files?.length || 0;
    if (analyzed.wordCount < 120 && fileCount > 8) {
      structuralIssues.push({
        ...QUALITY_RULES.DOC015,
        evidence: `${analyzed.wordCount} words for a repository with ${fileCount} files.`,
      });
    }

    // Combine all issues
    const allIssues = [...structuralIssues, ...coverageIssues];

    // Sort issues by priority (critical, then important, then suggestion)
    const severityOrder = { critical: 0, important: 1, suggestion: 2 };
    allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // 4. Calculate scores
    const { overallScore, categories } = ScoreCalculator.calculate(allIssues);

    // 5. Compile strengths
    const strengths: DocumentationQualityStrength[] = [];
    
    if (analyzed.hasH1 && introWordCount >= 15) {
      strengths.push({
        title: 'Clear project overview',
        description: 'The documentation starts with a clear title and introduction explaining its purpose.',
      });
    }

    const hasInstallation = !allIssues.some(i => i.id === 'DOC003' || i.id === 'DOC004');
    if (hasInstallation && analyzed.headings.some(h => ['install', 'setup'].some(k => h.title.toLowerCase().includes(k)))) {
      strengths.push({
        title: 'Documented setup details',
        description: 'Contains clear installation commands or local development prerequisites.',
      });
    }

    if (analyzed.codeBlocks.length > 0 && !allIssues.some(i => i.id === 'DOC005')) {
      strengths.push({
        title: 'Practical code examples',
        description: 'Includes rich, syntactically styled code blocks showcasing how to configure or run the project.',
      });
    }

    if (analyzed.headingJumps.length === 0 && analyzed.duplicateHeadings.length === 0) {
      strengths.push({
        title: 'Logical document structure',
        description: 'The layout of headings flows consistently without gaps or duplicate titles.',
      });
    }

    if (analyzed.placeholders.length === 0) {
      strengths.push({
        title: 'Production-ready content',
        description: 'No unresolved placeholders or template strings (TODO, Lorem Ipsum) were detected.',
      });
    }

    // 6. Generate summary text
    let summary = 'The documentation is basic or missing key details. We recommend using our AI actions to fill in the missing segments.';
    if (overallScore >= 90) {
      summary = 'The documentation is clear and well structured, contextually aligned with your repository signals.';
    } else if (overallScore >= 75) {
      summary = 'The documentation is good and covers most essential sections, but a few areas could be enhanced for better developer clarity.';
    } else if (overallScore >= 60) {
      summary = 'The documentation is decent but needs improvement in core areas like setup instructions or structure to be fully useful.';
    }

    return {
      overallScore,
      categories,
      issues: allIssues,
      strengths,
      summary,
      evaluatedAt: new Date().toISOString(),
    };
  }
}
