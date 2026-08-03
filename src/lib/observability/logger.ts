import { Redaction } from './redaction';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  requestId?: string;
  userId?: string;
  operation?: string;
  durationMs?: number;
  status?: number;
  errorCode?: string;
  details?: any;
}

export class Logger {
  private static isProduction = process.env.NODE_ENV === 'production';

  static info(event: string, meta?: Partial<LogEntry>): void {
    this.log('info', event, meta);
  }

  static warn(event: string, meta?: Partial<LogEntry>): void {
    this.log('warn', event, meta);
  }

  static error(event: string, meta?: Partial<LogEntry>): void {
    this.log('error', event, meta);
  }

  private static log(level: LogLevel, event: string, meta?: Partial<LogEntry>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      ...Redaction.redact(meta || {}),
    };

    if (this.isProduction) {
      console.log(JSON.stringify(entry));
    } else {
      const duration = entry.durationMs ? ` (${entry.durationMs}ms)` : '';
      const reqId = entry.requestId ? ` [${entry.requestId}]` : '';
      console.log(`[${entry.level.toUpperCase()}] ${event}${reqId}${duration}`, meta?.details || '');
    }
  }
}
