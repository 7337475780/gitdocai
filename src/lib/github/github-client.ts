export class GitHubError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'GitHubError';
  }
}

export class GitHubClient {
  private static readonly API_BASE = 'https://api.github.com';

  private static getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitDoc-AI-App',
    };

    const token = process.env.GITHUB_TOKEN;
    if (token) {
      headers['Authorization'] = `token ${token}`;
    }

    return headers;
  }

  static async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options?.headers,
      },
      // Using Next.js fetch caching option to revalidate every hour for general metadata, 
      // but in this specific tool context, we probably want fresh data or short cache.
      next: { revalidate: 60 } 
    });

    if (!response.ok) {
      const isRateLimited = response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0';
      if (isRateLimited) {
        throw new GitHubError(429, 'GitHub API rate limit exceeded.');
      }
      
      let message = response.statusText;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          message = errorData.message;
        }
      } catch (e) {
        // Ignore JSON parse errors for non-JSON responses
      }
      
      throw new GitHubError(response.status, message);
    }

    // Some endpoints (like raw file fetch) might not be JSON, but our standard API calls are.
    // If it's a raw file, we should handle it differently. We will assume T is expected JSON for this generic method.
    return response.json() as Promise<T>;
  }

  static async fetchRaw(endpoint: string, options?: RequestInit): Promise<string> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.API_BASE}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        'Accept': 'application/vnd.github.v3.raw', // Request raw file content
        ...options?.headers,
      },
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      throw new GitHubError(response.status, `Failed to fetch raw file: ${response.statusText}`);
    }

    return response.text();
  }
}
