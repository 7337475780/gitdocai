export const VERSION_ERRORS = {
  DOCUMENT_NOT_FOUND: {
    code: 'DOCUMENT_NOT_FOUND',
    message: 'The requested documentation was not found.',
    status: 404
  },
  DOCUMENT_VERSION_NOT_FOUND: {
    code: 'DOCUMENT_VERSION_NOT_FOUND',
    message: 'The requested historical version was not found.',
    status: 404
  },
  DOCUMENT_VERSION_MISMATCH: {
    code: 'DOCUMENT_VERSION_MISMATCH',
    message: 'This version does not belong to the selected document.',
    status: 400
  },
  DOCUMENT_VERSION_CREATION_FAILED: {
    code: 'DOCUMENT_VERSION_CREATION_FAILED',
    message: 'Could not create a new documentation version.',
    status: 500
  },
  DOCUMENT_VERSION_RESTORE_FAILED: {
    code: 'DOCUMENT_VERSION_RESTORE_FAILED',
    message: 'Failed to restore the selected documentation version.',
    status: 500
  },
  DOCUMENT_CHANGED_SINCE_VERSION_VIEW: {
    code: 'DOCUMENT_CHANGED_SINCE_VERSION_VIEW',
    message: 'The documentation changed while you were reviewing version history. Refresh the history and try again.',
    status: 409
  },
  VERSION_COMPARISON_FAILED: {
    code: 'VERSION_COMPARISON_FAILED',
    message: 'Failed to compare the requested versions.',
    status: 500
  },
  VERSION_ALREADY_CURRENT: {
    code: 'VERSION_ALREADY_CURRENT',
    message: 'The selected version is already the current version.',
    status: 400
  },
  VERSION_CONTENT_INVALID: {
    code: 'VERSION_CONTENT_INVALID',
    message: 'The version content is invalid.',
    status: 400
  }
} as const;

export type VersionErrorCode = keyof typeof VERSION_ERRORS;
