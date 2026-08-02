import { AIProvider, AIProviderId, DocumentationContext, GenerateReadmeOptions } from './provider';
import { getAIConfig } from './config/ai-config';
import { AIModelGenerationResult } from './schemas/ai-response';
import { AIProviderError } from './errors/ai-provider-error';
import { GeminiProvider } from './providers/gemini.provider';
import { OpenRouterProvider } from './providers/openrouter.provider';
import { GroqProvider } from './providers/groq.provider';
import { CerebrasProvider } from './providers/cerebras.provider';
import { HuggingFaceProvider } from './providers/huggingface.provider';
export interface AIOrchestrationMetadata {
  generationTimeMs: number;
  provider: string;
  model: string;
  providerFallbackUsed: boolean;
  modelFallbackUsed: boolean;
  attemptCount: number;
}

export interface OrchestratedGenerationResult {
  result: AIModelGenerationResult;
  metadata: AIOrchestrationMetadata;
}

export class AIOrchestrator {
  private providers: Map<AIProviderId, AIProvider> = new Map();

  constructor() {
    this.registerProvider(new GeminiProvider());
    this.registerProvider(new OpenRouterProvider());
    this.registerProvider(new GroqProvider());
    this.registerProvider(new CerebrasProvider());
    this.registerProvider(new HuggingFaceProvider());
  }

  private registerProvider(provider: AIProvider) {
    this.providers.set(provider.id, provider);
  }

  private async executeWithFallback<T>(
    operation: (provider: AIProvider, model: string, timeoutMs: number) => Promise<T>
  ): Promise<{ result: T, metadata: AIOrchestrationMetadata }> {
    const config = getAIConfig();
    const startTime = Date.now();
    let attemptCount = 0;
    
    let providerFallbackUsed = false;
    let modelFallbackUsed = false;

    if (config.providerOrder.length === 0) {
      throw new AIProviderError({
        code: 'AI_PROVIDER_NOT_CONFIGURED',
        message: 'No AI providers configured. Check AI_PROVIDER_ORDER.',
        retryable: false,
        provider: 'orchestrator',
        model: 'none'
      });
    }

    for (let pIdx = 0; pIdx < config.providerOrder.length; pIdx++) {
      const providerId = config.providerOrder[pIdx];
      const provider = this.providers.get(providerId);

      if (!provider) {
        console.warn(`AIOrchestrator: Unknown provider ${providerId} in AI_PROVIDER_ORDER. Skipping.`);
        continue;
      }

      if (!provider.isConfigured()) {
        console.log(`AIOrchestrator: Provider ${providerId} is not fully configured. Skipping.`);
        continue;
      }

      if (pIdx > 0) {
        providerFallbackUsed = true;
      }

      const models = provider.getConfiguredModels();
      for (let mIdx = 0; mIdx < models.length; mIdx++) {
        const model = models[mIdx];
        
        if (mIdx > 0) {
          modelFallbackUsed = true;
        }

        if (attemptCount >= config.maxTotalAttempts) {
          console.warn(`AIOrchestrator: Reached max total attempts (${config.maxTotalAttempts}). Stopping.`);
          throw new AIProviderError({
            code: 'ALL_AI_PROVIDERS_FAILED',
            message: 'Documentation generation is temporarily unavailable. Please try again later.',
            retryable: false,
            provider: 'orchestrator',
            model: 'none'
          });
        }

        attemptCount++;
        const attemptStartTime = Date.now();

        try {
          console.log(`AIOrchestrator: Attempt ${attemptCount}. Provider: ${providerId}, Model: ${model}`);
          
          const result = await operation(provider, model, config.requestTimeoutMs);

          // Success logging
          console.log(JSON.stringify({
            event: "ai_generation_attempt",
            provider: providerId,
            model: model,
            attempt: attemptCount,
            success: true,
            durationMs: Date.now() - attemptStartTime
          }));

          return {
            result,
            metadata: {
              generationTimeMs: Date.now() - startTime,
              provider: providerId,
              model,
              providerFallbackUsed,
              modelFallbackUsed,
              attemptCount
            }
          };

        } catch (error: any) {
          const errorCode = error.code || 'UNKNOWN_ERROR';
          const retryable = error.retryable !== false;
          
          console.log(JSON.stringify({
            event: "ai_generation_attempt",
            provider: providerId,
            model: model,
            attempt: attemptCount,
            success: false,
            errorCode: errorCode,
            durationMs: Date.now() - attemptStartTime
          }));

          if (!retryable) {
            console.warn(`AIOrchestrator: Non-retryable error (${errorCode}) from ${providerId}. Skipping remaining models for this provider.`);
            break; // Break the model loop, move to next provider
          } else {
            console.warn(`AIOrchestrator: Retryable error (${errorCode}) from ${providerId} (${model}). Falling back...`);
            // Continue the model loop
          }
        }
      }
    }

    // All providers and models failed or none were fully configured
    throw new AIProviderError({
      code: 'ALL_AI_PROVIDERS_FAILED',
      message: 'Documentation generation is temporarily unavailable. Please try again later.',
      retryable: false,
      provider: 'orchestrator',
      model: 'none'
    });
  }

  async generate(
    context: DocumentationContext,
    options: GenerateReadmeOptions
  ): Promise<OrchestratedGenerationResult> {
    return this.executeWithFallback(
      (provider, model, timeoutMs) => provider.generateReadme(context, options, model, timeoutMs)
    );
  }

  async generateSection(
    sectionTitle: string,
    sectionContent: string,
    instruction: string
  ): Promise<OrchestratedGenerationResult> {
    return this.executeWithFallback(
      (provider, model, timeoutMs) => provider.generateSection(sectionTitle, sectionContent, instruction, model, timeoutMs)
    );
  }

  async generateImprovement(
    context: DocumentationContext,
    issueTitle: string,
    issueDescription: string,
    recommendation: string,
    targetSectionTitle?: string,
    currentSectionContent?: string
  ): Promise<OrchestratedGenerationResult> {
    return this.executeWithFallback(
      (provider, model, timeoutMs) => provider.generateImprovement(
        context,
        issueTitle,
        issueDescription,
        recommendation,
        targetSectionTitle,
        currentSectionContent,
        model,
        timeoutMs
      )
    );
  }
}
