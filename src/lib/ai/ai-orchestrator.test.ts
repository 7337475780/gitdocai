import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { AIOrchestrator } from './ai-orchestrator';
import { AIProviderError } from './errors/ai-provider-error';

// Mock getAIConfig
vi.mock('./config/ai-config', () => ({
  getAIConfig: vi.fn(),
  parseModelList: vi.fn()
}));

import { getAIConfig } from './config/ai-config';
import { circuitBreakerRegistry } from './reliability/provider-circuit-breaker';

describe('AIOrchestrator', () => {
  let orchestrator: AIOrchestrator;

  beforeEach(() => {
    vi.resetAllMocks();
    circuitBreakerRegistry.resetAll();
    orchestrator = new AIOrchestrator();
    
    // We will inject mock providers to test fallback logic
    // Clear out the constructor's default providers
    (orchestrator as any).providers = new Map();
  });

  const createContext = () => ({
    repository: { name: 'test', owner: 'owner', description: '', url: '', mainBranch: 'main', primaryLanguage: 'ts' },
    projectType: 'app',
    technologies: [],
    packageManager: 'npm',
    dependencies: [],
    scripts: [],
    environmentVars: [],
    tree: [],
    signals: []
  });

  const createMockProvider = (id: string, models: string[], isConfigured = true) => {
    return {
      id,
      isConfigured: vi.fn().mockReturnValue(isConfigured),
      getConfiguredModels: vi.fn().mockReturnValue(models),
      generateReadme: vi.fn()
    };
  };

  it('throws if no providers are configured in order', async () => {
    (getAIConfig as Mock).mockReturnValue({
      providerOrder: [],
      maxTotalAttempts: 10,
      requestTimeoutMs: 1000
    });

    await expect(orchestrator.generate(createContext(), { template: 'minimal', tone: 'concise' }))
      .rejects
      .toThrow('No AI providers configured');
  });

  it('succeeds on first provider and first model', async () => {
    const mockGemini = createMockProvider('gemini', ['model-1', 'model-2']);
    mockGemini.generateReadme.mockResolvedValueOnce({
      markdown: 'success',
      providerId: 'gemini',
      modelId: 'model-1'
    });

    (orchestrator as any).providers.set('gemini', mockGemini);

    (getAIConfig as Mock).mockReturnValue({
      providerOrder: ['gemini'],
      maxTotalAttempts: 10,
      requestTimeoutMs: 1000
    });

    const result = await orchestrator.generate(createContext(), { template: 'minimal', tone: 'concise' });
    
    expect(result.result.markdown).toBe('success');
    expect(result.metadata.providerFallbackUsed).toBe(false);
    expect(result.metadata.modelFallbackUsed).toBe(false);
    expect(result.metadata.attemptCount).toBe(1);
    expect(mockGemini.generateReadme).toHaveBeenCalledTimes(1);
  });

  it('falls back to second model if first model fails (retryable)', async () => {
    const mockGemini = createMockProvider('gemini', ['model-1', 'model-2']);
    
    mockGemini.generateReadme
      .mockRejectedValueOnce(new AIProviderError({ code: 'AI_RATE_LIMITED', message: 'Rate limit', retryable: true, provider: 'gemini', model: 'model-1' }))
      .mockResolvedValueOnce({ markdown: 'success-model-2', providerId: 'gemini', modelId: 'model-2' });

    (orchestrator as any).providers.set('gemini', mockGemini);

    (getAIConfig as Mock).mockReturnValue({
      providerOrder: ['gemini'],
      maxTotalAttempts: 10,
      requestTimeoutMs: 1000
    });

    const result = await orchestrator.generate(createContext(), { template: 'minimal', tone: 'concise' });
    
    expect(result.result.markdown).toBe('success-model-2');
    expect(result.metadata.providerFallbackUsed).toBe(false);
    expect(result.metadata.modelFallbackUsed).toBe(true);
    expect(result.metadata.attemptCount).toBe(2);
    expect(mockGemini.generateReadme).toHaveBeenCalledTimes(2);
  });

  it('falls back to second provider if all models in first provider fail (retryable)', async () => {
    const mockGemini = createMockProvider('gemini', ['model-1']);
    const mockGroq = createMockProvider('groq', ['model-1']);
    
    mockGemini.generateReadme
      .mockRejectedValueOnce(new AIProviderError({ code: 'AI_RATE_LIMITED', message: 'Rate limit', retryable: true, provider: 'gemini', model: 'model-1' }));
      
    mockGroq.generateReadme
      .mockResolvedValueOnce({ markdown: 'success-groq', providerId: 'groq', modelId: 'model-1' });

    (orchestrator as any).providers.set('gemini', mockGemini);
    (orchestrator as any).providers.set('groq', mockGroq);

    (getAIConfig as Mock).mockReturnValue({
      providerOrder: ['gemini', 'groq'],
      maxTotalAttempts: 10,
      requestTimeoutMs: 1000
    });

    const result = await orchestrator.generate(createContext(), { template: 'minimal', tone: 'concise' });
    
    expect(result.result.markdown).toBe('success-groq');
    expect(result.metadata.providerFallbackUsed).toBe(true);
    expect(result.metadata.modelFallbackUsed).toBe(false);
    expect(result.metadata.attemptCount).toBe(2);
    expect(mockGemini.generateReadme).toHaveBeenCalledTimes(1);
    expect(mockGroq.generateReadme).toHaveBeenCalledTimes(1);
  });

  it('skips remaining models in a provider on non-retryable error', async () => {
    const mockGemini = createMockProvider('gemini', ['model-1', 'model-2']);
    const mockGroq = createMockProvider('groq', ['model-1']);
    
    // Auth failure is non-retryable
    mockGemini.generateReadme
      .mockRejectedValueOnce(new AIProviderError({ code: 'AI_PROVIDER_AUTHENTICATION_FAILED', message: 'Bad Key', retryable: false, provider: 'gemini', model: 'model-1' }));
      
    mockGroq.generateReadme
      .mockResolvedValueOnce({ markdown: 'success-groq', providerId: 'groq', modelId: 'model-1' });

    (orchestrator as any).providers.set('gemini', mockGemini);
    (orchestrator as any).providers.set('groq', mockGroq);

    (getAIConfig as Mock).mockReturnValue({
      providerOrder: ['gemini', 'groq'],
      maxTotalAttempts: 10,
      requestTimeoutMs: 1000
    });

    const result = await orchestrator.generate(createContext(), { template: 'minimal', tone: 'concise' });
    
    expect(result.result.markdown).toBe('success-groq');
    expect(mockGemini.generateReadme).toHaveBeenCalledTimes(1); // Didn't try model-2
    expect(mockGroq.generateReadme).toHaveBeenCalledTimes(1);
  });

  it('throws ALL_AI_PROVIDERS_FAILED if every attempt fails', async () => {
    const mockGemini = createMockProvider('gemini', ['model-1']);
    
    mockGemini.generateReadme
      .mockRejectedValueOnce(new AIProviderError({ code: 'AI_RATE_LIMITED', message: 'Rate limit', retryable: true, provider: 'gemini', model: 'model-1' }));

    (orchestrator as any).providers.set('gemini', mockGemini);

    (getAIConfig as Mock).mockReturnValue({
      providerOrder: ['gemini'],
      maxTotalAttempts: 10,
      requestTimeoutMs: 1000
    });

    await expect(orchestrator.generate(createContext(), { template: 'minimal', tone: 'concise' }))
      .rejects
      .toThrow('Documentation generation is temporarily unavailable');
  });

  it('respects max attempts and stops', async () => {
    const mockGemini = createMockProvider('gemini', ['model-1', 'model-2', 'model-3']);
    
    mockGemini.generateReadme.mockRejectedValue(new AIProviderError({ code: 'AI_RATE_LIMITED', message: 'Rate limit', retryable: true, provider: 'gemini', model: 'model-x' }));

    (orchestrator as any).providers.set('gemini', mockGemini);

    (getAIConfig as Mock).mockReturnValue({
      providerOrder: ['gemini'],
      maxTotalAttempts: 2, // Only allow 2 attempts total
      requestTimeoutMs: 1000
    });

    await expect(orchestrator.generate(createContext(), { template: 'minimal', tone: 'concise' }))
      .rejects
      .toThrow('Documentation generation is temporarily unavailable');

    expect(mockGemini.generateReadme).toHaveBeenCalledTimes(2);
  });
});
