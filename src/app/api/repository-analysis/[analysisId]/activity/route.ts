import { NextResponse } from 'next/server';
import { ActivityService } from '@/lib/documentation-intelligence/activity-service';
import { DocumentationIntelligenceError } from '@/lib/documentation-intelligence/intelligence-errors';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;
    const url = new URL(req.url);

    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);
    const documentId = url.searchParams.get('documentId') || undefined;
    const type = url.searchParams.get('type') || undefined;

    const data = await ActivityService.getPaginatedActivities({
      repositoryAnalysisId: analysisId,
      page,
      limit,
      documentId,
      type,
    });

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

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTELLIGENCE_ACTIVITY_FAILED',
          message: 'Unable to fetch recent documentation activity.',
        },
      },
      { status: 500 }
    );
  }
}
