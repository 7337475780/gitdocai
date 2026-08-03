import { ProviderClassification } from './provider-classification';

export class ProviderRetry {
  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 2,
    baseDelayMs = 1000
  ): Promise<T> {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        return await fn();
      } catch (error: any) {
        const { isRetryable } = ProviderClassification.classify(error);
        if (!isRetryable || attempt >= maxRetries) {
          throw error;
        }

        attempt++;
        const jitter = Math.random() * 200;
        const delay = Math.pow(2, attempt) * baseDelayMs + jitter;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Maximum retry attempts exceeded.');
  }
}
