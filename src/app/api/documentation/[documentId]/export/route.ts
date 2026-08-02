import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database/prisma';
import { SiteError } from '@/lib/documentation-site/site-errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;

    const doc = await prisma.documentation.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new SiteError('DOCUMENT_EXPORT_NOT_FOUND', `Document ${documentId} not found`, 404);
    }

    const docType = (doc.metadata as any)?.type || 'README';
    const fileName = (doc.metadata as any)?.fileName || `${docType.toUpperCase()}.md`;

    // Return pure Markdown content with attachment disposition
    return new NextResponse(doc.markdown, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: any) {
    if (error instanceof SiteError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    console.error('Individual export route error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'DOCUMENT_EXPORT_FAILED', message: 'Failed to export Markdown document.' } },
      { status: 500 }
    );
  }
}
