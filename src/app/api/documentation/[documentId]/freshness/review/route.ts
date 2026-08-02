import { NextRequest, NextResponse } from 'next/server';
import { freshnessService } from '@/lib/documentation-freshness/freshness-service';
import { FreshnessError } from '@/lib/documentation-freshness/freshness-errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const result = await freshnessService.markDocumentAsReviewed(documentId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error instanceof FreshnessError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    console.error('Mark as reviewed route error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'FRESHNESS_REVIEW_CONFLICT', message: 'Failed to mark document as reviewed.' } },
      { status: 500 }
    );
  }
}
