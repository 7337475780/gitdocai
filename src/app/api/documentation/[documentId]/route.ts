import { NextRequest, NextResponse } from 'next/server';
import { documentStore } from '@/lib/storage/memory-store';
import { MarkdownValidator } from '@/lib/documentation/markdown-validator';
import { SectionParser } from '@/lib/documentation/section-parser';
import { QualityAnalyzer } from '@/lib/documentation/quality-analyzer';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const body = await request.json();

    if (!body || typeof body.markdown !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request: "markdown" string is required.' },
        { status: 400 }
      );
    }

    const doc = documentStore.getDocument(documentId);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const rawMarkdown = body.markdown;
    if (!rawMarkdown.trim()) {
      return NextResponse.json(
        { error: 'Markdown content cannot be empty.' },
        { status: 400 }
      );
    }

    let cleanedMarkdown = rawMarkdown;
    try {
      cleanedMarkdown = MarkdownValidator.validate(rawMarkdown);
    } catch (err: any) {
      // Return a 400 so the UI can show a validation warning without destroying content
      return NextResponse.json(
        { error: err.message || 'Validation failed.' },
        { status: 400 }
      );
    }

    const sections = SectionParser.parse(cleanedMarkdown);
    const quality = QualityAnalyzer.analyze(sections);

    const updatedDoc = documentStore.updateDocument(documentId, {
      markdown: cleanedMarkdown,
      sections,
      quality,
      metadata: {
        wordCount: cleanedMarkdown.split(/\s+/).filter(Boolean).length,
        characterCount: cleanedMarkdown.length,
        generationTimeMs: doc.metadata.generationTimeMs,
      }
    });

    if (!updatedDoc) {
      return NextResponse.json({ error: 'Failed to update document.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        documentId: updatedDoc.id,
        markdown: updatedDoc.markdown,
        sections: updatedDoc.sections,
        metadata: {
          wordCount: updatedDoc.metadata.wordCount,
          characterCount: updatedDoc.metadata.characterCount,
          qualityScore: updatedDoc.quality.score
        }
      }
    });

  } catch (error: any) {
    console.error('PATCH /api/documentation/[documentId] error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred while saving.' },
      { status: 500 }
    );
  }
}
