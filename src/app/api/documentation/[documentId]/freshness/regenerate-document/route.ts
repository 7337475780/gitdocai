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
    const action = body.action || 'preview'; // 'preview' | 'apply'

    if (action === 'preview') {
      const preview = await freshnessService.previewFullRegeneration(documentId);
      return NextResponse.json({
        success: true,
        data: preview,
      });
    }

    if (action === 'apply') {
      const { markdown, sections } = body;
      if (!markdown) {
        return NextResponse.json(
          { success: false, error: { code: 'FRESHNESS_REGENERATION_INVALID', message: 'Markdown content is required to apply full document regeneration.' } },
          { status: 400 }
        );
      }

      const result = await freshnessService.applyFullRegeneration(documentId, markdown, sections);
      return NextResponse.json({
        success: true,
        data: result,
      });
    }

    return NextResponse.json(
      { success: false, error: { code: 'FRESHNESS_REGENERATION_INVALID', message: 'Invalid action specified.' } },
      { status: 400 }
    );
  } catch (error: any) {
    if (error instanceof FreshnessError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    console.error('Full document regeneration route error:', error);
    return NextResponse.json(
      { success: false, error: { code: 'FRESHNESS_DOCUMENT_REGENERATION_FAILED', message: 'Failed to complete full document regeneration.' } },
      { status: 500 }
    );
  }
}
