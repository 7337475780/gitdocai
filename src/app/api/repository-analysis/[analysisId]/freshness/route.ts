import { NextRequest, NextResponse } from 'next/server';
import { freshnessService } from '@/lib/documentation-freshness/freshness-service';
import { FreshnessError } from '@/lib/documentation-freshness/freshness-errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;
    const summary = await freshnessService.getFreshnessSummary(analysisId);

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    if (error instanceof FreshnessError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    console.error('Freshness summary route error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'FRESHNESS_SCAN_FAILED', message: 'Failed to retrieve freshness summary.' } },
      { status: 500 }
    );
  }
}
