export class EnvironmentValidationError extends Error {
  public readonly code: string;
  public readonly errors: string[];

  constructor(errors: string[]) {
    super(`Environment validation failed:\n${errors.map(e => ` - ${e}`).join('\n')}`);
    this.name = 'EnvironmentValidationError';
    this.code = 'INVALID_ENVIRONMENT';
    this.errors = errors;
  }
}
