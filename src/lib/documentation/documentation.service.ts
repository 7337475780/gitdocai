import { prisma } from '../database/prisma';

export const documentationService = {
  async getDocumentById(id: string) {
    return await prisma.documentation.findUnique({
      where: { id },
    });
  },

  async createDocument(data: {
    repositoryAnalysisId: string;
    markdown: string;
    sections: any;
    metadata: any;
    qualityScore: number;
    qualityData?: any;
    qualityEvaluatedAt?: Date;
    generatedProvider: string;
    generatedModel: string;
    generationTimeMs: number;
    attemptCount: number;
  }) {
    const doc = await prisma.documentation.create({
      data: {
        repositoryAnalysisId: data.repositoryAnalysisId,
        markdown: data.markdown,
        sections: data.sections || [],
        metadata: data.metadata || {},
        qualityScore: data.qualityScore,
        qualityData: data.qualityData || null,
        qualityEvaluatedAt: data.qualityEvaluatedAt || null,
        generatedProvider: data.generatedProvider,
        generatedModel: data.generatedModel,
        generationTimeMs: data.generationTimeMs,
        attemptCount: data.attemptCount,
      }
    });
    return doc.id;
  },

  async updateDocument(id: string, data: {
    markdown?: string;
    sections?: any;
    metadata?: any;
    qualityScore?: number;
    qualityData?: any;
    qualityEvaluatedAt?: Date;
  }) {
    return await prisma.documentation.update({
      where: { id },
      data: {
        ...(data.markdown !== undefined && { markdown: data.markdown }),
        ...(data.sections !== undefined && { sections: data.sections }),
        ...(data.metadata !== undefined && { metadata: data.metadata }),
        ...(data.qualityScore !== undefined && { qualityScore: data.qualityScore }),
        ...(data.qualityData !== undefined && { qualityData: data.qualityData }),
        ...(data.qualityEvaluatedAt !== undefined && { qualityEvaluatedAt: data.qualityEvaluatedAt }),
      }
    });
  }
};
