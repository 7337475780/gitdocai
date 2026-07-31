export interface AIModelGenerationResult {
  markdown: string;
  usageMetadata?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  providerId: string;
  modelId: string;
}
