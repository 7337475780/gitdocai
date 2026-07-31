import { AIProviderId } from '../provider';

export interface AIConfig {
  providerOrder: AIProviderId[];
  requestTimeoutMs: number;
  maxTotalAttempts: number;
}

export function parseAIProviderList(raw: string | undefined): AIProviderId[] {
  if (!raw) return [];
  
  const rawList = raw.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
  
  // Validate and deduplicate
  const validIds = new Set<AIProviderId>();
  for (const item of rawList) {
    if (['gemini', 'openrouter', 'groq', 'cerebras', 'huggingface'].includes(item)) {
      validIds.add(item as AIProviderId);
    } else {
      console.warn(`Ignoring unknown AI provider ID in configuration: ${item}`);
    }
  }
  
  return Array.from(validIds);
}

export function getAIConfig(): AIConfig {
  const providerOrder = parseAIProviderList(process.env.AI_PROVIDER_ORDER);
  
  if (providerOrder.length === 0) {
    console.warn('AI_PROVIDER_ORDER is missing or empty. Documentation generation will fail unless a provider is specified.');
  }

  const requestTimeoutMs = parseInt(process.env.AI_REQUEST_TIMEOUT_MS || '45000', 10);
  const maxTotalAttempts = parseInt(process.env.AI_MAX_TOTAL_ATTEMPTS || '10', 10);

  return {
    providerOrder,
    // Safely clamp bounds
    requestTimeoutMs: Math.max(5000, Math.min(requestTimeoutMs, 120000)),
    maxTotalAttempts: Math.max(1, Math.min(maxTotalAttempts, 20)),
  };
}

export function parseModelList(raw: string | undefined): string[] {
  if (!raw) return [];
  return Array.from(new Set(raw.split(',').map(s => s.trim()).filter(Boolean)));
}
