import { NextRequest, NextResponse } from 'next/server';
import { documentationService } from '@/lib/documentation/documentation.service';
import { MarkdownValidator } from '@/lib/documentation/markdown-validator';
import { SectionParser } from '@/lib/documentation/section-parser';
import { QualityEngine } from '@/lib/documentation-quality/quality-engine';
import { repositoryAnalysisService } from '@/lib/repository-analysis/repository-analysis.service';
import { VersionService } from '@/lib/documentation-versions/version-service';

// Global map to hold debounced snapshots per document
const snapshotTimeouts = new Map<string, NodeJS.Timeout>();

function queueDebouncedSnapshot(documentId: string) {
  if (snapshotTimeouts.has(documentId)) {
    clearTimeout(snapshotTimeouts.get(documentId)!);
  }

  const interval = parseInt(process.env.VERSION_SNAPSHOT_INTERVAL || '5000', 10);

  const timeout = setTimeout(async () => {
    snapshotTimeouts.delete(documentId);
    try {
      const doc = await documentationService.getDocumentById(documentId);
      if (doc) {
        await VersionService.createVersion({
          documentId,
          markdown: doc.markdown,
          sections: doc.sections,
          metadata: doc.metadata,
          qualityScore: doc.qualityScore,
          qualityData: doc.qualityData,
          sourceType: 'MANUAL_EDIT',
          sourceLabel: 'Manual edits'
        });
      }
    } catch (err) {
      console.error('Failed to create debounced version snapshot:', err);
    }
  }, interval);

  snapshotTimeouts.set(documentId, timeout);
}

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

    const analysisRecord = await repositoryAnalysisService.getAnalysisById(doc.repositoryAnalysisId);
    if (!analysisRecord) {
      return NextResponse.json({ error: 'Repository analysis not found.' }, { status: 404 });
    }

    const analysis = typeof analysisRecord.analysisData === 'string'
      ? JSON.parse(analysisRecord.analysisData)
      : analysisRecord.analysisData;

    const sections = SectionParser.parse(cleanedMarkdown);
    const quality = QualityEngine.evaluate(cleanedMarkdown, analysis);
    
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
      qualityScore: quality.overallScore,
      qualityData: quality as any,
      qualityEvaluatedAt: new Date(quality.evaluatedAt),
      metadata: newMetadata,
    });

    if (!updatedDoc) {
      return NextResponse.json({ error: 'Failed to update document.' }, { status: 500 });
    }

    // Schedule debounced snapshot creation
    queueDebouncedSnapshot(documentId);

    return NextResponse.json({
      success: true,
      data: {
        documentId: updatedDoc.id,
        markdown: updatedDoc.markdown,
        sections,
        metadata: newMetadata,
        qualityScore: updatedDoc.qualityScore,
        qualityData: quality
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
