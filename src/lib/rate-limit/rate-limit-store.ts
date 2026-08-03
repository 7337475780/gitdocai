export interface RateLimitStoreResult {
  allowed: boolean;
  totalHits: number;
  remaining: number;
  resetTime: Date;
  retryAfterSeconds: number;
}

export interface IRateLimitStore {
  increment(key: string, windowMs: number, maxHits: number): Promise<RateLimitStoreResult>;
}

class InMemoryRateLimitStore implements IRateLimitStore {
  private hits = new Map<string, { count: number; resetAt: number }>();

  async increment(key: string, windowMs: number, maxHits: number): Promise<RateLimitStoreResult> {
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || now > entry.resetAt) {
      const resetAt = now + windowMs;
      this.hits.set(key, { count: 1, resetAt });
      return {
        allowed: true,
        totalHits: 1,
        remaining: Math.max(0, maxHits - 1),
        resetTime: new Date(resetAt),
        retryAfterSeconds: 0,
      };
    }

    entry.count++;
    const allowed = entry.count <= maxHits;
    const remaining = Math.max(0, maxHits - entry.count);
    const retryAfterSeconds = allowed ? 0 : Math.ceil((entry.resetAt - now) / 1000);

    return {
      allowed,
      totalHits: entry.count,
      remaining,
      resetTime: new Date(entry.resetAt),
      retryAfterSeconds,
    };
  }
}

export const defaultRateLimitStore: IRateLimitStore = new InMemoryRateLimitStore();
