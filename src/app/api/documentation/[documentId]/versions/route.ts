import { NextRequest, NextResponse } from 'next/server';
import { VersionService } from '@/lib/documentation-versions/version-service';
import { VERSION_ERRORS } from '@/lib/documentation-versions/version-errors';
import { getGitHubSession } from '@/lib/github/github-session';
import { AuthorizationService } from '@/lib/security/authorization';
import { ForbiddenError } from '@/lib/security/security-errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    
    // Simple validation of document ID (UUID/cuid helper checks)
    if (!documentId || documentId.length < 5) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_DOCUMENT_ID', message: 'The document ID is invalid.' }
      }, { status: 400 });
    }

    const session = await getGitHubSession();
    const userLogin = session?.user?.login;

    // Enforce authorization check
    await AuthorizationService.assertDocumentAccess(documentId, userLogin);

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const perPage = parseInt(url.searchParams.get('perPage') || '10', 10);

    const data = await VersionService.getVersionHistory({
      documentId,
      page: Math.max(1, page),
      perPage: Math.min(50, Math.max(1, perPage)) // Cap at 50 to prevent overflow
    });

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: error.message,
        }
      }, { status: 403 });
    }
    console.error('GET /api/documentation/[documentId]/versions error:', error);
    
    if (error.message === 'DOCUMENT_NOT_FOUND') {
      return NextResponse.json({
        success: false,
        error: VERSION_ERRORS.DOCUMENT_NOT_FOUND
      }, { status: VERSION_ERRORS.DOCUMENT_NOT_FOUND.status });
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } },
      { status: 500 }
    );
  }
}
