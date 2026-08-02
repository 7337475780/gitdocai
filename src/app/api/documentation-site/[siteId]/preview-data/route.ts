import { NextRequest, NextResponse } from 'next/server';
import { siteGenerator } from '@/lib/documentation-site/site-generator';
import { SiteError } from '@/lib/documentation-site/site-errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ siteId: string }> }
) {
  try {
    const { siteId } = await params;
    const payload = await siteGenerator.getSitePayload(siteId);

    return NextResponse.json({
      success: true,
      data: payload,
    });
  } catch (error: any) {
    if (error instanceof SiteError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    console.error('Preview data route error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'DOCUMENT_SITE_PREVIEW_FAILED', message: 'Failed to retrieve site preview data.' } },
      { status: 500 }
    );
  }
}
