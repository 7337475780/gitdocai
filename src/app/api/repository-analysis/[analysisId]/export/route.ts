import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import prisma from '@/lib/database/prisma';
import { SiteError } from '@/lib/documentation-site/site-errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;
    const body = await req.json().catch(() => ({}));
    const documentIds: string[] | undefined = Array.isArray(body.documentIds) ? body.documentIds : undefined;

    const analysis = await prisma.repositoryAnalysis.findUnique({
      where: { id: analysisId },
      include: { documents: true },
    });

    if (!analysis) {
      throw new SiteError('DOCUMENT_EXPORT_NOT_FOUND', `Repository analysis ${analysisId} not found`, 404);
    }

    let targetDocs = analysis.documents;
    if (documentIds && documentIds.length > 0) {
      targetDocs = analysis.documents.filter(d => documentIds.includes(d.id));
    }

    if (targetDocs.length === 0) {
      throw new SiteError('DOCUMENT_EXPORT_INVALID_SELECTION', 'No valid documents selected for ZIP export.', 400);
    }

    // Limit check: max 50 documents, max 20MB total content
    if (targetDocs.length > 50) {
      throw new SiteError('DOCUMENT_EXPORT_LIMIT_EXCEEDED', 'Export exceeds maximum allowed document count (50).', 400);
    }

    const zip = new JSZip();
    const usedNames = new Set<string>();

    for (const doc of targetDocs) {
      const docType = (doc.metadata as any)?.type || 'README';
      let fileName = (doc.metadata as any)?.fileName || `${docType.toUpperCase()}.md`;

      // Sanitize file path against path traversal
      fileName = fileName.replace(/\.\./g, '').replace(/[\/\\]/g, '_').replace(/^_+/, '');
      if (!fileName.endsWith('.md')) fileName += '.md';

      if (usedNames.has(fileName)) {
        fileName = `${docType.toLowerCase()}-${doc.id.substring(0, 4)}.md`;
      }
      usedNames.add(fileName);

      zip.file(fileName, doc.markdown);
    }

    const zipBuffer = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
    const repoName = analysis.repositoryName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const zipFileName = `${repoName}-documentation.zip`;

    return new NextResponse(zipBuffer as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
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
    console.error('ZIP export route error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'DOCUMENT_EXPORT_ZIP_FAILED', message: 'Failed to generate documentation ZIP archive.' } },
      { status: 500 }
    );
  }
}
