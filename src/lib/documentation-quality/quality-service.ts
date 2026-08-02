import { prisma } from '../database/prisma';
import { QualityEngine } from './quality-engine';
import { DocumentationQualityResult, DocumentationQualityIssue } from './quality-types';
import { QualityError } from './quality-errors';
import { SectionParser } from '../documentation/section-parser';
import { ContextBuilder } from '../documentation/context-builder';
import { AIOrchestrator } from '../ai/ai-orchestrator';
import { MarkdownValidator } from '../documentation/markdown-validator';
import crypto from 'crypto';
import { VersionService } from '../documentation-versions/version-service';

export class QualityService {
  private static MAX_MARKDOWN_SIZE = 50000;

  private static getHash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  static async evaluate(documentId: string): Promise<DocumentationQualityResult> {
    const doc = await prisma.documentation.findUnique({
      where: { id: documentId },
      include: { repositoryAnalysis: true },
    });

    if (!doc) {
      throw new QualityError('DOCUMENT_NOT_FOUND', 404);
    }

    if (doc.markdown.length > this.MAX_MARKDOWN_SIZE) {
      throw new QualityError('QUALITY_EVALUATION_FAILED', 400);
    }

    try {
      const analysis = typeof doc.repositoryAnalysis.analysisData === 'string'
        ? JSON.parse(doc.repositoryAnalysis.analysisData)
        : doc.repositoryAnalysis.analysisData;

      const qualityResult = QualityEngine.evaluate(doc.markdown, analysis);

      // Save back to db
      await prisma.documentation.update({
        where: { id: documentId },
        data: {
          qualityScore: qualityResult.overallScore,
          qualityData: qualityResult as any,
          qualityEvaluatedAt: new Date(qualityResult.evaluatedAt),
        },
      });

      return qualityResult;
    } catch (e: any) {
      if (e instanceof QualityError) throw e;
      console.error('Quality evaluation error:', e);
      throw new QualityError('QUALITY_EVALUATION_FAILED', 500);
    }
  }

  static async getStoredQuality(documentId: string): Promise<DocumentationQualityResult> {
    const doc = await prisma.documentation.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new QualityError('DOCUMENT_NOT_FOUND', 404);
    }

    if (doc.qualityData && doc.qualityEvaluatedAt) {
      const data = typeof doc.qualityData === 'string' ? JSON.parse(doc.qualityData) : doc.qualityData;
      return data as DocumentationQualityResult;
    }

