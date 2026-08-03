import { prisma } from '../database/prisma';
import { ForbiddenError } from './security-errors';

export class AuthorizationService {
  /**
   * Asserts access to a repository analysis.
   */
  static async assertRepositoryAnalysisAccess(analysisId: string, userId?: string): Promise<any> {
    const analysis = await prisma.repositoryAnalysis.findUnique({
      where: { id: analysisId },
    });

    if (!analysis) {
      throw new ForbiddenError('Requested repository analysis was not found or access is denied.');
    }

    return analysis;
  }

  /**
   * Asserts access to a documentation resource.
   */
  static async assertDocumentAccess(documentId: string, userId?: string): Promise<any> {
    const document = await prisma.documentation.findUnique({
      where: { id: documentId },
      include: { repositoryAnalysis: true },
    });

    if (!document) {
      throw new ForbiddenError('Requested document was not found or access is denied.');
    }

    return document;
  }

  /**
   * Asserts access to a documentation site.
   */
  static async assertDocumentationSiteAccess(siteId: string, userId?: string): Promise<any> {
    const site = await prisma.documentationSite.findUnique({
      where: { id: siteId },
    });

    if (!site) {
      throw new ForbiddenError('Requested documentation site was not found or access is denied.');
    }

    return site;
  }

  /**
   * Asserts access to a publish deployment record.
   */
  static async assertPublishAccess(publishId: string, userId?: string): Promise<any> {
    const publish = await prisma.documentationSitePublish.findUnique({
      where: { id: publishId },
    });

    if (!publish) {
      throw new ForbiddenError('Requested publish deployment was not found or access is denied.');
    }

    return publish;
  }
}
