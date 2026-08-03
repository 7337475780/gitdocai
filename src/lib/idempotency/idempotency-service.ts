import crypto from 'crypto';
import { prisma } from '../database/prisma';
import { IdempotencyKeyConflictError, RequestInProgressError } from './idempotency-errors';
import { IdempotencyCheckResult } from './idempotency-types';

export class IdempotencyService {
  /**
   * Generates a deterministic SHA256 fingerprint for request payload.
   */
  static generateFingerprint(payload: any): string {
    const jsonString = JSON.stringify(payload || {});
    return crypto.createHash('sha256').update(jsonString).digest('hex');
  }

  /**
   * Acquire or verify an idempotency lock for an operation.
   */
  static async acquire(params: {
    userId: string;
    key: string;
    operation: string;
    payload?: any;
    ttlMs?: number;
  }): Promise<IdempotencyCheckResult> {
    const { userId, key, operation, payload, ttlMs = 24 * 60 * 60 * 1000 } = params;
    const fingerprint = this.generateFingerprint(payload);
    const expiresAt = new Date(Date.now() + ttlMs);

    const existing = await prisma.idempotencyRecord.findUnique({
      where: {
        userId_key_operation: {
          userId,
          key,
          operation,
        },
      },
    });

    if (existing) {
      // Compare request fingerprint
      if (existing.requestFingerprint !== fingerprint) {
        throw new IdempotencyKeyConflictError();
      }

      if (existing.status === 'COMPLETED') {
        return {
          isDuplicate: true,
          status: 'COMPLETED',
          responseStatus: existing.responseStatus,
          responseBody: existing.responseBody,
        };
      }

      if (existing.status === 'PROCESSING') {
        // If processing and expired, allow retry
        if (existing.expiresAt < new Date()) {
          await prisma.idempotencyRecord.delete({ where: { id: existing.id } });
        } else {
          throw new RequestInProgressError();
        }
      }
    }

    // Create atomic processing record
    try {
      await prisma.idempotencyRecord.create({
        data: {
          userId,
          key,
          operation,
          requestFingerprint: fingerprint,
          status: 'PROCESSING',
          expiresAt,
        },
      });

      return {
        isDuplicate: false,
        status: 'PROCESSING',
      };
    } catch (e: any) {
      // Handle race condition
      if (e?.code === 'P2002') {
        throw new RequestInProgressError();
      }
      throw e;
    }
  }

  /**
   * Mark an idempotency operation as successfully completed with stored safe response.
   */
  static async complete(params: {
    userId: string;
    key: string;
    operation: string;
    responseStatus: number;
    responseBody: any;
  }): Promise<void> {
    const { userId, key, operation, responseStatus, responseBody } = params;
    const sanitizedBody = this.sanitizeResponseBody(responseBody);

    await prisma.idempotencyRecord.update({
      where: {
        userId_key_operation: {
          userId,
          key,
          operation,
        },
      },
      data: {
        status: 'COMPLETED',
        responseStatus,
        responseBody: sanitizedBody,
        completedAt: new Date(),
      },
    }).catch(() => {
      // Ignore update if record expired or deleted
    });
  }

  /**
   * Remove sensitive metadata or massive 100kb markdown strings before storing response.
   */
  private static sanitizeResponseBody(body: any): any {
    if (!body || typeof body !== 'object') return body;
    const safe: Record<string, any> = {};
    const forbidden = ['token', 'secret', 'key', 'password', 'raw', 'auth'];

    for (const [k, v] of Object.entries(body)) {
      const lower = k.toLowerCase();
      if (forbidden.some(f => lower.includes(f))) continue;
      if (typeof v === 'string' && v.length > 2000) {
        safe[k] = v.substring(0, 2000) + '...[truncated]';
      } else {
        safe[k] = v;
      }
    }
    return safe;
  }
}
