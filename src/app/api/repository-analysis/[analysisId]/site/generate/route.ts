import { NextRequest, NextResponse } from 'next/server';
import { siteGenerator } from '@/lib/documentation-site/site-generator';
import { SiteError } from '@/lib/documentation-site/site-errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;
    const body = await req.json().catch(() => ({}));
    const configuration = body.configuration;

    const payload = await siteGenerator.generateSite(analysisId, configuration);

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
    console.error('Site generate route error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'DOCUMENT_SITE_GENERATION_FAILED', message: 'Failed to generate documentation site.' } },
      { status: 500 }
    );
  }
}
