import { GitHubClient } from './github-client';

export class FileReader {
  
  static async getFileContent(owner: string, repo: string, path: string, branch: string = 'main'): Promise<string | null> {
    try {
      // Use the raw endpoint for fetching file contents directly.
      // This is efficient and avoids parsing base64 blobs for text files.
      // E.g. https://raw.githubusercontent.com/vercel/next.js/canary/package.json
      
      const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'GitDoc-AI-App',
        },
        next: { revalidate: 60 }
      });

      if (!response.ok) {
        return null;
      }
      
      const text = await response.text();
      return text;
      
    } catch (e) {
      return null;
    }
  }

  // Helper for parsing package.json safely
  static async getPackageJson(owner: string, repo: string, branch: string): Promise<any | null> {
    const content = await this.getFileContent(owner, repo, 'package.json', branch);
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
}
