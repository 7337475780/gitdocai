import { NextRequest, NextResponse } from 'next/server';
import { VersionService } from '@/lib/documentation-versions/version-service';
import { VERSION_ERRORS } from '@/lib/documentation-versions/version-errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string; versionId: string }> }
) {
  try {
    const { documentId, versionId } = await params;
    const body = await request.json().catch(() => ({}));

    const result = await VersionService.restoreVersion({
      documentId,
      versionId,
      expectedUpdatedAt: body.expectedUpdatedAt,
      expectedContentHash: body.expectedContentHash
    });

    return NextResponse.json({
      success: true,
      data: {
        document: {
          documentId: result.document.id,
          markdown: result.document.markdown,
          qualityScore: result.document.qualityScore,
          updatedAt: result.document.updatedAt.toISOString()
        },
        version: {
          versionId: result.version.id,
          versionNumber: result.version.versionNumber,
          sourceType: result.version.sourceType,
          sourceLabel: result.version.sourceLabel
        }
      }
    });
  } catch (error: any) {
    console.error('POST /api/documentation/[documentId]/versions/[versionId]/restore error:', error);
    
    if (error.message === 'DOCUMENT_NOT_FOUND') {
      return NextResponse.json({
        success: false,
        error: VERSION_ERRORS.DOCUMENT_NOT_FOUND
      }, { status: VERSION_ERRORS.DOCUMENT_NOT_FOUND.status });
    }
    
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
    
    if (error.message === 'DOCUMENT_CHANGED_SINCE_VERSION_VIEW') {
      return NextResponse.json({
        success: false,
        error: VERSION_ERRORS.DOCUMENT_CHANGED_SINCE_VERSION_VIEW
      }, { status: VERSION_ERRORS.DOCUMENT_CHANGED_SINCE_VERSION_VIEW.status });
    }

    if (error.message === 'VERSION_ALREADY_CURRENT') {
      return NextResponse.json({
        success: false,
        error: VERSION_ERRORS.VERSION_ALREADY_CURRENT
      }, { status: VERSION_ERRORS.VERSION_ALREADY_CURRENT.status });
    }

    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred during restore.' } },
      { status: 500 }
    );
  }
}
