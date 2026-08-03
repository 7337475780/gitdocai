export class RateLimitError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number = 60, message = 'Too many requests. Please try again shortly.') {
    super(message);
    this.name = 'RateLimitError';
    this.code = 'RATE_LIMITED';
    this.statusCode = 429;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
