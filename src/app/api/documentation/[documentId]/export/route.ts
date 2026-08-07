import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/database/prisma';
import { SiteError } from '@/lib/documentation-site/site-errors';
import { getGitHubSession } from '@/lib/github/github-session';
import { AuthorizationService } from '@/lib/security/authorization';
import { ForbiddenError } from '@/lib/security/security-errors';
import { ActivityService } from '@/lib/documentation-intelligence/activity-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const session = await getGitHubSession();
    const userLogin = session?.user?.login;

    // Enforce authorization check
    await AuthorizationService.assertDocumentAccess(documentId, userLogin);

    const doc = await prisma.documentation.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new SiteError('DOCUMENT_EXPORT_NOT_FOUND', `Document ${documentId} not found`, 404);
    }

    const docType = (doc.metadata as any)?.type || 'README';
    const fileName = (doc.metadata as any)?.fileName || `${docType.toUpperCase()}.md`;

    try {
      await ActivityService.logActivity({
        repositoryAnalysisId: doc.repositoryAnalysisId,
        documentId: doc.id,
        type: 'DOCUMENT_EXPORTED',
        summary: `Exported document ${fileName}`,
        metadata: { fileName, docType }
      });
    } catch (activityErr) {
      console.error('Failed to log document export activity:', activityErr);
    }

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
    if (error instanceof ForbiddenError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: error.message,
        }
      }, { status: 403 });
    }
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
