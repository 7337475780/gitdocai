import { NextRequest, NextResponse } from 'next/server';
import { QualityService } from '@/lib/documentation-quality/quality-service';
import { QualityError } from '@/lib/documentation-quality/quality-errors';
import { prisma } from '@/lib/database/prisma';
import { ActivityService } from '@/lib/documentation-intelligence/activity-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;

    if (!documentId) {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Document ID is required.' }
      }, { status: 400 });
    }

    const body = await request.json();
    const proposalId = body?.proposalId;

    if (!proposalId || typeof proposalId !== 'string') {
      return NextResponse.json({
        success: false,
        error: { code: 'INVALID_REQUEST', message: 'Proposal ID is required in request body.' }
      }, { status: 400 });
    }

    const doc = await prisma.documentation.findUnique({
      where: { id: documentId },
    });

    const result = await QualityService.applyImprovementProposal(documentId, proposalId);

    if (doc) {
      try {
        await ActivityService.logActivity({
          repositoryAnalysisId: doc.repositoryAnalysisId,
          documentId: doc.id,
          type: 'QUALITY_EVALUATED',
          summary: `Applied quality improvement suggestion`,
          metadata: { proposalId, newScore: result.quality.overallScore }
        });
      } catch (activityErr) {
        console.error('Failed to log quality evaluation activity:', activityErr);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        markdown: result.markdown,
        quality: result.quality
      }
    });
  } catch (error: any) {
    if (error instanceof QualityError) {
      return NextResponse.json({
        success: false,
        error: { code: error.code, message: error.message }
      }, { status: error.statusCode });
    }
    console.error('POST /api/documentation/[documentId]/quality/apply error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'UNKNOWN_ERROR', message: 'An unexpected error occurred while applying the suggestion.' }
    }, { status: 500 });
  }
}
