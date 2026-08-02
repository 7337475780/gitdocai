import { NextRequest, NextResponse } from 'next/server';
import { freshnessService } from '@/lib/documentation-freshness/freshness-service';
import { FreshnessError } from '@/lib/documentation-freshness/freshness-errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const detail = await freshnessService.getDocumentFreshnessDetail(documentId);

    return NextResponse.json({
      success: true,
      data: detail,
    });
  } catch (error: any) {
    if (error instanceof FreshnessError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    console.error('Document freshness detail route error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'FRESHNESS_IMPACT_ANALYSIS_FAILED', message: 'Failed to retrieve document freshness detail.' } },
      { status: 500 }
    );
  }
}
