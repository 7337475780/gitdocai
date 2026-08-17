import { AIProvider, AIProviderId, DocumentationContext, GenerateReadmeOptions } from '../provider';
import { AIModelGenerationResult } from '../schemas/ai-response';
import { AIProviderError } from '../errors/ai-provider-error';
import { buildSystemPrompt, buildUserPrompt } from '../prompts/generate-readme';
import { buildImprovementSystemPrompt, buildImprovementUserPrompt } from '../prompts/improve-readme';
import { parseModelList } from '../config/ai-config';

export class CerebrasProvider implements AIProvider {
  public readonly id: AIProviderId = 'cerebras';
  private endpoint = 'https://api.cerebras.ai/v1/chat/completions';

  isConfigured(): boolean {
    return Boolean(process.env.CEREBRAS_API_KEY) && this.getConfiguredModels().length > 0;
  }

  getConfiguredModels(): string[] {
    return parseModelList(process.env.CEREBRAS_MODELS);
  }

  async generateSection(
    sectionTitle: string,
    sectionContent: string,
    instruction: string,
    model: string,
    _timeoutMs: number
  ): Promise<AIModelGenerationResult> {
    return {
      markdown: sectionContent + ' [Updated]',
      modelId: model,
      providerId: this.id
    };
  }

  async generateReadme(
    context: DocumentationContext,
    options: GenerateReadmeOptions,
    model: string,
    timeoutMs: number
  ): Promise<AIModelGenerationResult> {
    const apiKey = process.env.CEREBRAS_API_KEY;
    if (!apiKey) {
      throw new AIProviderError({ code: 'AI_PROVIDER_NOT_CONFIGURED', message: 'Missing API key', retryable: false, provider: this.id, model });
    }

    const systemPrompt = buildSystemPrompt(options);
    const userPrompt = buildUserPrompt(context);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2,
          max_tokens: 8000,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorCode: any = 'AI_PROVIDER_FAILED';
        let retryable = true;
        
        if (response.status === 401 || response.status === 403) {
          errorCode = 'AI_PROVIDER_AUTHENTICATION_FAILED';
          retryable = false;
        } else if (response.status === 429) {
          errorCode = 'AI_RATE_LIMITED';
        }

        throw new AIProviderError({
          code: errorCode,
          message: `Cerebras error: ${response.statusText}`,
          retryable,
          provider: this.id,
          model,
          statusCode: response.status
        });
      }

      const data = await response.json();
      const markdown = data?.choices?.[0]?.message?.content?.trim();

      if (!markdown) {
        throw new AIProviderError({
          code: 'AI_EMPTY_RESPONSE',
          message: 'Received empty response from Cerebras',
          retryable: true,
          provider: this.id,
          model
        });
      }

      return {
        markdown,
        usageMetadata: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
        providerId: this.id,
        modelId: model
      };

    } catch (error: any) {
      if (error instanceof AIProviderError) throw error;
      
      if (error.name === 'AbortError') {
        throw new AIProviderError({
          code: 'AI_REQUEST_TIMEOUT',
          message: 'Cerebras request timed out',
          retryable: true,
          provider: this.id,
          model
        });
      }
      
      throw new AIProviderError({
        code: 'AI_GENERATION_FAILED',
        message: error.message || 'Unknown Cerebras error',
        retryable: true,
        provider: this.id,
        model,
        cause: error
      });
    }
  }

  async generateImprovement(
    context: DocumentationContext,
    issueTitle: string,
    issueDescription: string,
    recommendation: string,
    targetSectionTitle?: string,
    currentSectionContent?: string,
    model?: string,
    timeoutMs?: number
  ): Promise<AIModelGenerationResult> {
    const apiKey = process.env.CEREBRAS_API_KEY;
    const realModel = model || this.getConfiguredModels()[0] || 'llama-3.3-70b';
    const realTimeout = timeoutMs || 30000;

    if (!apiKey) {
      throw new AIProviderError({
        code: 'AI_PROVIDER_NOT_CONFIGURED',
        message: 'Missing API key',
        retryable: false,
        provider: this.id,
        model: realModel
      });
    }

    const systemPrompt = buildImprovementSystemPrompt(issueTitle, recommendation, targetSectionTitle);
    const userPrompt = buildImprovementUserPrompt(context, issueDescription, targetSectionTitle, currentSectionContent);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), realTimeout);

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: realModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2,
          max_tokens: 2500,
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorCode: any = 'AI_PROVIDER_FAILED';
        let retryable = true;
        
        if (response.status === 401 || response.status === 403) {
          errorCode = 'AI_PROVIDER_AUTHENTICATION_FAILED';
          retryable = false;
        } else if (response.status === 429) {
          errorCode = 'AI_RATE_LIMITED';
        }

        throw new AIProviderError({
          code: errorCode,
          message: `Cerebras error: ${response.statusText}`,
          retryable,
          provider: this.id,
          model: realModel,
          statusCode: response.status
        });
      }

      const data = await response.json();
      const markdown = data?.choices?.[0]?.message?.content?.trim();

      if (!markdown) {
        throw new AIProviderError({
          code: 'AI_EMPTY_RESPONSE',
          message: 'Received empty response from Cerebras',
          retryable: true,
          provider: this.id,
          model: realModel
        });
      }

      return {
        markdown,
        usageMetadata: data.usage ? {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
        } : undefined,
        providerId: this.id,
        modelId: realModel
      };

    } catch (error: any) {
      if (error instanceof AIProviderError) throw error;
      
      if (error.name === 'AbortError') {
        throw new AIProviderError({
          code: 'AI_REQUEST_TIMEOUT',
          message: 'Cerebras request timed out',
          retryable: true,
          provider: this.id,
          model: realModel
        });
      }
      
      throw new AIProviderError({
        code: 'AI_GENERATION_FAILED',
        message: error.message || 'Unknown Cerebras error',
        retryable: true,
        provider: this.id,
        model: realModel,
        cause: error
      });
    }
  }
}
