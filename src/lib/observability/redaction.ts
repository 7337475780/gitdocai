const FORBIDDEN_KEYS = [
  'token',
  'secret',
  'password',
  'authorization',
  'cookie',
  'apikey',
  'databaseurl',
  'auth_secret',
  'client_secret',
];

export class Redaction {
  static redact(data: any): any {
    if (!data) return data;
    if (typeof data === 'string') {
      return this.redactString(data);
    }
    if (Array.isArray(data)) {
      return data.map(item => this.redact(item));
    }
    if (typeof data === 'object') {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        const lower = key.toLowerCase();
        if (FORBIDDEN_KEYS.some(k => lower.includes(k))) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.redact(value);
        }
      }
      return sanitized;
    }
    return data;
  }

  private static redactString(str: string): string {
    // Redact bearer tokens or database connections in string logs
    let result = str;
    result = result.replace(/postgres:\/\/[^@]+@/gi, 'postgres://[REDACTED]@');
    result = result.replace(/Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/gi, 'Bearer [REDACTED]');
    return result;
  }
}
