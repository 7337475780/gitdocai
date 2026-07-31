import { RepositoryService } from '../github/repository-service';
import { FileReader } from '../github/file-reader';
import { PackageAnalyzer } from './package-analyzer';
import { TechnologyDetector } from './technology-detector';
import { ProjectTypeDetector } from './project-type-detector';
import { Scoring } from './scoring';
import { RepositoryAnalysisResult, ProjectSignal } from '../../types';

export class RepositoryAnalyzer {
  
  static async analyze(owner: string, repo: string): Promise<Omit<RepositoryAnalysisResult, 'analysisId'>> {
    // 1. Fetch GitHub Metadata
    const metadata = await RepositoryService.getMetadata(owner, repo);
    const languages = await RepositoryService.getLanguages(owner, repo);
    const tree = await RepositoryService.getTree(owner, repo, metadata.defaultBranch);
    const filePaths = tree.files.map(f => f.path);

    // 2. Fetch specific files
    const packageJson = await FileReader.getPackageJson(owner, repo, metadata.defaultBranch);

    // 3. Analyze Packages and Tech
    const dependencies = PackageAnalyzer.getDependencies(packageJson);
    const scripts = PackageAnalyzer.getScripts(packageJson);
    const packageManager = PackageAnalyzer.getPackageManager(packageJson, filePaths);
    const technologies = TechnologyDetector.detect(dependencies, filePaths);
    
    // 4. Infer Project Details
    const projectType = ProjectTypeDetector.detect(technologies, filePaths, packageJson);
    const framework = technologies.find(t => t.category === 'Framework')?.name || 'None detected';
    const styling = technologies.find(t => t.category === 'Styling')?.name || 'None detected';

    // 5. Gather Signals
    const signals: ProjectSignal[] = [];
    if (packageManager !== 'unknown') {
      signals.push({ type: 'Package Manager', value: packageManager });
    }
    if (technologies.some(t => t.name === 'TypeScript')) {
      signals.push({ type: 'Language', value: 'TypeScript' });
    } else if (metadata.primaryLanguage) {
      signals.push({ type: 'Language', value: metadata.primaryLanguage });
    }
    if (filePaths.some(f => f.includes('docker'))) {
      signals.push({ type: 'Infrastructure', value: 'Docker' });
    }

    // 6. Score Documentation Readiness
    const readinessDetails = Scoring.calculate(metadata, filePaths, packageJson, packageManager);

    // 7. Assemble Result
    return {
      repositoryName: metadata.name,
      owner: metadata.ownerLogin,
      url: metadata.htmlUrl,
      description: metadata.description || '',
      primaryLanguage: metadata.primaryLanguage || 'Unknown',
      projectType,
      packageManager,
      framework,
      styling,
      mainBranch: metadata.defaultBranch,
      status: metadata.isArchived ? 'Archived' : 'Active',
      technologies,
      signals,
      scripts,
      readinessScore: readinessDetails.score,
      readinessDetails,
      metadata,
      languages,
      tree,
    };
  }
}
