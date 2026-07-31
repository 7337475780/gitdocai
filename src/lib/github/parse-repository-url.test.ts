import { describe, it, expect } from 'vitest';
import { parseRepositoryUrl } from './parse-repository-url';

describe('parseRepositoryUrl', () => {
  it('should parse standard HTTPS URLs', () => {
    const result = parseRepositoryUrl('https://github.com/vercel/next.js');
    expect(result).toEqual({ owner: 'vercel', repo: 'next.js' });
  });

  it('should parse URLs without scheme', () => {
    const result = parseRepositoryUrl('github.com/facebook/react');
    expect(result).toEqual({ owner: 'facebook', repo: 'react' });
  });

  it('should handle .git suffix', () => {
    const result = parseRepositoryUrl('https://github.com/sveltejs/svelte.git');
    expect(result).toEqual({ owner: 'sveltejs', repo: 'svelte' });
  });

  it('should handle trailing slashes', () => {
    const result = parseRepositoryUrl('https://github.com/vuejs/core/');
    expect(result).toEqual({ owner: 'vuejs', repo: 'core' });
  });

  it('should reject profile URLs', () => {
    const result = parseRepositoryUrl('https://github.com/vercel');
    expect(result).toBeNull();
  });

  it('should reject file URLs', () => {
    const result = parseRepositoryUrl('https://github.com/vercel/next.js/blob/canary/package.json');
    expect(result).toBeNull();
  });

  it('should reject non-github URLs', () => {
    const result = parseRepositoryUrl('https://gitlab.com/owner/repo');
    expect(result).toBeNull();
  });
});
