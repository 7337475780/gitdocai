import { DocumentationQualityIssue, QualityCategory, DocumentationQualityResult } from './quality-types';

export class ScoreCalculator {
  static calculate(issues: DocumentationQualityIssue[]): {
    overallScore: number;
    categories: DocumentationQualityResult['categories'];
  } {
    // 1. Define category weights (max scores)
    const maxClarity = 20;
    const maxSetup = 20;
    const maxUsage = 20;
    const maxCoverage = 15;
    const maxStructure = 15;
    const maxMaintenance = 10;

    // 2. Track deductions
    let clarityDeductions = 0;
    let setupDeductions = 0;
    let usageDeductions = 0;
    let coverageDeductions = 0;
    let structureDeductions = 0;
    let maintenanceDeductions = 0;

    // Avoid double penalizing issues by tracking processed issue IDs
    const processedIds = new Set<string>();

    for (const issue of issues) {
      if (processedIds.has(issue.id)) continue;
      processedIds.add(issue.id);

      // Deduct based on rule severity and definition
      switch (issue.id) {
        // Clarity issues (max 20)
        case 'DOC001': // Missing project title
          clarityDeductions += 20;
          break;
        case 'DOC002': // Project purpose unclear
          clarityDeductions += 10;
          break;

        // Setup issues (max 20)
        case 'DOC003': // Installation instructions missing
          setupDeductions += 20;
          break;
        case 'DOC004': // Prerequisites missing
          setupDeductions += 8;
          break;
        case 'DOC006': // Env configuration undocumented
          setupDeductions += 8;
          break;

        // Usage issues (max 20)
        case 'DOC005': // Usage examples missing
          usageDeductions += 15;
          break;
        case 'DOC007': // Available scripts undocumented
          usageDeductions += 4;
          break;
        case 'DOC008': // Testing instructions missing
          usageDeductions += 4;
          break;
        case 'DOC020': // Code examples missing for library
          usageDeductions += 8;
          break;

        // Repository Coverage (max 15)
        case 'DOC009': // API undocumented
          coverageDeductions += 8;
          break;
        case 'DOC010': // Docker undocumented
          coverageDeductions += 8;
          break;
        case 'DOC016': // Tech stack features undocumented
          coverageDeductions += 8;
          break;

        // Structure & Readability (max 15)
        case 'DOC011': // Duplicate heading
          structureDeductions += 5;
          break;
        case 'DOC012': // Heading hierarchy inconsistent
          structureDeductions += 3;
          break;
        case 'DOC013': // Empty section
          structureDeductions += 8;
          break;
        case 'DOC015': // README too short
          structureDeductions += 8;
          break;

        // Maintenance & Trust (max 10)
        case 'DOC014': // Placeholder content
          maintenanceDeductions += 8;
          break;
        case 'DOC017': // Env variable unexplained
          maintenanceDeductions += 3;
          break;
        case 'DOC018': // Contribution missing
          maintenanceDeductions += 3;
          break;
        case 'DOC019': // License missing
          maintenanceDeductions += 3;
          break;

        default:
          break;
      }
    }

    // Helper to calculate status
    const getStatus = (score: number, maxScore: number): QualityCategory['status'] => {
      const percentage = (score / maxScore) * 100;
      if (percentage >= 90) return 'excellent';
      if (percentage >= 70) return 'good';
      if (percentage >= 50) return 'needs-improvement';
      return 'weak';
    };

    // Calculate actual category scores (capped at >= 0)
    const clarityScore = Math.max(0, maxClarity - clarityDeductions);
    const setupScore = Math.max(0, maxSetup - setupDeductions);
    const usageScore = Math.max(0, maxUsage - usageDeductions);
    const coverageScore = Math.max(0, maxCoverage - coverageDeductions);
    const structureScore = Math.max(0, maxStructure - structureDeductions);
    const maintenanceScore = Math.max(0, maxMaintenance - maintenanceDeductions);

    const clarity: QualityCategory = {
      score: clarityScore,
      maxScore: maxClarity,
      status: getStatus(clarityScore, maxClarity),
    };

    const setup: QualityCategory = {
      score: setupScore,
      maxScore: maxSetup,
      status: getStatus(setupScore, maxSetup),
    };

    const usage: QualityCategory = {
      score: usageScore,
      maxScore: maxUsage,
      status: getStatus(usageScore, maxUsage),
    };

    const repositoryCoverage: QualityCategory = {
      score: coverageScore,
      maxScore: maxCoverage,
      status: getStatus(coverageScore, maxCoverage),
    };

    const structure: QualityCategory = {
      score: structureScore,
      maxScore: maxStructure,
      status: getStatus(structureScore, maxStructure),
    };

    const maintenance: QualityCategory = {
      score: maintenanceScore,
      maxScore: maxMaintenance,
      status: getStatus(maintenanceScore, maxMaintenance),
    };

    const overallScore = Math.round(
      clarityScore + setupScore + usageScore + coverageScore + structureScore + maintenanceScore
    );

    return {
      overallScore: Math.min(100, Math.max(0, overallScore)),
      categories: {
        clarity,
        setup,
        usage,
        repositoryCoverage,
        structure,
        maintenance,
      },
    };
  }
}
