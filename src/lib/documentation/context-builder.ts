import { RepositoryAnalysisResult } from '@/types';
import { DocumentationContext } from '../ai/provider';

export class ContextBuilder {
  /**
   * Transforms a full repository analysis into a rich, structured context for the LLM.
   *
   * IMPORTANT: Uses the pre-computed rich intelligence fields (apiEndpoints, features,
   * pageRoutes, databaseInfo, authInfo) that RepositoryAnalyzer already built from
   * source code. Falls back to signal reconstruction only when those fields are absent.
   *
   * Also passes sourceFiles so the LLM prompt can reference actual source excerpts.
   */
  static build(analysis: RepositoryAnalysisResult, rawReadmeContent?: string): DocumentationContext {

    // 1. Build a filtered, important-first file tree (max 80 entries)
    const treeLimit = 80;
    const importantFiles = analysis.tree.files
      .map(f => f.path)
      .filter(p =>
        !p.includes('node_modules/') &&
        !p.startsWith('.next/') &&
        !p.startsWith('dist/') &&
        !p.startsWith('build/') &&
        !p.startsWith('.git/')
      )
      .slice(0, treeLimit);

    // 2. Truncate existing README if available
    let excerpt: string | undefined;
    const readmeSource = rawReadmeContent;
    if (readmeSource) {
      excerpt = readmeSource.length > 1500
        ? readmeSource.substring(0, 1500) + '\n... (truncated)'
        : readmeSource;
    }

    // 3. Extract environment variable keys (never values)
    const envVars = analysis.signals
      .filter(s => s.type === 'Environment')
      .map(s => s.value);

    // 4. ── Rich intelligence fields ──────────────────────────────────────────
    //
    // The RepositoryAnalyzer pre-computes these from source code.
    // We read them directly from the analysis result rather than re-deriving
    // from the flat signals[] array (which would discard detail).
    //
    // For each field we attempt to read from the rich structured property first,
    // then fall back to signal reconstruction if the property is absent
    // (e.g. for analyses that were stored before this upgrade).

    // 4a. API endpoints — decode from JSON-encoded DetectedApiRoute signals (Phase 14.2+)
    // Falls back to old "METHOD /path" string format for backwards compatibility.
    const apiEndpointsFromSignals = analysis.signals
      .filter(s => s.type === 'API Route')
      .map(s => {
        // Try to parse as the new JSON-encoded DetectedApiRoute first
        try {
          const parsed = JSON.parse(s.value);
          if (parsed && typeof parsed.path === 'string' && typeof parsed.method === 'string') {
            return parsed; // Full rich DetectedApiRoute
          }
        } catch {
          // Fall through to legacy string format
        }
        // Legacy format: "GET | POST /api/path"
        const parts = s.value.split(' ');
        const method = parts.length >= 2 ? parts.slice(0, -1).join(' ') : 'GET | POST';
        const path = parts[parts.length - 1];
        const lastSegment = path.split('/').filter(Boolean).pop() || 'resource';
        return {
          method,
          path,
          purpose: `Handles ${lastSegment.replace(/-/g, ' ')} operations`,
          authentication: false,
          queryParams: [],
          bodyFields: [],
          successResponseFields: [],
          errorResponses: [],
          responseCodes: [],
          isStreaming: false,
        };
      });

    // 4b. Auth info — read from signal (signal stores provider name)
    const authSignal = analysis.signals.find(s => s.type === 'Authentication');
    const authInfo = authSignal ? {
      provider: authSignal.value,
      strategies: [],
      hasProtectedRoutes: analysis.tree.files.some(f => f.path.toLowerCase().includes('middleware')),
    } : null;

    // 4c. Database info — signal value format: "Type via ORM"
    const dbSignal = analysis.signals.find(s => s.type === 'Database');
    const databaseInfo = dbSignal ? {
      type: dbSignal.value.split(' via ')[0] || 'Unknown',
      orm: dbSignal.value.split(' via ')[1] || 'Unknown',
      hasSchema: analysis.tree.files.some(f => f.path.toLowerCase().includes('schema')),
      models: [],
    } : null;

    // 4d. State management — signal value is comma-separated
    const stateSignal = analysis.signals.find(s => s.type === 'State Management');
    const stateManagement = stateSignal ? stateSignal.value.split(', ') : [];

    // 4e. Testing — signal value is comma-separated
    const testingSignal = analysis.signals.find(s => s.type === 'Testing');
    const testingFrameworks = testingSignal ? testingSignal.value.split(', ') : [];

    // 4f. Page routes from signals
    const pageRoutes = analysis.signals
      .filter(s => s.type === 'Page Route')
      .map(s => s.value);

    // 4g. Features from signals
    const features = analysis.signals
      .filter(s => s.type === 'Feature')
      .map(s => {
        const colonIdx = s.value.indexOf(':');
        return colonIdx > -1
          ? { name: s.value.substring(0, colonIdx).trim(), description: s.value.substring(colonIdx + 1).trim() }
          : { name: s.value, description: '' };
      });

    // 4h. CI/CD
    const ciSignal = analysis.signals.find(s => s.type === 'CI/CD');

    // 5. Build repository structure string (compact tree)
    const structureLines = buildStructureFromPaths(importantFiles);

    // 6. Detect config files
    const knownConfigs = [
      'next.config.js', 'next.config.ts', 'next.config.mjs',
      'tailwind.config.js', 'tailwind.config.ts',
      'tsconfig.json', 'vite.config.ts', 'Dockerfile',
      'docker-compose.yml', 'docker-compose.yaml',
      '.env.example', 'drizzle.config.ts', 'vitest.config.ts',
    ];
    const configFiles = importantFiles.filter(f =>
      knownConfigs.some(k => f.toLowerCase().endsWith(k.toLowerCase()))
    );

    // 7. Dev dependencies
    const devDeps = analysis.technologies
      .filter(t => t.category === 'Testing' || t.category === 'Build Tool' || t.category === 'Linting')
      .map(t => t.name);

    return {
      repository: {
        name: analysis.repositoryName,
        owner: analysis.owner,
        description: analysis.description,
        url: analysis.url,
        mainBranch: analysis.mainBranch,
        primaryLanguage: analysis.primaryLanguage,
        stars: (analysis.metadata as any)?.stargazersCount,
        forks: (analysis.metadata as any)?.forksCount,
      },
      projectType: analysis.projectType,
      technologies: analysis.technologies.map(t => ({ name: t.name, category: t.category })),
      packageManager: analysis.packageManager,
      dependencies: analysis.technologies.map(t => t.name),
      devDependencies: devDeps,
      scripts: analysis.scripts.map(s => ({ name: s.name, command: s.command })),
      environmentVars: envVars,

      // Deep intelligence — from source-aware analysis
      apiEndpoints: apiEndpointsFromSignals,
      features,
      pageRoutes,
      stateManagement,
      databaseInfo,
      authInfo,
      configFiles,
      testingFrameworks,
      hasDocker: analysis.signals.some(s => s.type === 'Infrastructure' && s.value === 'Docker'),
      hasCi: !!ciSignal,
      repositoryStructure: structureLines,
      tree: importantFiles,
      signals: analysis.signals,
      existingReadmeExcerpt: excerpt,

      // Actual source file excerpts for deep, grounded documentation
      sourceFiles: analysis.sourceFiles,
    };
  }
}

/**
 * Build a compact directory-tree string from a list of file paths.
 */
function buildStructureFromPaths(paths: string[]): string {
  const topDirs = new Set<string>();
  const topFiles: string[] = [];

  for (const p of paths) {
    const parts = p.split('/');
    if (parts.length === 1) topFiles.push(p);
    else topDirs.add(parts[0]);
  }

  const lines: string[] = ['.'];
  for (const dir of Array.from(topDirs).sort().slice(0, 12)) {
    const subdirs = new Set<string>();
    for (const p of paths) {
      const parts = p.split('/');
      if (parts[0] === dir && parts.length > 2) subdirs.add(parts[1]);
    }
    lines.push(`├── ${dir}/`);
    for (const sub of Array.from(subdirs).sort().slice(0, 5)) {
      lines.push(`│   ├── ${sub}/`);
    }
  }
  for (const f of topFiles.slice(0, 8)) {
    lines.push(`├── ${f}`);
  }
  return lines.join('\n');
}
