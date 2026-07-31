export function parseRepositoryUrl(url: string): { owner: string; repo: string } | null {
  if (!url) return null;

  // Clean the URL (remove trailing slashes, .git extensions)
  let cleanUrl = url.trim();
  if (cleanUrl.endsWith('.git')) {
    cleanUrl = cleanUrl.slice(0, -4);
  }
  if (cleanUrl.endsWith('/')) {
    cleanUrl = cleanUrl.slice(0, -1);
  }

  // Handle various formats
  // https://github.com/owner/repo
  // github.com/owner/repo
  const githubRegex = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)\/([a-zA-Z0-9_.-]+)$/i;
  
  const match = cleanUrl.match(githubRegex);
  
  if (match && match.length === 3) {
    return {
      owner: match[1],
      repo: match[2],
    };
  }

  return null;
}
