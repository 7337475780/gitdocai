import { NextRequest, NextResponse } from 'next/server';
import { documentationService } from '@/lib/documentation/documentation.service';
import { AIOrchestrator } from '@/lib/ai/ai-orchestrator';
import { MarkdownValidator } from '@/lib/documentation/markdown-validator';
import { SectionParser } from '@/lib/documentation/section-parser';
import { QualityEngine } from '@/lib/documentation-quality/quality-engine';
import { repositoryAnalysisService } from '@/lib/repository-analysis/repository-analysis.service';
import { VersionService } from '@/lib/documentation-versions/version-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string; sectionId: string }> }
) {
  try {
    const { documentId, sectionId } = await params;
    
    // Parse body for optional instruction
    let instruction = '';
    try {
      const body = await request.json();
      if (body && typeof body.instruction === 'string') {
        instruction = body.instruction.trim();
      }
    } catch {
      // Body is optional
    }

    const doc = await documentationService.getDocumentById(documentId);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const sectionsArray = typeof doc.sections === 'string' ? JSON.parse(doc.sections) : doc.sections;
    const targetSection = sectionsArray.find((s: any) => s.id === sectionId);
    
    if (!targetSection) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const orchestrator = new AIOrchestrator();
    
    // Rewrite section
    const orchestrationResult = await orchestrator.generateSection(
      targetSection.title,
      targetSection.content,
      instruction
    );
    
    const newSectionContent = orchestrationResult.result.markdown;

    const newFullMarkdown = doc.markdown.replace(targetSection.content.trim(), newSectionContent.trim());
    
    // Validate
    let cleanedMarkdown = newFullMarkdown;
    try {
      cleanedMarkdown = MarkdownValidator.validate(newFullMarkdown);
    } catch {
      // ignore
    }

    const analysisRecord = await repositoryAnalysisService.getAnalysisById(doc.repositoryAnalysisId);
    if (!analysisRecord) {
      return NextResponse.json({ error: 'Repository analysis not found' }, { status: 404 });
    }

    const analysis = typeof analysisRecord.analysisData === 'string'
      ? JSON.parse(analysisRecord.analysisData)
      : analysisRecord.analysisData;

    const newSections = SectionParser.parse(cleanedMarkdown);
    const newQuality = QualityEngine.evaluate(cleanedMarkdown, analysis);

    const existingMetadata = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : (doc.metadata || {});
    const newMetadata = {
      ...existingMetadata,
      wordCount: cleanedMarkdown.split(/\s+/).filter(Boolean).length,
      characterCount: cleanedMarkdown.length,
      generationTimeMs: orchestrationResult.metadata.generationTimeMs,
    };

    const updatedDoc = await documentationService.updateDocument(documentId, {
      markdown: cleanedMarkdown,
      sections: newSections,
      qualityScore: newQuality.overallScore,
      qualityData: newQuality as any,
      qualityEvaluatedAt: new Date(newQuality.evaluatedAt),
      metadata: newMetadata,
    });

    if (!updatedDoc) {
       return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
    }

    // Create version snapshot for section regeneration
    try {
      await VersionService.createVersion({
        documentId,
        markdown: cleanedMarkdown,
        sections: newSections,
        metadata: newMetadata,
        qualityScore: newQuality.overallScore,
        qualityData: newQuality,
        sourceType: 'SECTION_REGENERATION',
        sourceLabel: `Section regenerated: ${targetSection.title}`
      });
    } catch (verErr) {
      console.error('Failed to create section regeneration version snapshot:', verErr);
    }

    return NextResponse.json({
      success: true,
      data: {
        documentId: updatedDoc.id,
        markdown: updatedDoc.markdown,
        sections: newSections,
        metadata: newMetadata,
        qualityScore: updatedDoc.qualityScore,
        qualityData: newQuality
      }
    });

  } catch (error: any) {
    console.error('POST /api/documentation/[documentId]/sections/[sectionId]/regenerate error:', error);
    return NextResponse.json({ error: 'Failed to regenerate section' }, { status: 500 });
  }
}
