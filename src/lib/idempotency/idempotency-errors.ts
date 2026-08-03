export class IdempotencyError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number = 409) {
    super(message);
    this.name = 'IdempotencyError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class RequestInProgressError extends IdempotencyError {
  constructor() {
    super(
      'REQUEST_IN_PROGRESS',
      'An identical operation is currently being processed. Please wait for it to complete.',
      409
    );
  }
}

export class IdempotencyKeyConflictError extends IdempotencyError {
  constructor() {
    super(
      'IDEMPOTENCY_KEY_CONFLICT',
      'The provided Idempotency-Key was already used with a different request body or operation.',
      400
    );
  }
}
