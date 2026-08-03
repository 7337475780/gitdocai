export type AIProviderErrorType =
  | 'AUTHENTICATION'
  | 'INVALID_REQUEST'
  | 'RATE_LIMIT'
  | 'TIMEOUT'
  | 'NETWORK'
  | 'TEMPORARY_PROVIDER_FAILURE'
  | 'INVALID_PROVIDER_RESPONSE'
  | 'CONTENT_REJECTED'
  | 'QUOTA_EXCEEDED'
  | 'UNKNOWN';

export class ProviderClassification {
  static classify(error: any): { type: AIProviderErrorType; isRetryable: boolean } {
    if (!error) return { type: 'UNKNOWN', isRetryable: false };

    const message = (error.message || '').toLowerCase();
    const status = error.status || error.statusCode || error.response?.status;

    if (status === 401 || status === 403 || message.includes('api key') || message.includes('unauthorized')) {
      return { type: 'AUTHENTICATION', isRetryable: false };
    }
    if (status === 400 || message.includes('invalid request') || message.includes('malformed')) {
      return { type: 'INVALID_REQUEST', isRetryable: false };
    }
    if (status === 429 || message.includes('rate limit') || message.includes('too many requests')) {
      return { type: 'RATE_LIMIT', isRetryable: true };
    }
    if (message.includes('timeout') || message.includes('aborted') || error.name === 'AbortError') {
      return { type: 'TIMEOUT', isRetryable: true };
    }
    if (status === 502 || status === 503 || status === 504 || message.includes('econnreset') || message.includes('fetch failed')) {
      return { type: 'TEMPORARY_PROVIDER_FAILURE', isRetryable: true };
    }
    if (message.includes('quota') || message.includes('exceeded')) {
      return { type: 'QUOTA_EXCEEDED', isRetryable: false };
    }
    if (message.includes('content filter') || message.includes('safety')) {
      return { type: 'CONTENT_REJECTED', isRetryable: false };
    }

    return { type: 'UNKNOWN', isRetryable: true };
  }
}
