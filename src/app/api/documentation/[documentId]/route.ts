import { NextRequest, NextResponse } from 'next/server';
import { documentationService } from '@/lib/documentation/documentation.service';
import { MarkdownValidator } from '@/lib/documentation/markdown-validator';
import { SectionParser } from '@/lib/documentation/section-parser';
import { QualityAnalyzer } from '@/lib/documentation/quality-analyzer';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const doc = await documentationService.getDocumentById(documentId);

    if (!doc) {
      return NextResponse.json({ 
        success: false,
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'This documentation is no longer available.',
        }
      }, { status: 404 });
    }

    // Parse json fields
    const metadata = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : doc.metadata;
    const sections = typeof doc.sections === 'string' ? JSON.parse(doc.sections) : doc.sections;

    return NextResponse.json({
      success: true,
      data: {
        documentId: doc.id,
        analysisId: doc.repositoryAnalysisId,
        markdown: doc.markdown,
        sections: sections,
        metadata: metadata,
        qualityScore: doc.qualityScore,
        generation: {
          provider: doc.generatedProvider,
          model: doc.generatedModel,
          generationTimeMs: doc.generationTimeMs,
          attemptCount: doc.attemptCount
        },
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      }
    });
  } catch (error) {
    console.error('GET /api/documentation/[documentId] error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

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

    const doc = await documentationService.getDocumentById(documentId);
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
      return NextResponse.json(
        { error: err.message || 'Validation failed.' },
        { status: 400 }
      );
    }

    const sections = SectionParser.parse(cleanedMarkdown);
    const quality = QualityAnalyzer.analyze(sections);
    
    // Merge new metadata while keeping existing intact
    const existingMetadata = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : (doc.metadata || {});
    
    const newMetadata = {
      ...existingMetadata,
      wordCount: cleanedMarkdown.split(/\s+/).filter(Boolean).length,
      characterCount: cleanedMarkdown.length,
    };

    const updatedDoc = await documentationService.updateDocument(documentId, {
      markdown: cleanedMarkdown,
      sections: sections,
      qualityScore: quality.score,
      metadata: newMetadata,
    });

    if (!updatedDoc) {
      return NextResponse.json({ error: 'Failed to update document.' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        documentId: updatedDoc.id,
        markdown: updatedDoc.markdown,
        sections,
        metadata: newMetadata,
        qualityScore: updatedDoc.qualityScore
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
