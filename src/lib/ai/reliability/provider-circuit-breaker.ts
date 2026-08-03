export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastStateChange: number = Date.now();
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;

  constructor(failureThreshold = 3, resetTimeoutMs = 60000) {
    this.failureThreshold = failureThreshold;
    this.resetTimeoutMs = resetTimeoutMs;
  }

  public canExecute(): boolean {
    const now = Date.now();
    if (this.state === 'OPEN') {
      if (now - this.lastStateChange > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.lastStateChange = now;
        return true;
      }
      return false;
    }
    return true;
  }

  public recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failureCount = 0;
      this.lastStateChange = Date.now();
    }
  }

  public recordFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.lastStateChange = Date.now();
    }
  }

  public reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastStateChange = Date.now();
  }

  public getState(): CircuitState {
    return this.state;
  }
}

class CircuitBreakerRegistry {
  private breakers = new Map<string, CircuitBreaker>();

  public getBreaker(providerName: string): CircuitBreaker {
    if (!this.breakers.has(providerName)) {
      this.breakers.set(providerName, new CircuitBreaker());
    }
    return this.breakers.get(providerName)!;
  }

  public resetAll(): void {
    this.breakers.clear();
  }
}

export const circuitBreakerRegistry = new CircuitBreakerRegistry();

