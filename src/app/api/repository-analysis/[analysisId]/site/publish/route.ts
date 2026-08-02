import { NextRequest, NextResponse } from 'next/server';
import { publishingService } from '@/lib/documentation-publishing/publisher';
import { SiteError } from '@/lib/documentation-site/site-errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;
    const result = await publishingService.publishSite(analysisId);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error instanceof SiteError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    console.error('Publish site route error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'DOCUMENT_SITE_PUBLISH_FAILED', message: 'Failed to publish documentation site.' } },
      { status: 500 }
    );
  }
}
