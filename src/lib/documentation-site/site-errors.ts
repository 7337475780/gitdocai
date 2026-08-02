export type SiteErrorCode =
  | 'DOCUMENT_EXPORT_FAILED'
  | 'DOCUMENT_EXPORT_NOT_FOUND'
  | 'DOCUMENT_EXPORT_ACCESS_DENIED'
  | 'DOCUMENT_EXPORT_INVALID_SELECTION'
  | 'DOCUMENT_EXPORT_LIMIT_EXCEEDED'
  | 'DOCUMENT_EXPORT_ZIP_FAILED'
  | 'DOCUMENT_SITE_NOT_FOUND'
  | 'DOCUMENT_SITE_GENERATION_FAILED'
  | 'DOCUMENT_SITE_VALIDATION_FAILED'
  | 'DOCUMENT_SITE_PREVIEW_FAILED'
  | 'DOCUMENT_SITE_PUBLISHING_NOT_CONFIGURED'
  | 'DOCUMENT_SITE_PUBLISH_FAILED'
  | 'DOCUMENT_SITE_DEPLOYMENT_FAILED'
  | 'DOCUMENT_SITE_STATUS_FAILED'
  | 'DOCUMENT_SITE_REPUBLISH_FAILED'
  | 'DOCUMENT_SITE_INVALID_CONFIGURATION'
  | 'DOCUMENT_SITE_UNSAVED_CHANGES'
  | 'DOCUMENT_SITE_PUBLISH_LIMIT_EXCEEDED';

export class SiteError extends Error {
  public readonly code: SiteErrorCode;
  public readonly statusCode: number;

  constructor(code: SiteErrorCode, message: string, statusCode: number = 400) {
    super(message);
    this.name = 'SiteError';
    this.code = code;
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, SiteError.prototype);
  }
}
