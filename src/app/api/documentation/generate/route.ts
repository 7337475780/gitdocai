import { NextResponse } from 'next/server';
import { z } from 'zod';
import { documentationService } from '../../../../lib/documentation/documentation.service';
import { repositoryAnalysisService } from '@/lib/repository-analysis/repository-analysis.service';
import { AIOrchestrator } from '@/lib/ai/ai-orchestrator';
import { ContextBuilder } from '@/lib/documentation/context-builder';
import { MarkdownValidator } from '@/lib/documentation/markdown-validator';
import { SectionDeduplicator } from '@/lib/documentation/section-deduplicator';
import { SectionParser } from '@/lib/documentation/section-parser';
import { QualityEngine } from '@/lib/documentation-quality/quality-engine';
import { VersionService } from '@/lib/documentation-versions/version-service';
import { PathSanitizer } from '@/lib/documentation/path-sanitizer';

const GenerateRequestSchema = z.object({
  analysisId: z.string(),
  template: z.enum(['professional', 'opensource', 'api', 'portfolio', 'library', 'minimal']).default('professional'),
  tone: z.enum(['professional', 'concise', 'technical']).default('professional'),
  title: z.string().optional(),
  includeInstallation: z.boolean().optional(),
  includeUsage: z.boolean().optional(),
  includeAPI: z.boolean().optional(),
  includeContributing: z.boolean().optional(),
  detailLevel: z.enum(['concise', 'standard', 'detailed']).optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = GenerateRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ success: false, error: { code: 'INVALID_REQUEST', message: 'Invalid generation options.' } }, { status: 400 });
    }

    const {
      analysisId,
      template,
      tone,
      title,
      includeInstallation,
      includeUsage,
      includeAPI,
      includeContributing,
      detailLevel,
    } = result.data;
    const analysisRecord = await repositoryAnalysisService.getAnalysisById(analysisId);

    if (!analysisRecord) {
      return NextResponse.json({ 
        success: false, 
        error: { 
          code: 'REPOSITORY_ANALYSIS_NOT_FOUND', 
          message: 'The repository analysis is no longer available. Please analyze the repository again.' 
        } 
      }, { status: 404 });
    }
    
    // Parse analysisData safely assuming it's valid JSON
    const analysis = typeof analysisRecord.analysisData === 'string' 
      ? JSON.parse(analysisRecord.analysisData) 
      : analysisRecord.analysisData;

    const context = ContextBuilder.build(analysis);
    const orchestrator = new AIOrchestrator();

    const orchestrationResult = await orchestrator.generate(context, {
      template,
      tone,
      title,
      includeInstallation,
      includeUsage,
      includeAPI,
      includeContributing,
      detailLevel,
    });
    const rawMarkdown = orchestrationResult.result.markdown;

    // ── Step 1: Validate & clean markdown ────────────────────────────────────
    // Strips outer code fences, ensures single H1, fixes unclosed code blocks,
    // removes AI-disclaimer boilerplate.
    let validatedMarkdown: string;
    try {
      validatedMarkdown = MarkdownValidator.validate(rawMarkdown);
    } catch {
      throw new Error('DOCUMENT_VALIDATION_FAILED');
    }

    // ── Step 2: Deduplicate & reorder sections ────────────────────────────────
    // Merges duplicate ## headings, removes empty sections, enforces canonical
    // README section order. Produces a coherent single-document README.
    const deduplicatedMarkdown = SectionDeduplicator.deduplicate(validatedMarkdown);

    // ── Step 2.5: Sanitize local paths ───────────────────────────────────────
    // Final safety net: removes any Windows/Unix local filesystem paths or
    // personal usernames that leaked from source code excerpts or were
    // hallucinated by the LLM. Applied after deduplication so path patterns
    // in any section are caught.
    const cleanedMarkdown = PathSanitizer.sanitizeMarkdown(deduplicatedMarkdown);

    // ── Step 3: Parse into sections for Studio ────────────────────────────────
    const sections = SectionParser.parse(cleanedMarkdown);

    // ── Step 4: Score documentation quality ──────────────────────────────────
    const quality = QualityEngine.evaluate(cleanedMarkdown, analysis);

    const metadata = {
      wordCount: cleanedMarkdown.split(/\s+/).filter(Boolean).length,
      characterCount: cleanedMarkdown.length,
      sectionCount: sections.length,
      ...orchestrationResult.metadata
    };

    let documentId: string;
    try {
      documentId = await documentationService.createDocument({
        repositoryAnalysisId: analysisId,
        markdown: cleanedMarkdown,
        sections: sections,
        metadata: metadata,
        qualityScore: quality.overallScore,
        qualityData: quality as any,
        qualityEvaluatedAt: new Date(quality.evaluatedAt),
        generatedProvider: orchestrationResult.metadata.provider,
        generatedModel: orchestrationResult.metadata.model,
        generationTimeMs: orchestrationResult.metadata.generationTimeMs,
        attemptCount: orchestrationResult.metadata.attemptCount,
      });

      // Create initial version snapshot
      await VersionService.createVersion({
        documentId,
        markdown: cleanedMarkdown,
        sections: sections,
        metadata: metadata,
        qualityScore: quality.overallScore,
        qualityData: quality,
        sourceType: 'INITIAL_GENERATION',
        sourceLabel: 'Initial AI generation'
      });
    } catch (e) {
      console.error('Database persistence error:', e);
      return NextResponse.json({
        success: false,
        error: {
          code: 'DOCUMENT_PERSISTENCE_FAILED',
          message: 'Documentation was generated but could not be saved. Please try again.',
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: documentId,
        markdown: cleanedMarkdown,
        sections,
        quality,
        metadata
      }
    });

  } catch (error: any) {
    console.error('Generation error:', error);
    
    const code = error?.code || 'AI_GENERATION_FAILED';
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
