import {
  CoverageStatus,
  DocumentationCoverageResult,
  RecommendedDocumentInfo,
} from './intelligence-types';

export class CoverageCalculator {
  /**
   * Determine document recommendations based on repository analysis data.
   */
  static getRecommendedDocuments(analysisData: any): RecommendedDocumentInfo[] {
    const recommended: RecommendedDocumentInfo[] = [];

    // 1. README is ALWAYS recommended
    recommended.push({
      documentType: 'README',
      fileName: 'README.md',
      reason: 'Standard entry-point documentation explaining repository purpose and usage.',
      importance: 'README',
    });

    const projectType = (analysisData?.projectType || '').toLowerCase();
    const files: string[] = analysisData?.tree?.files?.map((f: any) => f.path.toLowerCase()) || [];
    const hasScripts = Array.isArray(analysisData?.scripts) && analysisData.scripts.length > 0;
    const hasPackageJson = files.some(f => f.endsWith('package.json') || f.endsWith('requirements.txt') || f.endsWith('cargo.toml'));
    const hasDocker = files.some(f => f.includes('docker'));

    // 2. SETUP: Recommended if setup requirements exist
    if (hasScripts || hasPackageJson || hasDocker || projectType === 'backend' || projectType === 'fullstack' || projectType === 'library') {
      recommended.push({
        documentType: 'SETUP',
        fileName: 'SETUP.md',
        reason: 'Repository contains environment dependencies, installation scripts, or build configs.',
        importance: 'SETUP',
      });
    }

    // 3. ARCHITECTURE: Recommended for non-trivial / multi-module projects
    const techCount = Array.isArray(analysisData?.technologies) ? analysisData.technologies.length : 0;
    const fileCount = files.length;
    const isComplex = techCount >= 3 || fileCount > 15 || projectType === 'backend' || projectType === 'fullstack' || projectType === 'library';

    if (isComplex) {
      recommended.push({
        documentType: 'ARCHITECTURE',
        fileName: 'ARCHITECTURE.md',
        reason: 'Repository contains multiple core technologies or complex module dependencies.',
        importance: 'ARCHITECTURE',
      });
    }

    // 4. API: Recommended if backend, fullstack, library, or API routes exist
    const hasApiRoutes = files.some(f => f.includes('/api/') || f.includes('routes/') || f.includes('controllers/'));
    const isApiProject = projectType === 'backend' || projectType === 'fullstack' || projectType === 'library' || hasApiRoutes;

    if (isApiProject) {
      recommended.push({
        documentType: 'API',
        fileName: 'API.md',
        reason: 'Repository exposes public APIs, endpoints, software interfaces, or exported modules.',
        importance: 'API',
      });
    }

    // 5. CONTRIBUTING: Recommended if public repo or open-source indicators
    const isPublic = analysisData?.metadata?.visibility === 'public' || analysisData?.metadata?.isPublic;
    if (isPublic || projectType === 'library' || projectType === 'opensource') {
      recommended.push({
        documentType: 'CONTRIBUTING',
        fileName: 'CONTRIBUTING.md',
        reason: 'Repository is public or structured as an open-source library.',
        importance: 'CONTRIBUTING',
      });
    }

    return recommended;
  }

  /**
   * Calculate coverage stats comparing recommended docs vs generated docs.
   */
  static calculate(analysisData: any, generatedDocs: Array<{ id: string; metadata: any }>): DocumentationCoverageResult {
    const recommendedList = this.getRecommendedDocuments(analysisData);
    const recommendedTypes = new Set(recommendedList.map(r => r.documentType.toUpperCase()));

    const ALL_TYPES: Array<RecommendedDocumentInfo['importance']> = ['README', 'SETUP', 'ARCHITECTURE', 'API', 'CONTRIBUTING'];
    const optionalList: RecommendedDocumentInfo[] = ALL_TYPES
      .filter(t => !recommendedTypes.has(t))
      .map(t => ({
        documentType: t,
        fileName: `${t}.md`,
        reason: `${t} documentation is optional for this repository type.`,
        importance: t,
      }));

    // Map generated docs to docTypes
    const generatedDocMap = new Map<string, { id: string; type: string; fileName: string }>();
    for (const doc of generatedDocs) {
      const rawType = (doc.metadata as any)?.type || (doc.metadata as any)?.documentType || 'README';
      const upperType = rawType.toUpperCase();
      generatedDocMap.set(upperType, {
        id: doc.id,
        type: upperType,
        fileName: (doc.metadata as any)?.fileName || `${upperType}.md`,
      });
    }

    const generatedRecommendedDocs: Array<{ id: string; type: string; fileName: string }> = [];
    const missingRecommendedDocs: RecommendedDocumentInfo[] = [];

    for (const rec of recommendedList) {
      const match = generatedDocMap.get(rec.documentType.toUpperCase());
      if (match) {
        generatedRecommendedDocs.push(match);
      } else {
        missingRecommendedDocs.push(rec);
      }
    }

    const generatedOptionalDocs: Array<{ id: string; type: string; fileName: string }> = [];
    for (const opt of optionalList) {
      const match = generatedDocMap.get(opt.documentType.toUpperCase());
      if (match) {
        generatedOptionalDocs.push(match);
      }
    }

    const totalRecommended = recommendedList.length;
    const genRecCount = generatedRecommendedDocs.length;
    const totalGeneratedCount = generatedDocMap.size;

    const percentage = totalRecommended > 0 ? Math.round((genRecCount / totalRecommended) * 100) : 100;

    let status: CoverageStatus;
    if (totalGeneratedCount === 0) {
      status = CoverageStatus.NONE;
    } else if (genRecCount === totalRecommended) {
      status = CoverageStatus.COMPLETE;
    } else if (genRecCount === 1) {
      status = CoverageStatus.MINIMAL;
    } else {
      status = CoverageStatus.PARTIAL;
    }

    return {
      percentage,
      status,
      recommendedCount: totalRecommended,
      generatedRecommendedCount: genRecCount,
      recommendedDocuments: recommendedList,
      generatedDocuments: generatedRecommendedDocs,
      missingDocuments: missingRecommendedDocs,
      optionalDocuments: optionalList,
      generatedOptionalDocuments: generatedOptionalDocs,
    };
  }
}
