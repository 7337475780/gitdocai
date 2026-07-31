import { GitHubClient } from './github-client';
import { RepositoryMetadata, RepositoryLanguage, RepositoryTree, RepositoryFile } from '../../types';

export class RepositoryService {
  
  static async getMetadata(owner: string, repo: string): Promise<RepositoryMetadata> {
    const data = await GitHubClient.fetch<any>(`/repos/${owner}/${repo}`);
    
    return {
      name: data.name,
      fullName: data.full_name,
      ownerLogin: data.owner.login,
      ownerAvatar: data.owner.avatar_url,
      description: data.description,
      htmlUrl: data.html_url,
      defaultBranch: data.default_branch,
      visibility: data.visibility,
      isArchived: data.archived,
      isFork: data.fork,
      size: data.size,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      primaryLanguage: data.language,
      license: data.license?.name || null,
    };
  }

  static async getLanguages(owner: string, repo: string): Promise<RepositoryLanguage[]> {
    const data = await GitHubClient.fetch<Record<string, number>>(`/repos/${owner}/${repo}/languages`);
    
    const totalBytes = Object.values(data).reduce((acc, bytes) => acc + bytes, 0);
    
    return Object.entries(data).map(([name, bytes]) => ({
      name,
      bytes,
      percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 100) : 0,
    })).sort((a, b) => b.bytes - a.bytes); // Sort descending
  }

  static async getTree(owner: string, repo: string, defaultBranch: string): Promise<RepositoryTree> {
    // We use recursive=1 to get the full tree, but we'll cap it at 150 items for the UI.
    const data = await GitHubClient.fetch<any>(`/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`);
    
    const rawFiles: any[] = data.tree || [];
    
    // Filter out typical noisy directories like node_modules, .git, dist, etc.
    const excludePatterns = [
      /^node_modules\//,
      /^\.git\//,
      /^dist\//,
      /^build\//,
      /^\.next\//,
      /^coverage\//,
      /^vendor\//,
      /^target\//,
      /^out\//,
      /^\.cache\//,
      /^venv\//,
      /^__pycache__\//,
    ];

    let files: RepositoryFile[] = rawFiles
      .filter((file) => !excludePatterns.some((pattern) => pattern.test(file.path)))
      .map((file) => ({
        path: file.path,
        type: file.type === 'blob' ? 'blob' : 'tree',
        size: file.size,
      }));

    // Limit to top 150 items to avoid sending huge trees to the client
    const MAX_FILES = 150;
    const truncated = files.length > MAX_FILES || data.truncated;
    
    if (files.length > MAX_FILES) {
      // Prioritize top-level files and shallow directories
      files.sort((a, b) => {
        const depthA = (a.path.match(/\//g) || []).length;
        const depthB = (b.path.match(/\//g) || []).length;
        if (depthA !== depthB) return depthA - depthB;
        return a.path.localeCompare(b.path);
      });
      files = files.slice(0, MAX_FILES);
    }

    // Sort alphabetically for display
    files.sort((a, b) => a.path.localeCompare(b.path));

    return {
      truncated,
      files,
    };
  }
}
