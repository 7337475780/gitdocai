import { AnalyzedMarkdown } from './markdown-analyzer';
import { RepositoryAnalysisResult } from '@/types';
import { DocumentationQualityIssue } from './quality-types';

export class RepositoryCoverage {
  static analyze(analyzed: AnalyzedMarkdown, analysis: RepositoryAnalysisResult): DocumentationQualityIssue[] {
    const issues: DocumentationQualityIssue[] = [];

    // Helper to check if a file exists in the repo tree
    const fileExists = (pattern: string | RegExp) => {
      if (!analysis.tree || !analysis.tree.files) return false;
      return analysis.tree.files.some(f => 
        typeof pattern === 'string' 
          ? f.path.toLowerCase().includes(pattern.toLowerCase())
          : pattern.test(f.path)
      );
    };

    // Helper to check if a heading exists in markdown matching a keyword
    const hasHeadingMatching = (keywords: string[]) => {
      return analyzed.headings.some(h => 
        keywords.some(kw => h.title.toLowerCase().includes(kw))
      );
    };

    // Helper to check if markdown text contains keywords
    const containsText = (keywords: string[]) => {
      const lower = (analyzed.headings.map(h => h.content).join('\n')).toLowerCase();
      return keywords.some(kw => lower.includes(kw));
    };

    // 1. DOC003: Installation instructions are missing
    const hasPackageJson = fileExists('package.json');
    const hasRequirementsTxt = fileExists('requirements.txt');
    const hasCargoToml = fileExists('Cargo.toml');
    const hasGemfile = fileExists('Gemfile');
    const hasPipfile = fileExists('Pipfile');
    const isLibrary = analysis.projectType?.toLowerCase() === 'library';

    const needsSetup = hasPackageJson || hasRequirementsTxt || hasCargoToml || hasGemfile || hasPipfile || isLibrary;
    const hasSetupHeading = hasHeadingMatching(['install', 'setup', 'getting started', 'quick start', 'prerequisite']);

    if (needsSetup && !hasSetupHeading) {
      issues.push({
        id: 'DOC003',
        severity: 'critical',
        category: 'setup',
        title: 'Installation instructions are missing',
        description: 'The repository contains project configuration files but does not document how to install or setup the project.',
        recommendation: 'Add an "Installation" section explaining how to configure local development dependencies.',
        action: 'add-section',
        targetSection: 'Installation',
      });
    }

    // 2. DOC004: Prerequisites are missing
    const hasDocker = fileExists(/dockerfile/i) || fileExists(/docker-compose/i);
    const hasNode = analysis.primaryLanguage?.toLowerCase() === 'typescript' || analysis.primaryLanguage?.toLowerCase() === 'javascript' || hasPackageJson;
    const needsPrereq = hasDocker || hasNode;
    const hasPrereqHeading = hasHeadingMatching(['prereq', 'requirement', 'dependencies']);

    if (needsPrereq && !hasPrereqHeading && !hasSetupHeading) {
      issues.push({
        id: 'DOC004',
        severity: 'important',
        category: 'setup',
        title: 'Prerequisites are missing',
        description: 'System runtimes or configurations are required but not specified in the documentation.',
        recommendation: `List the prerequisites (e.g. ${hasNode ? 'Node.js' : ''} ${hasDocker ? 'Docker' : ''}) required to run the project.`,
        action: 'improve-section',
        targetSection: 'Prerequisites',
      });
    }

    // 3. DOC005: Usage examples are missing
    const hasUsageHeading = hasHeadingMatching(['usage', 'getting started', 'example', 'running', 'start']);
    const hasCodeBlock = analyzed.codeBlocks.length > 0;

    if (!hasUsageHeading && !hasCodeBlock) {
      issues.push({
        id: 'DOC005',
        severity: 'important',
        category: 'usage',
        title: 'Usage examples are missing',
        description: 'There are no documented examples or command blocks explaining how to execute or run the application.',
        recommendation: 'Add a "Usage" section with step-by-step examples or execution scripts.',
        action: 'add-section',
        targetSection: 'Usage',
      });
    }

    // 4. DOC006: Environment configuration is undocumented
    const hasEnvExample = fileExists('.env.example') || fileExists('.env.local.example') || fileExists('.env.template');
    const hasEnvSignals = analysis.signals && analysis.signals.some(s => s.type === 'Environment');
    const hasEnvHeading = hasHeadingMatching(['env', 'config', 'setup', 'variable']);
    
    if ((hasEnvExample || hasEnvSignals) && !hasEnvHeading && !containsText(['.env', 'environment variable'])) {
      issues.push({
        id: 'DOC006',
        severity: 'important',
        category: 'setup',
        title: 'Environment configuration is undocumented',
        description: 'Configuration templates or environment keys exist in the repository but setup is not explained.',
        recommendation: 'Document the environment variables in a "Configuration" section and show how to use .env.example.',
        action: 'add-section',
        targetSection: 'Environment Variables',
      });
    }

    // 5. DOC007: Available scripts are undocumented
    const hasScripts = analysis.scripts && analysis.scripts.length > 0;
    const mentionsScripts = containsText(['npm run', 'yarn', 'pnpm', 'bun run', 'package.json']);

    if (hasScripts && !mentionsScripts && !hasHeadingMatching(['script', 'command', 'tasks'])) {
      issues.push({
        id: 'DOC007',
        severity: 'suggestion',
        category: 'usage',
        title: 'Available scripts are undocumented',
        description: 'Package scripts are declared in package.json but not listed or explained in the README.',
        recommendation: 'Add a "Scripts" table detailing what commands like development, build, and linting do.',
        action: 'improve-section',
        targetSection: 'Available Scripts',
      });
    }

    // 6. DOC008: Testing instructions are missing
    const hasTestScripts = analysis.scripts && analysis.scripts.some(s => s.name.includes('test'));
    const hasTestFiles = fileExists('/test/') || fileExists('/tests/') || fileExists(/__tests__/) || fileExists(/\.test\./) || fileExists(/\.spec\./);
    const mentionsTest = containsText(['test', 'vitest', 'jest', 'playwright', 'cypress']);

    if ((hasTestScripts || hasTestFiles) && !mentionsTest && !hasHeadingMatching(['test', 'spec', 'quality'])) {
      issues.push({
        id: 'DOC008',
        severity: 'suggestion',
        category: 'usage',
        title: 'Testing instructions are missing',
        description: 'A test suite is present in the repository, but there are no instructions on how to run it.',
        recommendation: 'Add a "Testing" section showing how to execute tests (e.g., `npm run test`).',
        action: 'add-section',
        targetSection: 'Testing',
      });
    }

    // 7. DOC009: API usage is undocumented
    const isBackend = analysis.projectType?.toLowerCase() === 'backend' || 
                      analysis.projectType?.toLowerCase() === 'fullstack' || 
                      analysis.framework?.toLowerCase() === 'express' || 
                      analysis.framework?.toLowerCase() === 'hono';
    const hasApiRoutes = fileExists('/api/') || fileExists('routes/');
    const hasApiHeading = hasHeadingMatching(['api', 'endpoint', 'rest', 'route', 'controller']);
    const isApiRequired = (isBackend || hasApiRoutes) && 
                          analysis.projectType?.toLowerCase() !== 'frontend' && 
                          analysis.projectType?.toLowerCase() !== 'portfolio';

    if (isApiRequired && !hasApiHeading && !containsText(['api/', '/api', 'endpoint', 'http request'])) {
      issues.push({
        id: 'DOC009',
        severity: 'important',
        category: 'repository-coverage',
        title: 'API usage is undocumented',
        description: 'API endpoints appear to be exposed in this repository, but they are not documented.',
        recommendation: 'Add an "API Endpoints" section mapping key paths, HTTP methods, parameters, and payloads.',
        action: 'add-section',
        targetSection: 'API Documentation',
      });
    }

    // 8. DOC010: Docker support is undocumented
    const hasDockerFiles = fileExists('Dockerfile') || fileExists('docker-compose.yml') || fileExists('docker-compose.yaml');
    const mentionsDocker = containsText(['docker', 'dockerfile', 'docker-compose']);

    if (hasDockerFiles && !mentionsDocker && !hasHeadingMatching(['docker', 'container'])) {
      issues.push({
        id: 'DOC010',
        severity: 'important',
        category: 'repository-coverage',
        title: 'Docker support is undocumented',
        description: 'Docker files exist in the repository, but instructions for building or running containerized are missing.',
        recommendation: 'Add a "Docker Setup" section explaining how to run the project using Docker commands.',
        action: 'add-section',
        targetSection: 'Docker Integration',
      });
    }

    // 9. DOC016: Important repository features or technologies are not documented
    const techs = analysis.technologies || [];
    const missingTechs = techs
      .filter(t => t.confidence === 'high')
      .map(t => t.name)
      .filter(name => !analyzed.headings.some(h => h.content.toLowerCase().includes(name.toLowerCase())));

    if (missingTechs.length >= 2) {
      issues.push({
        id: 'DOC016',
        severity: 'important',
        category: 'repository-coverage',
        title: 'Important repository feature is not documented',
        description: `Highly confident technologies (${missingTechs.slice(0, 3).join(', ')}) were detected in the repo but are not mentioned.`,
        recommendation: 'List or detail the core tech stack integrations (like databases or state managers) in your README overview.',
        action: 'improve-section',
        targetSection: 'Tech Stack',
      });
    }

    // 10. DOC018: Contribution guidance is missing
    const isPublic = analysis.metadata?.visibility === 'public';
    const hasContribHeading = hasHeadingMatching(['contribut', 'guideline', 'code of conduct']);
    const hasContribFile = fileExists('CONTRIBUTING.md') || fileExists('CONTRIBUTING');

    if (isPublic && !hasContribHeading && !hasContribFile) {
      issues.push({
        id: 'DOC018',
        severity: 'suggestion',
        category: 'maintenance',
        title: 'Contribution guidance is missing',
        description: 'The repository is public, but lacks guidance on how external developers can contribute.',
        recommendation: 'Add a "Contributing" section outlining the workflow for reporting bugs and opening pull requests.',
        action: 'add-section',
        targetSection: 'Contributing',
      });
    }

    // 11. DOC019: License information is missing
    const hasLicenseFile = fileExists('license') || fileExists('licence') || analysis.metadata?.license !== null;
    const hasLicenseHeading = hasHeadingMatching(['license', 'licence']);

    if (!hasLicenseFile && !hasLicenseHeading) {
      issues.push({
        id: 'DOC019',
        severity: 'suggestion',
        category: 'maintenance',
        title: 'License information is missing',
        description: 'No license terms are documented in the README or present in the repository.',
        recommendation: 'Define a "License" section in the README, or create a LICENSE file (e.g. MIT, Apache 2.0).',
        action: 'add-section',
        targetSection: 'License',
      });
    }

    // 12. DOC020: Code examples are missing for libraries
    if (isLibrary && !hasCodeBlock && !containsText(['import ', 'require(', 'usage'])) {
      issues.push({
        id: 'DOC020',
        severity: 'important',
        category: 'usage',
        title: 'Code examples are missing where they would improve usability',
        description: 'The repository is classified as a library, but has no copy-pasteable usage or import examples.',
        recommendation: 'Add a code snippet showing how to install and import the library components in a project.',
        action: 'improve-section',
        targetSection: 'Usage Examples',
      });
    }

    return issues;
  }
}
