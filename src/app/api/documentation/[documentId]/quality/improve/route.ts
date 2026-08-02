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

    const body = await request.json();
    const issueId = body?.issueId;

    if (!issueId || typeof issueId !== 'string') {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Issue ID is required in request body.' }
      }, { status: 400 });
    }

    const proposal = await QualityService.generateImprovementProposal(documentId, issueId);

    return NextResponse.json({
      success: true,
      data: proposal
    });
  } catch (error: any) {
    if (error instanceof QualityError) {
      return NextResponse.json({
        success: false,
        error: { code: error.code, message: error.message }
      }, { status: error.statusCode });
    }
    console.error('POST /api/documentation/[documentId]/quality/improve error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred during suggestion generation.' }
    }, { status: 500 });
  }
}
