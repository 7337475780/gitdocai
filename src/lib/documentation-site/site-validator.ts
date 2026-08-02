import { DocumentationSitePayload } from './site-types';
import { SiteError } from './site-errors';

export const siteValidator = {
  validate(payload: DocumentationSitePayload): void {
    if (!payload.siteId) {
      throw new SiteError('DOCUMENT_SITE_VALIDATION_FAILED', 'Site ID is missing', 400);
    }
    if (!payload.siteName || payload.siteName.trim().length === 0) {
      throw new SiteError('DOCUMENT_SITE_VALIDATION_FAILED', 'Site name cannot be empty', 400);
    }
    if (!payload.pages || Object.keys(payload.pages).length === 0) {
      throw new SiteError('DOCUMENT_SITE_VALIDATION_FAILED', 'No generated pages found in site representation', 400);
    }
    if (!payload.navigation || payload.navigation.length === 0) {
      throw new SiteError('DOCUMENT_SITE_VALIDATION_FAILED', 'Navigation list is empty', 400);
    }
  }
};
