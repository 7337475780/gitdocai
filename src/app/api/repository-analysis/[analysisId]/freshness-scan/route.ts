import { NextRequest, NextResponse } from 'next/server';
import { freshnessService } from '@/lib/documentation-freshness/freshness-service';
import { FreshnessError } from '@/lib/documentation-freshness/freshness-errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;
    const body = await req.json().catch(() => ({}));
    const force = !!body.force;

    const scanSummary = await freshnessService.runFreshnessScan(analysisId, force);

    return NextResponse.json({
      success: true,
      data: scanSummary,
    });
  } catch (error: any) {
    if (error instanceof FreshnessError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    console.error('Freshness scan route error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'FRESHNESS_SCAN_FAILED', message: 'Failed to complete freshness scan.' } },
      { status: 500 }
    );
  }
}
