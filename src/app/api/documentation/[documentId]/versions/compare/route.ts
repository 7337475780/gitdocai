import { NextRequest, NextResponse } from 'next/server';
import { VersionService } from '@/lib/documentation-versions/version-service';
import { VERSION_ERRORS } from '@/lib/documentation-versions/version-errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const url = new URL(request.url);
    const baseVersionId = url.searchParams.get('baseVersionId');
    const compareVersionId = url.searchParams.get('compareVersionId');

    if (!baseVersionId || !compareVersionId) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_PARAMETERS', message: 'baseVersionId and compareVersionId query parameters are required.' }
      }, { status: 400 });
    }

    const data = await VersionService.compareVersions({
      documentId,
      baseVersionId,
      compareVersionId
    });

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: any) {
    console.error('GET /api/documentation/[documentId]/versions/compare error:', error);
    
    if (error.message === 'DOCUMENT_VERSION_NOT_FOUND') {
      return NextResponse.json({
        success: false,
        error: VERSION_ERRORS.DOCUMENT_VERSION_NOT_FOUND
      }, { status: VERSION_ERRORS.DOCUMENT_VERSION_NOT_FOUND.status });
    }
    
    if (error.message === 'DOCUMENT_VERSION_MISMATCH') {
      return NextResponse.json({
        success: false,
        error: VERSION_ERRORS.DOCUMENT_VERSION_MISMATCH
      }, { status: VERSION_ERRORS.DOCUMENT_VERSION_MISMATCH.status });
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } },
      { status: 500 }
    );
  }
}
