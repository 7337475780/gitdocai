import { SiteErrorCode, SiteError } from '../documentation-site/site-errors';

export class PublishingError extends SiteError {
  constructor(code: SiteErrorCode, message: string, statusCode: number = 400) {
    super(code, message, statusCode);
    this.name = 'PublishingError';
  }
}
