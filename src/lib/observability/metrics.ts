import { Logger } from './logger';

export class OperationMetrics {
  static record(operation: string, durationMs: number, success: boolean, metadata?: Record<string, any>): void {
    Logger.info(`metric:${operation}`, {
      operation,
      durationMs,
      status: success ? 200 : 500,
      details: metadata,
    });
  }
}
