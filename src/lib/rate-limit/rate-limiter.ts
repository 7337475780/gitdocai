import { RATE_LIMIT_CONFIG, RateLimitCategory } from './rate-limit-config';
import { RateLimitError } from './rate-limit-errors';
import { defaultRateLimitStore, IRateLimitStore } from './rate-limit-store';

export class RateLimiter {
  private store: IRateLimitStore;

  constructor(store: IRateLimitStore = defaultRateLimitStore) {
    this.store = store;
  }

  /**
   * Asserts rate limit for a category and identifier.
   * Throws RateLimitError (429) if exceeded.
   */
  async check(category: RateLimitCategory, identifier: string): Promise<void> {
    const rule = RATE_LIMIT_CONFIG[category];
    if (!rule) return;

    const key = `rl:${category}:${identifier}`;
    const result = await this.store.increment(key, rule.windowMs, rule.max);

    if (!result.allowed) {
      throw new RateLimitError(result.retryAfterSeconds);
    }
  }
}

export const rateLimiter = new RateLimiter();
