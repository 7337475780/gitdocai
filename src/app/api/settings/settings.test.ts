import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';
import { getGitHubSession } from '@/lib/github/github-session';

// Mock getGitHubSession
vi.mock('@/lib/github/github-session', () => ({
  getGitHubSession: vi.fn(),
}));

describe('Settings API Route Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Returns settings configurations and metadata safely', async () => {
    vi.mocked(getGitHubSession).mockResolvedValue({
      user: { login: 'settingsuser', name: 'Settings User' },
    } as any);

    const response = await GET();
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data.appInfo.version).toBe('1.0.0');
    expect(json.data.appInfo.environment).toBeDefined();
    expect(json.data.providers).toBeDefined();
    expect(json.data.userLogin).toBe('settingsuser');

    // Verify absolutely no keys or credentials are leaked
    const hasSecrets = JSON.stringify(json.data).includes('API_KEY') || JSON.stringify(json.data).includes('SECRET');
    expect(hasSecrets).toBe(false);
  });

  it('2. Handes unauthenticated session gracefully', async () => {
    vi.mocked(getGitHubSession).mockResolvedValue({
      user: undefined,
    } as any);

    const response = await GET();
    const json = await response.json();

    expect(json.success).toBe(true);
    expect(json.data.userLogin).toBeNull();
  });
});
