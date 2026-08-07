import { describe, it, expect } from 'vitest';
import { EnvironmentSchema } from './config/env-schema';
import { MarkdownSanitizer } from './security/markdown-sanitizer';
import { CircuitBreaker } from './ai/reliability/provider-circuit-breaker';
import { ProviderClassification } from './ai/reliability/provider-classification';
import { Redaction } from './observability/redaction';

describe('Phase 14 Production Hardening & Reliability Tests', () => {
  // 1. Environment Validation
  describe('Environment Validation', () => {
    it('1. Validates valid environment variables', () => {
      const valid = {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
        APPLICATION_URL: 'http://localhost:3000',
        AUTH_SECRET: 'super-secret-auth-key-32-chars-long',
      };
      const parsed = EnvironmentSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('2. Rejects placeholder keys in production or development', () => {
      const invalid = {
        NODE_ENV: 'development',
        DATABASE_URL: 'postgresql://user:change-me@localhost:5432/db',
        APPLICATION_URL: 'http://localhost:3000',
        AUTH_SECRET: 'super-secret-auth-key-32-chars-long',
      };
      const parsed = EnvironmentSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('3. Requires HTTPS for APPLICATION_URL in production', () => {
      const prodHttp = {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://user:validpass@localhost:5432/db',
        APPLICATION_URL: 'http://my-domain.com',
        AUTH_SECRET: 'super-secret-auth-key-32-chars-long',
      };
      const parsed = EnvironmentSchema.safeParse(prodHttp);
      expect(parsed.success).toBe(false);
    });
  });

  // 2. Markdown Security Sanitizer
  describe('MarkdownSanitizer', () => {
    it('4. Strips script tags from Markdown content', () => {
      const input = '# Title\n<script>alert("xss")</script>\nNormal text';
      const output = MarkdownSanitizer.sanitize(input);
      expect(output).not.toContain('<script>');
      expect(output).toContain('# Title');
    });

    it('5. Disables javascript: links', () => {
      const input = '[Click Here](javascript:alert(1))';
      const output = MarkdownSanitizer.sanitize(input);
      expect(output).not.toContain('javascript:');
      expect(output).toContain('[Click Here](#)');
    });

    it('6. Strips inline event handlers (onerror, onload)', () => {
      const input = '<img src="x" onerror="alert(1)" />';
      const output = MarkdownSanitizer.sanitize(input);
      expect(output).not.toContain('onerror');
    });
  });

  // 3. AI Circuit Breaker
  describe('CircuitBreaker', () => {
    it('7. Transitions from CLOSED to OPEN after failure threshold', () => {
      const breaker = new CircuitBreaker(2, 60000);
      expect(breaker.canExecute()).toBe(true);

      breaker.recordFailure();
      expect(breaker.canExecute()).toBe(true);

      breaker.recordFailure(); // Threshold reached
      expect(breaker.canExecute()).toBe(false);
      expect(breaker.getState()).toBe('OPEN');
    });
  });

  // 4. Provider Error Classification
  describe('ProviderClassification', () => {
    it('8. Classifies rate limit and 429 errors as retryable', () => {
      const result = ProviderClassification.classify({ status: 429 });
      expect(result.type).toBe('RATE_LIMIT');
      expect(result.isRetryable).toBe(true);
    });

    it('9. Classifies authentication errors as non-retryable', () => {
      const result = ProviderClassification.classify({ status: 401, message: 'Invalid API key' });
      expect(result.type).toBe('AUTHENTICATION');
      expect(result.isRetryable).toBe(false);
    });
  });

  // 5. Secret Redaction
  describe('Redaction', () => {
    it('10. Redacts forbidden secret keys and bearer strings', () => {
      const input = {
        name: 'test',
        apiKey: 'secret-12345',
        authorization: 'Bearer token-abc',
      };
      const sanitized = Redaction.redact(input);
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.authorization).toBe('[REDACTED]');
      expect(sanitized.name).toBe('test');
    });
  });
});
