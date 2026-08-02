import { NextRequest, NextResponse } from 'next/server';
import { siteGenerator } from '@/lib/documentation-site/site-generator';
import prisma from '@/lib/database/prisma';
import { SiteError } from '@/lib/documentation-site/site-errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;
    const payload = await siteGenerator.generateSite(analysisId);

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
    console.error('Site detail route error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'DOCUMENT_SITE_NOT_FOUND', message: 'Failed to retrieve site representation.' } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;
    const body = await req.json().catch(() => ({}));
    const { configuration } = body;

    if (!configuration) {
      return NextResponse.json(
        { success: false, error: { code: 'DOCUMENT_SITE_INVALID_CONFIGURATION', message: 'Configuration payload is required.' } },
        { status: 400 }
      );
    }

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
    console.error('Site patch route error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'DOCUMENT_SITE_INVALID_CONFIGURATION', message: 'Failed to update site configuration.' } },
      { status: 500 }
    );
  }
}
