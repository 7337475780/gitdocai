import { RepositoryChange, AffectedSection, DocumentationFreshnessStatus } from './freshness-types';
import { DOCUMENT_IMPACT_RULES } from './impact-rules';

export interface DocumentSectionInfo {
  id?: string;
  heading: string;
  content?: string;
}

export const sectionMatcher = {
  parseMarkdownSections(markdown: string): DocumentSectionInfo[] {
    const sections: DocumentSectionInfo[] = [];
    const lines = markdown.split('\n');

    let currentHeading = '';
    let currentContent: string[] = [];

    for (const line of lines) {
      const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
      if (headingMatch) {
        if (currentHeading) {
          sections.push({
            id: currentHeading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
            heading: currentHeading,
            content: currentContent.join('\n'),
          });
        }
        currentHeading = headingMatch[1].trim();
        currentContent = [];
      } else if (currentHeading) {
        currentContent.push(line);
      }
    }

    if (currentHeading) {
      sections.push({
        id: currentHeading.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        heading: currentHeading,
        content: currentContent.join('\n'),
      });
    }

    return sections;
  },

  matchSections(
    documentType: string,
    sections: DocumentSectionInfo[],
    changes: RepositoryChange[]
  ): AffectedSection[] {
    const rule = DOCUMENT_IMPACT_RULES[documentType.toUpperCase()] || DOCUMENT_IMPACT_RULES.README;
    const affectedMap = new Map<string, AffectedSection>();

    for (const change of changes) {
      if (!rule.relevantChangeTypes.includes(change.type)) {
        continue;
      }

      for (const sec of sections) {
        const lowerHeading = sec.heading.toLowerCase();
        const lowerContent = (sec.content || '').toLowerCase();

        let isMatch = false;
        let matchReason = change.summary;

        // Check heading keywords for match
        for (const keywords of Object.values(rule.headingKeywords)) {
          if (keywords.some(kw => lowerHeading.includes(kw))) {
            isMatch = true;
            break;
          }
        }

        // Direct reference check (path or script or env variable in section content)
        if (change.path && lowerContent.includes(change.path.toLowerCase())) {
          isMatch = true;
          matchReason = `Direct reference to ${change.path} in section "${sec.heading}"`;
        }

        if (change.evidence) {
          const evidenceKey = change.evidence.split(':')[1];
          if (evidenceKey && lowerContent.includes(evidenceKey.toLowerCase())) {
            isMatch = true;
            matchReason = `Section references changed item "${evidenceKey}"`;
          }
        }

        if (isMatch) {
          const status = change.importance === 'CRITICAL' 
            ? DocumentationFreshnessStatus.OUTDATED 
            : DocumentationFreshnessStatus.REVIEW_RECOMMENDED;

          const key = sec.id || sec.heading;
          if (!affectedMap.has(key) || status === DocumentationFreshnessStatus.OUTDATED) {
            affectedMap.set(key, {
              sectionId: sec.id,
              heading: sec.heading,
              status,
              reason: matchReason,
            });
          }
        }
      }
    }

    // Fallback: If changes are relevant to document but no section matched specifically, mark top section or all sections as REVIEW_RECOMMENDED
    if (affectedMap.size === 0 && changes.length > 0 && sections.length > 0) {
      const topSection = sections[0];
      affectedMap.set(topSection.id || topSection.heading, {
        sectionId: topSection.id,
        heading: topSection.heading,
        status: DocumentationFreshnessStatus.REVIEW_RECOMMENDED,
        reason: changes[0].summary,
      });
    }

    return Array.from(affectedMap.values());
  }
};
