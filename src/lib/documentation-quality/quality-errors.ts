export const QUALITY_ERROR_MESSAGES: Record<string, string> = {
  DOCUMENT_NOT_FOUND: 'The documentation is no longer available.',
  QUALITY_EVALUATION_FAILED: 'Failed to evaluate documentation quality. Please try again.',
  QUALITY_RESULT_INVALID: 'The retrieved quality report is invalid.',
  QUALITY_ISSUE_NOT_FOUND: 'The requested quality issue could not be found.',
  QUALITY_ISSUE_NO_LONGER_APPLICABLE: 'This suggestion is no longer applicable to your current README.',
  IMPROVEMENT_GENERATION_FAILED: 'We could not generate an improvement suggestion. Please try again.',
  IMPROVEMENT_PROPOSAL_NOT_FOUND: 'The requested improvement proposal was not found.',
  IMPROVEMENT_PROPOSAL_EXPIRED: 'This suggestion has expired. Please generate a new one.',
  DOCUMENT_CHANGED_SINCE_PROPOSAL: 'The documentation changed after this suggestion was created. Generate a new suggestion before applying it.',
  QUALITY_RECALCULATION_IN_PROGRESS: 'Quality recalculation is already in progress.',
  INVALID_REQUEST: 'Invalid request parameters.',
  UNKNOWN_ERROR: 'An unexpected error occurred. Please try again.',
};

export class QualityError extends Error {
  public code: string;
  public statusCode: number;

  constructor(code: string, statusCode = 500) {
    super(QUALITY_ERROR_MESSAGES[code] || QUALITY_ERROR_MESSAGES.UNKNOWN_ERROR);
    this.name = 'QualityError';
    this.code = code;
    this.statusCode = statusCode;
  }
}
