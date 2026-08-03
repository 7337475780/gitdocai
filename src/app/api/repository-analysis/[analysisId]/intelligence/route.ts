import { NextResponse } from 'next/server';
import { HealthService } from '@/lib/documentation-intelligence/health-service';
import { DocumentationIntelligenceError } from '@/lib/documentation-intelligence/intelligence-errors';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;
    const url = new URL(req.url);
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    const data = await HealthService.getDocumentationIntelligence(analysisId, forceRefresh);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    if (error instanceof DocumentationIntelligenceError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
        },
        { status: error.statusCode }
      );
    }

    console.error('Intelligence API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTELLIGENCE_CALCULATION_FAILED',
          message: 'Unable to load repository documentation intelligence.',
        },
      },
      { status: 500 }
    );
  }
}
