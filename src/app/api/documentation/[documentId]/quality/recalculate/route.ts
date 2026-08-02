import { NextRequest, NextResponse } from 'next/server';
import { QualityService } from '@/lib/documentation-quality/quality-service';
import { QualityError } from '@/lib/documentation-quality/quality-errors';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;

    if (!documentId) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Document ID is required.' }
      }, { status: 400 });
    }

    const quality = await QualityService.recalculate(documentId);

    return NextResponse.json({
      success: true,
      data: quality
    });
  } catch (error: any) {
    if (error instanceof QualityError) {
      return NextResponse.json({
        success: false,
        error: { code: error.code, message: error.message }
      }, { status: error.statusCode });
    }
    console.error('POST /api/documentation/[documentId]/quality/recalculate error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred.' }
    }, { status: 500 });
  }
}
