export type IdempotencyStatus = 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface IdempotencyCheckResult {
  isDuplicate: boolean;
  status: IdempotencyStatus;
  responseStatus?: number | null;
  responseBody?: any;
}
