export class SecurityError extends Error {
  public readonly code: string;
  public readonly statusCode: number;

  constructor(code: string, message: string, statusCode: number = 403) {
    super(message);
    this.name = 'SecurityError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class UnauthorizedError extends SecurityError {
  constructor(message = 'Authentication required.') {
    super('UNAUTHORIZED', message, 401);
  }
}

export class ForbiddenError extends SecurityError {
  constructor(message = 'You do not have permission to access this resource.') {
    super('FORBIDDEN', message, 403);
  }
}

export class RequestTooLargeError extends SecurityError {
  constructor(message = 'Request payload exceeds the maximum allowed size limit.') {
    super('REQUEST_TOO_LARGE', message, 413);
  }
}

export class InvalidInputError extends SecurityError {
  constructor(message = 'Invalid input parameters provided.') {
    super('INVALID_INPUT', message, 400);
  }
}
