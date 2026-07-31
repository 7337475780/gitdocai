import { RepositoryAnalysisResult } from '@/types';
import { DocumentationContext } from '../ai/provider';

export class ContextBuilder {
  /**
   * Compresses a full repository analysis into a compact context for the LLM.
   * This prevents context window overflow and saves tokens.
   */
  static build(analysis: RepositoryAnalysisResult, rawReadmeContent?: string): DocumentationContext {
    
    // 1. Filter tree to only important files (top level, or specific extensions, up to 100 files max)
    // We don't want to send 10,000 files to the AI.
    const treeLimit = 50;
    const importantFiles = analysis.tree.files
      .filter(f => f.type === 'blob')
      .map(f => f.path)
      .filter(p => !p.includes('node_modules/') && !p.includes('.git/') && !p.includes('dist/') && !p.includes('build/'))
      .slice(0, treeLimit);

    // 2. Truncate existing README if it exists
    let excerpt: string | undefined = undefined;
    if (rawReadmeContent) {
      // Keep first 1500 characters to capture the essence but avoid giant files
      excerpt = rawReadmeContent.length > 1500 
        ? rawReadmeContent.substring(0, 1500) + '\n... (truncated)'
        : rawReadmeContent;
    }

    // 3. Extract environment variable keys safely (no values sent to AI)
    // Actually the analysis doesn't have env values anyway, just signals or names.
    const envVars = analysis.signals
      .filter(s => s.type === 'Environment')
      .map(s => s.value);

    return {
      repository: {
        name: analysis.repositoryName,
        owner: analysis.owner,
        description: analysis.description,
        url: analysis.url,
        mainBranch: analysis.mainBranch,
        primaryLanguage: analysis.primaryLanguage,
      },
      projectType: analysis.projectType,
      technologies: analysis.technologies.map(t => ({ name: t.name, category: t.category })),
      packageManager: analysis.packageManager,
      dependencies: analysis.technologies.map(t => t.name), // We can use detected tech as key dependencies
      scripts: analysis.scripts.map(s => ({ name: s.name, command: s.command })),
      environmentVars: envVars,
      tree: importantFiles,
      signals: analysis.signals,
      existingReadmeExcerpt: excerpt,
    };
  }
}
