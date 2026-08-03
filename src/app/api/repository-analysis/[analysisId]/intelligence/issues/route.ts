import { NextResponse } from 'next/server';
import { HealthService } from '@/lib/documentation-intelligence/health-service';
import { DocumentationIntelligenceError } from '@/lib/documentation-intelligence/intelligence-errors';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;
    const url = new URL(req.url);

    const severity = url.searchParams.get('severity');
    const documentType = url.searchParams.get('documentType');
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)));

    const intelligence = await HealthService.getDocumentationIntelligence(analysisId);
    let issues = intelligence.attentionItems;

    if (severity) {
      issues = issues.filter(i => i.severity.toLowerCase() === severity.toLowerCase());
    }
    if (documentType) {
      issues = issues.filter(
        i => i.action.documentId || i.id.toLowerCase().includes(documentType.toLowerCase())
      );
    }

    const total = issues.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedIssues = issues.slice(startIndex, startIndex + limit);

    return NextResponse.json({
      success: true,
      data: {
        issues: paginatedIssues,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
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
          code: 'INTELLIGENCE_ISSUES_FAILED',
          message: 'Unable to fetch repository documentation issues.',
        },
      },
      { status: 500 }
    );
  }
}
