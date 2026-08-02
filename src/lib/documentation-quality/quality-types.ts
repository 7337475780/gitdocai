export type DocumentationQualityResult = {
  overallScore: number;
  categories: {
    clarity: QualityCategory;
    setup: QualityCategory;
    usage: QualityCategory;
    repositoryCoverage: QualityCategory;
    structure: QualityCategory;
    maintenance: QualityCategory;
  };
  issues: DocumentationQualityIssue[];
  strengths: DocumentationQualityStrength[];
  summary: string;
  evaluatedAt: string;
};

export type QualityCategory = {
  score: number;
  maxScore: number;
  status: 'excellent' | 'good' | 'needs-improvement' | 'weak';
};

export type DocumentationQualityIssue = {
  id: string;
  severity: 'critical' | 'important' | 'suggestion';
  category:
    | 'clarity'
    | 'setup'
    | 'usage'
    | 'repository-coverage'
    | 'structure'
    | 'maintenance';
  title: string;
  description: string;
  evidence?: string;
  recommendation: string;
  action: 'add-section' | 'improve-section' | 'fix-structure' | 'review-manually';
  targetSection?: string;
};

export type DocumentationQualityStrength = {
  title: string;
  description: string;
};
