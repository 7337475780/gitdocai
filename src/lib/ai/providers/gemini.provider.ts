import { AIProvider, AIProviderId, DocumentationContext, GenerateReadmeOptions } from '../provider';
import { AIModelGenerationResult } from '../schemas/ai-response';
import { AIProviderError } from '../errors/ai-provider-error';
import { buildSystemPrompt, buildUserPrompt } from '../prompts/generate-readme';
import { parseModelList } from '../config/ai-config';

export class GeminiProvider implements AIProvider {
  public readonly id: AIProviderId = 'gemini';

  isConfigured(): boolean {
    return Boolean(process.env.GEMINI_API_KEY) && this.getConfiguredModels().length > 0;
  }

  getConfiguredModels(): string[] {
    return parseModelList(process.env.GEMINI_MODELS);
  }

  async generateSection(
    sectionTitle: string,
    sectionContent: string,
    instruction: string,
    model: string,
    timeoutMs: number
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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new AIProviderError({ code: 'AI_PROVIDER_NOT_CONFIGURED', message: 'Missing API key', retryable: false, provider: this.id, model });
    }

    const systemPrompt = buildSystemPrompt(options);
    const userPrompt = buildUserPrompt(context);
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            { role: 'user', parts: [{ text: userPrompt }] }
          ],
          systemInstruction: {
            parts: [{ text: systemPrompt }]
          },
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4000,
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorCode: any = 'AI_PROVIDER_FAILED';
        let retryable = true;
        
        if (response.status === 400 && response.statusText.includes('API key')) {
          errorCode = 'AI_PROVIDER_AUTHENTICATION_FAILED';
          retryable = false;
        } else if (response.status === 429) {
          errorCode = 'AI_RATE_LIMITED';
        }

        throw new AIProviderError({
          code: errorCode,
          message: `Gemini error: ${response.statusText}`,
          retryable,
          provider: this.id,
          model,
          statusCode: response.status
        });
      }

      const data = await response.json();
      
      const markdown = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

      if (!markdown) {
        throw new AIProviderError({
          code: 'AI_EMPTY_RESPONSE',
          message: 'Received empty response from Gemini',
          retryable: true,
          provider: this.id,
          model
        });
      }

      return {
        markdown,
        usageMetadata: data.usageMetadata ? {
          promptTokens: data.usageMetadata.promptTokenCount,
          completionTokens: data.usageMetadata.candidatesTokenCount,
          totalTokens: data.usageMetadata.totalTokenCount,
        } : undefined,
        providerId: this.id,
        modelId: model
      };

    } catch (error: any) {
      if (error instanceof AIProviderError) throw error;
      
      if (error.name === 'AbortError') {
        throw new AIProviderError({
          code: 'AI_REQUEST_TIMEOUT',
          message: 'Gemini request timed out',
          retryable: true,
          provider: this.id,
          model
        });
      }
      
      throw new AIProviderError({
        code: 'AI_GENERATION_FAILED',
        message: error.message || 'Unknown Gemini error',
        retryable: true,
        provider: this.id,
        model,
        cause: error
      });
    }
  }
}
