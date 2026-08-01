import { fetchGitHubAPI } from './github-client';
import { GitHubBranch } from './github-types';

export async function listGitHubBranches(owner: string, repo: string, page = 1, perPage = 100): Promise<{ branches: GitHubBranch[], page: number, hasNextPage: boolean }> {
  try {
    const url = `/repos/${owner}/${repo}/branches?page=${page}&per_page=${perPage}`;
    const res = await fetchGitHubAPI(url);
    const data = await res.json();
    
    const linkHeader = res.headers.get('link') || '';
    const hasNextPage = linkHeader.includes('rel="next"');
    
    const branches = data.map((branch: any) => ({
      name: branch.name,
    }));
    
    return { branches, page, hasNextPage };
  } catch (error) {
    console.error('Failed to list GitHub branches', error);
    throw error;
  }
}
