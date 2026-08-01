import { getGitHubSession } from './github-session';
import { GitHubError as GitHubErrorType } from './github-types';

const GITHUB_API_URL = 'https://api.github.com';

export const GitHubError = GitHubErrorType;

export class GitHubClient {
  static async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${GITHUB_API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const headers = new Headers(options.headers);
    if (!headers.has('Authorization') && process.env.GITHUB_TOKEN) {
      headers.set('Authorization', `Bearer ${process.env.GITHUB_TOKEN}`);
    }
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'GitDoc-AI',
        ...Object.fromEntries(headers.entries()),
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }
    
    return response.json();
  }
}

export async function fetchGitHubAPI(endpoint: string, options: RequestInit = {}) {
  const session = await getGitHubSession();
  
  if (!session.accessToken) {
    throw new GitHubError('Not connected to GitHub', 401, 'unauthorized');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${GITHUB_API_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.accessToken}`);
  headers.set('Accept', 'application/vnd.github.v3+json');
  headers.set('X-GitHub-Api-Version', '2022-11-28');

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let code = 'unknown';
    if (response.status === 401) code = 'unauthorized';
    if (response.status === 403) code = 'forbidden';
    if (response.status === 404) code = 'not_found';
    if (response.status === 409) code = 'conflict';
    if (response.headers.get('x-ratelimit-remaining') === '0') code = 'rate_limit';
    
    throw new GitHubError(
      errorData.message || `GitHub API error: ${response.statusText}`,
      response.status,
      code
    );
  }

  return response;
}
