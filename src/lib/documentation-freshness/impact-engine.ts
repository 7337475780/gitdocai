import {
  RepositoryChange,
  DocumentImpactResult,
  DocumentationFreshnessStatus,
  DeterministicEvidence,
  ImpactScoreFactors,
} from './freshness-types';
import { DOCUMENT_IMPACT_RULES } from './impact-rules';
import { sectionMatcher, DocumentSectionInfo } from './section-matcher';

export const impactEngine = {
  evaluateImpact(
    documentId: string,
    documentType: string, // 'README' | 'SETUP' | 'ARCHITECTURE' | 'API' | 'CONTRIBUTING'
    fileName: string,
    markdown: string,
    sectionsInput: DocumentSectionInfo[] | any,
    changes: RepositoryChange[]
  ): DocumentImpactResult {
    const docTypeUpper = documentType.toUpperCase();
    const rule = DOCUMENT_IMPACT_RULES[docTypeUpper] || DOCUMENT_IMPACT_RULES.README;

    // Filter relevant changes for this document type
    const relevantChanges = changes.filter(c => rule.relevantChangeTypes.includes(c.type));

    // Parse sections if needed
    let sections: DocumentSectionInfo[] = [];
    if (Array.isArray(sectionsInput) && sectionsInput.length > 0) {
      sections = sectionsInput.map((s: any) => ({
        id: s.id || s.slug,
        heading: s.title || s.heading || s.name || '',
        content: s.content || '',
      }));
    } else if (markdown) {
      sections = sectionMatcher.parseMarkdownSections(markdown);
    }

    // Match affected sections
    const affectedSections = sectionMatcher.matchSections(docTypeUpper, sections, relevantChanges);

    // Look for deterministic invalidation evidence
    let deterministicEvidence: DeterministicEvidence | null = null;
    const markdownLower = markdown.toLowerCase();

    for (const change of relevantChanges) {
      if (change.evidence) {
        if (change.evidence.startsWith('removed_script:')) {
          const scriptName = change.evidence.replace('removed_script:', '');
          if (markdownLower.includes(scriptName.toLowerCase()) || markdownLower.includes(`npm run ${scriptName.toLowerCase()}`)) {
            deterministicEvidence = {
              type: 'REMOVED_SCRIPT',
              item: scriptName,
              details: `Documentation references script "${scriptName}" which was removed from package.json`,
            };
            break;
          }
        } else if (change.evidence.startsWith('removed_api_endpoint:')) {
          const endpoint = change.evidence.replace('removed_api_endpoint:', '');
          if (markdownLower.includes(endpoint.toLowerCase())) {
            deterministicEvidence = {
              type: 'REMOVED_API_ENDPOINT',
              item: endpoint,
              details: `Documentation references API endpoint "${endpoint}" which no longer exists`,
            };
            break;
          }
        } else if (change.evidence.startsWith('removed_env_var:')) {
          const envVar = change.evidence.replace('removed_env_var:', '');
          if (markdownLower.includes(envVar.toLowerCase())) {
            deterministicEvidence = {
              type: 'REMOVED_ENV_VAR',
              item: envVar,
              details: `Documentation references environment variable "${envVar}" which was removed from repository configuration`,
            };
            break;
          }
        } else if (change.evidence.startsWith('removed_package:')) {
          const pkg = change.evidence.replace('removed_package:', '');
          if (markdownLower.includes(pkg.toLowerCase())) {
            deterministicEvidence = {
              type: 'REMOVED_PACKAGE',
              item: pkg,
              details: `Documentation references package "${pkg}" which was removed from dependencies`,
            };
            break;
          }
        }
      }
    }

    // Calculate score factors
    let importanceWeight = 0;
    let totalConfidence = 0;

    for (const c of relevantChanges) {
      totalConfidence += c.confidence || 80;
      if (c.importance === 'CRITICAL') importanceWeight += 40;
      else if (c.importance === 'HIGH') importanceWeight += 25;
      else if (c.importance === 'MEDIUM') importanceWeight += 15;
      else importanceWeight += 5;
    }

    const confidenceAvg = relevantChanges.length > 0 ? Math.round(totalConfidence / relevantChanges.length) : 100;
    const hasDeterministic = !!deterministicEvidence;

    // Compute raw impact score (0 to 100)
    let impactScore = 0;
    if (relevantChanges.length > 0) {
      const baseScore = Math.min(65, importanceWeight);
      const sectionBonus = Math.min(20, affectedSections.length * 7);
      const deterministicBonus = hasDeterministic ? 25 : 0;

      impactScore = Math.min(100, Math.max(10, baseScore + sectionBonus + deterministicBonus));
    }

    // Determine status
    let status: DocumentationFreshnessStatus = DocumentationFreshnessStatus.UP_TO_DATE;

    if (hasDeterministic) {
      status = DocumentationFreshnessStatus.OUTDATED;
    } else if (relevantChanges.length === 0) {
      status = DocumentationFreshnessStatus.UP_TO_DATE;
    } else if (impactScore >= 40 || affectedSections.length > 0) {
      status = DocumentationFreshnessStatus.REVIEW_RECOMMENDED;
    } else {
      status = DocumentationFreshnessStatus.CHANGES_DETECTED;
    }

    // Generate explainable summary
    let summary = 'No relevant repository changes detected since last review.';
    if (status === DocumentationFreshnessStatus.OUTDATED && deterministicEvidence) {
      summary = deterministicEvidence.details;
    } else if (status === DocumentationFreshnessStatus.REVIEW_RECOMMENDED) {
      summary = `Repository changes in ${relevantChanges.map(c => c.path).slice(0, 3).join(', ')} may affect ${affectedSections.length} section(s).`;
    } else if (status === DocumentationFreshnessStatus.CHANGES_DETECTED) {
      summary = `${relevantChanges.length} repository change(s) detected with low documentation impact.`;
    }

    const scoreFactors: ImpactScoreFactors = {
      changeImportanceWeight: importanceWeight,
      relevantChangesCount: relevantChanges.length,
      confidenceAverage: confidenceAvg,
      affectedSectionsCount: affectedSections.length,
      hasDeterministicEvidence: hasDeterministic,
    };

    return {
      documentId,
      documentType,
      fileName,
      status,
      impactScore,
      confidence: confidenceAvg,
      summary,
      reasons: relevantChanges,
      affectedSections,
      deterministicEvidence,
      scoreFactors,
    };
  }
};
