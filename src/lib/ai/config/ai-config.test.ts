import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseAIProviderList, parseModelList, getAIConfig } from './ai-config';

describe('ai-config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('parseAIProviderList', () => {
    it('parses valid providers correctly', () => {
      const result = parseAIProviderList('gemini, openrouter,groq');
      expect(result).toEqual(['gemini', 'openrouter', 'groq']);
    });

    it('ignores empty values and whitespace', () => {
      const result = parseAIProviderList('gemini, ,  , groq');
      expect(result).toEqual(['gemini', 'groq']);
    });

    it('deduplicates providers', () => {
      const result = parseAIProviderList('gemini, groq, gemini');
      expect(result).toEqual(['gemini', 'groq']);
    });

    it('ignores unknown providers', () => {
      const result = parseAIProviderList('gemini, unknown_provider, groq');
      expect(result).toEqual(['gemini', 'groq']);
    });

    it('handles undefined input', () => {
      const result = parseAIProviderList(undefined);
      expect(result).toEqual([]);
    });
  });

  describe('parseModelList', () => {
    it('parses models and deduplicates', () => {
      const result = parseModelList('model-a, model-b, model-a');
      expect(result).toEqual(['model-a', 'model-b']);
    });

    it('ignores empty values', () => {
      const result = parseModelList('model-a, , model-b');
      expect(result).toEqual(['model-a', 'model-b']);
    });

    it('handles undefined input', () => {
      const result = parseModelList(undefined);
      expect(result).toEqual([]);
    });
  });

  describe('getAIConfig', () => {
    it('loads defaults safely', () => {
      process.env.AI_PROVIDER_ORDER = 'gemini';
      delete process.env.AI_REQUEST_TIMEOUT_MS;
      delete process.env.AI_MAX_TOTAL_ATTEMPTS;

      const config = getAIConfig();
      expect(config.providerOrder).toEqual(['gemini']);
      expect(config.requestTimeoutMs).toBe(45000);
      expect(config.maxTotalAttempts).toBe(10);
    });

    it('clamps values to safe bounds', () => {
      process.env.AI_PROVIDER_ORDER = 'gemini';
      process.env.AI_REQUEST_TIMEOUT_MS = '999999999'; // Way too high
      process.env.AI_MAX_TOTAL_ATTEMPTS = '1000'; // Way too high

      const config = getAIConfig();
      expect(config.requestTimeoutMs).toBe(120000);
      expect(config.maxTotalAttempts).toBe(20);
    });
  });
});
