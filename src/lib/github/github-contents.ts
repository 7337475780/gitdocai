import { fetchGitHubAPI } from './github-client';
import { GitHubFileStatus, GitHubCommitResult } from './github-types';

export async function getGitHubFileStatus(owner: string, repo: string, path: string, branch: string): Promise<GitHubFileStatus> {
  try {
    const url = `/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
    const res = await fetchGitHubAPI(url);
    const data = await res.json();

    // If it's a file, it will have type === 'file' and a sha
    if (data.type === 'file') {
      return { exists: true, path, sha: data.sha };
    }
    
    // If it's a directory, return exists: false to let the commit fail safely or we shouldn't overwrite a dir
    return { exists: false, path };
  } catch (error: any) {
    if (error.status === 404) {
      return { exists: false, path };
    }
    throw error;
  }
}

export async function commitGitHubFile(
  owner: string, 
  repo: string, 
  path: string, 
  branch: string, 
  message: string, 
  content: string, 
  sha?: string
): Promise<GitHubCommitResult> {
  const url = `/repos/${owner}/${repo}/contents/${path}`;
  
  // Base64 encode the content correctly supporting UTF-8
  const base64Content = Buffer.from(content, 'utf-8').toString('base64');
  
  const body: any = {
    message,
    content: base64Content,
    branch,
  };
  
  if (sha) {
    body.sha = sha;
  }

  const res = await fetchGitHubAPI(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  
  return {
    commitUrl: data.commit.html_url,
    fileUrl: data.content.html_url,
  };
}
