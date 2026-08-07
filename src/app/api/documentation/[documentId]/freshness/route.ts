import { NextRequest, NextResponse } from 'next/server';
import { freshnessService } from '@/lib/documentation-freshness/freshness-service';
import { FreshnessError } from '@/lib/documentation-freshness/freshness-errors';
import { getGitHubSession } from '@/lib/github/github-session';
import { AuthorizationService } from '@/lib/security/authorization';
import { ForbiddenError } from '@/lib/security/security-errors';

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

    const detail = await freshnessService.getDocumentFreshnessDetail(documentId);

    return NextResponse.json({
      success: true,
      data: detail,
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
    if (error instanceof FreshnessError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    console.error('Document freshness detail route error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'FRESHNESS_IMPACT_ANALYSIS_FAILED', message: 'Failed to retrieve document freshness detail.' } },
      { status: 500 }
    );
  }
}
