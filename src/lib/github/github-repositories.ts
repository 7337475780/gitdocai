import { fetchGitHubAPI } from './github-client';
import { GitHubRepository } from './github-types';

export async function listGitHubRepositories(page = 1, perPage = 30, search?: string): Promise<{ repositories: GitHubRepository[], page: number, hasNextPage: boolean }> {
  try {
    let url = '';
    
    if (search) {
      // Use the search API
      const q = encodeURIComponent(`${search} in:name`);
      url = `/search/repositories?q=${q}&page=${page}&per_page=${perPage}`;
      
      const res = await fetchGitHubAPI(url);
      const data = await res.json();
      
      // Determine if there's a next page from Link header
      const linkHeader = res.headers.get('link') || '';
      const hasNextPage = linkHeader.includes('rel="next"');
      
      const repositories = data.items.map((repo: any) => ({
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        defaultBranch: repo.default_branch,
        private: repo.private,
      }));
      
      return { repositories, page, hasNextPage };
    } else {
      // Use user repositories API (shows repos the user has access to)
      url = `/user/repos?sort=updated&page=${page}&per_page=${perPage}`;
      
      const res = await fetchGitHubAPI(url);
      const data = await res.json();
      
      const linkHeader = res.headers.get('link') || '';
      const hasNextPage = linkHeader.includes('rel="next"');
      
      const repositories = data.map((repo: any) => ({
        owner: repo.owner.login,
        name: repo.name,
        fullName: repo.full_name,
        defaultBranch: repo.default_branch,
        private: repo.private,
      }));
      
      console.log(JSON.stringify({ event: 'github_repositories_loaded', success: true }));
      
      return { repositories, page, hasNextPage };
    }
  } catch (error) {
    console.error('Failed to list GitHub repositories', error);
    throw error;
  }
}