    // Evaluate on demand
    return await this.evaluate(documentId);
  }

  static async recalculate(documentId: string): Promise<DocumentationQualityResult> {
    return await this.evaluate(documentId);
  }

  static async generateImprovementProposal(
    documentId: string,
    issueId: string
  ): Promise<any> {
    const doc = await prisma.documentation.findUnique({
      where: { id: documentId },
      include: { repositoryAnalysis: true },
    });

    if (!doc) {
      throw new QualityError('DOCUMENT_NOT_FOUND', 404);
    }

    const quality = await this.getStoredQuality(documentId);
    const issue = quality.issues.find(i => i.id === issueId);
    if (!issue) {
      throw new QualityError('QUALITY_ISSUE_NOT_FOUND', 404);
    }

    // Locate the current content of the section, if it exists
    const sections = SectionParser.parse(doc.markdown);
    let targetSectionTitle = issue.targetSection || '';
    let currentContent = '';
    let matchedSection: any = null;

    if (targetSectionTitle) {
      matchedSection = sections.find(
        s => s.title.toLowerCase().includes(targetSectionTitle.toLowerCase()) || 
             targetSectionTitle.toLowerCase().includes(s.title.toLowerCase())
      );
      if (matchedSection) {
        currentContent = matchedSection.content;
        targetSectionTitle = matchedSection.title; // Align exact title
      }
    }

    const currentContentHash = this.getHash(currentContent);

    // Call orchestrator
    const analysis = typeof doc.repositoryAnalysis.analysisData === 'string'
      ? JSON.parse(doc.repositoryAnalysis.analysisData)
      : doc.repositoryAnalysis.analysisData;

    const context = ContextBuilder.build(analysis, doc.markdown);
    const orchestrator = new AIOrchestrator();

    let proposedContent = '';
    let explanation = '';

    try {
      const result = await orchestrator.generateImprovement(
        context,
        issue.title,
        issue.description,
        issue.recommendation,
        targetSectionTitle,
        currentContent
      );
      proposedContent = result.result.markdown;
      explanation = `Addressed quality issue: ${issue.title}. ${issue.recommendation}`;
    } catch (e: any) {
      console.error('Improvement generation failed:', e);
      throw new QualityError('IMPROVEMENT_GENERATION_FAILED', 500);
    }

    // Validate proposed markdown
    try {
      MarkdownValidator.validate(proposedContent);
    } catch (e) {
      // If validation fails, wrapping in H2 or fallback
      if (!proposedContent.trim().startsWith('#')) {
        proposedContent = `## ${targetSectionTitle || 'Section'}\n\n` + proposedContent;
      }
    }

    // Expire old proposals for this document + issue
    await prisma.documentationImprovementProposal.updateMany({
      where: { documentId, issueId, appliedAt: null },
      data: { expiresAt: new Date(0) }, // Force immediate expiry
    });

    // Save proposal to db
    const proposal = await prisma.documentationImprovementProposal.create({
      data: {
        documentId,
        issueId,
        targetSection: targetSectionTitle || null,
        currentContentHash,
        proposedContent,
        explanation,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    return {
      proposalId: proposal.id,
      issueId: proposal.issueId,
      targetSection: proposal.targetSection,
      currentContent,
      proposedContent: proposal.proposedContent,
      explanation: proposal.explanation,
    };
  }

  static async applyImprovementProposal(
    documentId: string,
    proposalId: string
  ): Promise<{ markdown: string; quality: DocumentationQualityResult }> {
    const proposal = await prisma.documentationImprovementProposal.findUnique({
      where: { id: proposalId },
    });

    if (!proposal || proposal.documentId !== documentId) {
      throw new QualityError('IMPROVEMENT_PROPOSAL_NOT_FOUND', 404);
    }

    if (proposal.appliedAt) {
      throw new QualityError('QUALITY_ISSUE_NO_LONGER_APPLICABLE', 400);
    }

    if (new Date() > proposal.expiresAt) {
      throw new QualityError('IMPROVEMENT_PROPOSAL_EXPIRED', 400);
    }

    const doc = await prisma.documentation.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new QualityError('DOCUMENT_NOT_FOUND', 404);
    }

    // Find target section content now to verify conflict
    const sections = SectionParser.parse(doc.markdown);
    let currentContent = '';
    let matchedSection: any = null;

    if (proposal.targetSection) {
      matchedSection = sections.find(
        s => s.title.toLowerCase().includes(proposal.targetSection!.toLowerCase()) || 
             proposal.targetSection!.toLowerCase().includes(s.title.toLowerCase())
      );
      if (matchedSection) {
        currentContent = matchedSection.content;
      }
    }

    const currentHash = this.getHash(currentContent);
    if (currentHash !== proposal.currentContentHash) {
      throw new QualityError('DOCUMENT_CHANGED_SINCE_PROPOSAL', 409);
    }

    // Apply the change
    let updatedMarkdown = doc.markdown;
    if (matchedSection) {
      // Replace the section lines. We split by \n and slice/splice
      const lines = doc.markdown.split('\n');
      const start = matchedSection.startLine;
      const end = matchedSection.endLine;
      const count = end - start + 1;
      
      lines.splice(start, count, proposal.proposedContent);
      updatedMarkdown = lines.join('\n');
    } else {
      // Append section
      updatedMarkdown = doc.markdown.trim() + '\n\n' + proposal.proposedContent.trim() + '\n';
    }

    // Validate merged markdown
    try {
      updatedMarkdown = MarkdownValidator.validate(updatedMarkdown);
    } catch (e) {
      // Keep updated as is if strict validation fails after merge, let quality flag issues
    }

    // Update Doc in PostgreSQL
    const newSections = SectionParser.parse(updatedMarkdown);
    const newMetadata = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : (doc.metadata || {});
    newMetadata.wordCount = updatedMarkdown.split(/\s+/).filter(Boolean).length;
    newMetadata.characterCount = updatedMarkdown.length;

    // Save Document
    await prisma.documentation.update({
      where: { id: documentId },
      data: {
        markdown: updatedMarkdown,
        sections: newSections as any,
        metadata: newMetadata,
      },
    });

    // Mark proposal applied
    await prisma.documentationImprovementProposal.update({
      where: { id: proposalId },
      data: { appliedAt: new Date() },
    });

    // Recalculate Quality
    const newQuality = await this.recalculate(documentId);

    // Create version snapshot for quality improvement
    try {
      await VersionService.createVersion({
        documentId,
        markdown: updatedMarkdown,
        sections: newSections,
        metadata: newMetadata,
        qualityScore: newQuality.overallScore,
        qualityData: newQuality,
        sourceType: 'QUALITY_IMPROVEMENT',
        sourceLabel: `AI quality improvement: ${proposal.targetSection || 'README section'}`
      });
    } catch (verErr) {
      console.error('Failed to create quality improvement version snapshot:', verErr);
    }

    return {
      markdown: updatedMarkdown,
      quality: newQuality,
    };
  }
}
