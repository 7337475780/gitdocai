import { NextRequest, NextResponse } from 'next/server';
import { freshnessService } from '@/lib/documentation-freshness/freshness-service';
import { FreshnessError } from '@/lib/documentation-freshness/freshness-errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const body = await req.json().catch(() => ({}));
    const sections: string[] = Array.isArray(body.sections) ? body.sections : [];
    const customInstructions: string | undefined = body.customInstructions;

    if (sections.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'FRESHNESS_SECTION_NOT_FOUND', message: 'At least one section heading must be selected for regeneration.' } },
        { status: 400 }
      );
    }

    const result = await freshnessService.regenerateAffectedSections(documentId, sections, customInstructions);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    if (error instanceof FreshnessError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    console.error('Section regeneration route error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'FRESHNESS_SECTION_REGENERATION_FAILED', message: 'Failed to regenerate selected sections.' } },
      { status: 500 }
    );
  }
}
