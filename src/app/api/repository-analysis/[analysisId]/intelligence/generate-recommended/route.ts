import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/database/prisma';
import { repositoryAnalysisService } from '@/lib/repository-analysis/repository-analysis.service';
import { AIOrchestrator } from '@/lib/ai/ai-orchestrator';
import { ContextBuilder } from '@/lib/documentation/context-builder';
import { MarkdownValidator } from '@/lib/documentation/markdown-validator';
import { SectionParser } from '@/lib/documentation/section-parser';
import { QualityEngine } from '@/lib/documentation-quality/quality-engine';
import { VersionService } from '@/lib/documentation-versions/version-service';
import { documentationService } from '@/lib/documentation/documentation.service';
import { ActivityService } from '@/lib/documentation-intelligence/activity-service';
import { HealthService } from '@/lib/documentation-intelligence/health-service';
import { DocumentationIntelligenceError } from '@/lib/documentation-intelligence/intelligence-errors';

const GenerateRecommendedRequestSchema = z.object({
  documentTypes: z.array(z.string()).min(1),
  template: z.enum(['professional', 'opensource', 'api', 'portfolio', 'library', 'minimal']).default('professional'),
  tone: z.enum(['professional', 'concise', 'technical']).default('professional'),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ analysisId: string }> }
) {
  try {
    const { analysisId } = await params;
    const body = await req.json();
    const parsed = GenerateRecommendedRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid recommended generation parameters.',
          },
        },
        { status: 400 }
      );
    }

    const { documentTypes, template, tone } = parsed.data;

    const analysisRecord = await repositoryAnalysisService.getAnalysisById(analysisId);
    if (!analysisRecord) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'REPOSITORY_ANALYSIS_NOT_FOUND',
            message: 'The requested repository analysis was not found.',
          },
        },
        { status: 404 }
      );
    }

    const analysis =
      typeof analysisRecord.analysisData === 'string'
        ? JSON.parse(analysisRecord.analysisData)
        : analysisRecord.analysisData;

    // Fetch existing documents to avoid duplicate creation
    const existingDocs = await prisma.documentation.findMany({
      where: { repositoryAnalysisId: analysisId },
      select: { id: true, metadata: true },
    });

    const existingTypes = new Set(
      existingDocs.map(d => ((d.metadata as any)?.type || (d.metadata as any)?.documentType || 'README').toUpperCase())
    );

    const generated: Array<{ id: string; type: string; fileName: string; title: string }> = [];
    const failed: Array<{ type: string; fileName: string; error: string }> = [];

    const orchestrator = new AIOrchestrator();

    for (const docType of documentTypes) {
      const upperType = docType.toUpperCase();
      const fileName = `${upperType}.md`;

      if (existingTypes.has(upperType)) {
        // Document already exists, skip to avoid duplicate
        const existingDoc = existingDocs.find(
          d => ((d.metadata as any)?.type || (d.metadata as any)?.documentType || '').toUpperCase() === upperType
        );
        if (existingDoc) {
          generated.push({
            id: existingDoc.id,
            type: upperType,
            fileName,
            title: (existingDoc.metadata as any)?.title || upperType,
          });
        }
        continue;
      }

      try {
        const context = ContextBuilder.build(analysis);
        const orchestrationResult = await orchestrator.generate(context, { template, tone });
        const rawMarkdown = orchestrationResult.result.markdown;

        const cleanedMarkdown = MarkdownValidator.validate(rawMarkdown);
        const sections = SectionParser.parse(cleanedMarkdown);
        const quality = QualityEngine.evaluate(cleanedMarkdown, analysis);

        const title = sections.find(s => s.level === 1)?.title || `${upperType} Documentation`;
        const metadata = {
          type: upperType,
          fileName,
          title,
          wordCount: cleanedMarkdown.split(/\s+/).filter(Boolean).length,
          characterCount: cleanedMarkdown.length,
          ...orchestrationResult.metadata,
        };

        const documentId = await documentationService.createDocument({
          repositoryAnalysisId: analysisId,
          markdown: cleanedMarkdown,
          sections,
          metadata,
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
          sections,
          metadata,
          qualityScore: quality.overallScore,
          qualityData: quality,
          sourceType: 'INITIAL_GENERATION',
          sourceLabel: `Generated ${upperType} documentation`,
        });

        // Log activity
        await ActivityService.logActivity({
          repositoryAnalysisId: analysisId,
          documentId,
          type: 'DOCUMENT_GENERATED',
          summary: `${fileName} generated (${upperType})`,
          metadata: { documentType: upperType, qualityScore: quality.overallScore },
        });

        existingTypes.add(upperType);
        generated.push({
          id: documentId,
          type: upperType,
          fileName,
          title,
        });
      } catch (err: any) {
        console.error(`Failed to generate document ${upperType}:`, err);
        failed.push({
          type: upperType,
          fileName,
          error: err?.message || 'AI generation failed for this document.',
        });
      }
    }

    HealthService.invalidateCache(analysisId);

    return NextResponse.json({
      success: true,
      data: {
        generated,
        failed,
        totalRequested: documentTypes.length,
        successCount: generated.length,
        failedCount: failed.length,
      },
    });
  } catch (error: any) {
    console.error('Generate recommended error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTELLIGENCE_GENERATE_RECOMMENDED_FAILED',
          message: error?.message || 'Failed to generate recommended documentation.',
        },
      },
      { status: 500 }
    );
  }
}
