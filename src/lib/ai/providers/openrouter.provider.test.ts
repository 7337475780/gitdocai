import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenRouterProvider } from './openrouter.provider';

describe('OpenRouterProvider', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('should throw if OPENROUTER_API_KEY is missing', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const provider = new OpenRouterProvider();
    await expect(provider.generateReadme(
      { repository: { name: 'test' }, technologies: [], scripts: [], signals: [], environmentVars: [], tree: [], projectType: 'Web', packageManager: 'npm' } as any,
      { template: 'professional', tone: 'professional' },
      'test-model',
      1000
    )).rejects.toThrow('Missing API key');
  });

  it('should parse successful completion', async () => {
    process.env.OPENROUTER_API_KEY = 'test_key';
    const provider = new OpenRouterProvider();

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '# Test README' } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
      })
    });

    const result = await provider.generateReadme(
      { repository: { name: 'test' }, technologies: [], scripts: [], signals: [], environmentVars: [], tree: [], projectType: 'Web', packageManager: 'npm' } as any,
      { template: 'professional', tone: 'professional' },
      'test-model',
      1000
    );

    expect(result.markdown).toBe('# Test README');
    expect(result.usageMetadata?.totalTokens).toBe(30);
  });

  it('should throw rate limit error on 429', async () => {
    process.env.OPENROUTER_API_KEY = 'test_key';
    const provider = new OpenRouterProvider();

    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 429,
    });

    await expect(provider.generateReadme(
      { repository: { name: 'test' }, technologies: [], scripts: [], signals: [], environmentVars: [], tree: [], projectType: 'Web', packageManager: 'npm' } as any,
      { template: 'professional', tone: 'professional' },
      'test-model',
      1000
    )).rejects.toThrow('OpenRouter error');
  });

  it('should throw empty response error if markdown is empty', async () => {
    process.env.OPENROUTER_API_KEY = 'test_key';
    const provider = new OpenRouterProvider();

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '' } }]
      })
    });

    await expect(provider.generateReadme(
      { repository: { name: 'test' }, technologies: [], scripts: [], signals: [], environmentVars: [], tree: [], projectType: 'Web', packageManager: 'npm' } as any,
      { template: 'professional', tone: 'professional' },
      'test-model',
      1000
    )).rejects.toThrow('Received empty response');
  });
});
