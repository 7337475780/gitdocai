import { NextResponse } from 'next/server';
import { z } from 'zod';
import { documentStore } from '@/lib/storage/memory-store';
import { repositoryAnalysisStore } from '@/lib/repository-analysis/analysis-store';
import { AIOrchestrator } from '@/lib/ai/ai-orchestrator';
import { ContextBuilder } from '@/lib/documentation/context-builder';
import { MarkdownValidator } from '@/lib/documentation/markdown-validator';
import { SectionParser } from '@/lib/documentation/section-parser';
import { QualityAnalyzer } from '@/lib/documentation/quality-analyzer';

const GenerateRequestSchema = z.object({
  analysisId: z.string(),
  template: z.enum(['professional', 'opensource', 'api', 'portfolio', 'library', 'minimal']).default('professional'),
  tone: z.enum(['professional', 'concise', 'technical']).default('professional'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = GenerateRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid generation options.' } }, { status: 400 });
    }

    const { analysisId, template, tone } = result.data;
    const record = repositoryAnalysisStore.get(analysisId);

    if (!record) {
      return NextResponse.json({ 
        success: false, 
        error: { 
          code: 'REPOSITORY_ANALYSIS_NOT_FOUND', 
          message: 'The repository analysis is no longer available. Please analyze the repository again.' 
        } 
      }, { status: 404 });
    }
    
    const analysis = record.analysis;

    const context = ContextBuilder.build(analysis);
    const orchestrator = new AIOrchestrator();

    const orchestrationResult = await orchestrator.generate(context, { template, tone });
    const rawMarkdown = orchestrationResult.result.markdown;

    // Validate and clean markdown
    let cleanedMarkdown: string;
    try {
      cleanedMarkdown = MarkdownValidator.validate(rawMarkdown);
    } catch (e) {
      throw new Error('DOCUMENT_VALIDATION_FAILED');
    }

    // Parse sections and pre-score
    const sections = SectionParser.parse(cleanedMarkdown);
    const quality = QualityAnalyzer.analyze(sections);

    const title = sections.find(s => s.level === 1)?.title || analysis.repositoryName;

    const documentId = crypto.randomUUID();
    const doc = {
      id: documentId,
      title,
      markdown: cleanedMarkdown,
      template,
      tone,
      sections,
      quality,
      metadata: {
        wordCount: cleanedMarkdown.split(/\s+/).filter(Boolean).length,
        characterCount: cleanedMarkdown.length,
        ...orchestrationResult.metadata
      }
    };
    
    documentStore.saveDocument(doc);

    return NextResponse.json({
      success: true,
      data: {
        id: documentId,
        markdown: cleanedMarkdown,
        sections,
        quality,
        metadata: {
          wordCount: doc.metadata.wordCount,
          characterCount: doc.metadata.characterCount,
          ...orchestrationResult.metadata
        }
      }
    });

  } catch (error: any) {
    console.error('Generation error:', error);
    
    let code = error?.code || 'AI_GENERATION_FAILED';
    let message = error?.message || 'We could not generate documentation. Please try again.';

    if (code === 'ALL_AI_PROVIDERS_FAILED') {
      message = 'Documentation generation is temporarily unavailable. Please try again later.';
    }

    return NextResponse.json({
      success: false,
      error: { code, message }
    }, { status: 500 });
  }
}
