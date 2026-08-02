import { NextRequest, NextResponse } from 'next/server';
import { publishingService } from '@/lib/documentation-publishing/publisher';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;
    const history = await publishingService.getPublishHistory(analysisId);
    const changes = await publishingService.detectPublishChanges(analysisId);

    return NextResponse.json({
      success: true,
      data: {
        history,
        changes,
      },
    });
  } catch (error: any) {
    console.error('Publish history route error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'DOCUMENT_SITE_STATUS_FAILED', message: 'Failed to retrieve publish history.' } },
      { status: 500 }
    );
  }
}
