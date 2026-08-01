import { prisma } from '../database/prisma';

export const repositoryAnalysisService = {
  async getAnalysisById(id: string) {
    return await prisma.repositoryAnalysis.findUnique({
      where: { id },
    });
  },

  async createAnalysis(data: {
    repositoryUrl: string;
    repositoryOwner: string;
    repositoryName: string;
    repositoryFullName: string;
    analysisData: any;
  }) {
    const analysis = await prisma.repositoryAnalysis.create({
      data: {
        repositoryUrl: data.repositoryUrl,
        repositoryOwner: data.repositoryOwner,
        repositoryName: data.repositoryName,
        repositoryFullName: data.repositoryFullName,
        analysisData: data.analysisData,
      },
    });
    return analysis.id;
  },

  async updateAnalysis(id: string, data: {
    analysisData: any;
  }) {
    return await prisma.repositoryAnalysis.update({
      where: { id },
      data: {
        analysisData: data.analysisData,
      },
    });
  },

  async requireAnalysisById(analysisId: string) {
    const analysis = await this.getAnalysisById(analysisId);
    if (!analysis) {
      const error = new Error('Repository analysis not found');
      (error as any).code = 'REPOSITORY_ANALYSIS_NOT_FOUND';
      throw error;
    }
    return analysis;
  },
};
