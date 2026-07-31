export type AIErrorCode = 
  | 'AI_PROVIDER_NOT_CONFIGURED'
  | 'AI_RATE_LIMITED'
  | 'AI_REQUEST_TIMEOUT'
  | 'AI_PROVIDER_FAILED'
  | 'AI_INVALID_RESPONSE'
  | 'AI_EMPTY_RESPONSE'
  | 'AI_GENERATION_FAILED'
  | 'ALL_AI_PROVIDERS_FAILED'
  | 'AI_PROVIDER_AUTHENTICATION_FAILED'
  | 'DOCUMENT_VALIDATION_FAILED';

export interface AIProviderErrorOptions {
  code: AIErrorCode;
  message: string;
  retryable: boolean;
  provider: string;
  model: string;
  statusCode?: number;
  cause?: unknown;
}

export class AIProviderError extends Error {
  public readonly code: AIErrorCode;
  public readonly retryable: boolean;
  public readonly provider: string;
  public readonly model: string;
  public readonly statusCode?: number;
  public readonly cause?: unknown;

  constructor(options: AIProviderErrorOptions) {
    super(options.message);
    this.name = 'AIProviderError';
    this.code = options.code;
    this.retryable = options.retryable;
    this.provider = options.provider;
    this.model = options.model;
    this.statusCode = options.statusCode;
    this.cause = options.cause;
  }
}
