import crypto from 'crypto';
import prisma from '../database/prisma';
import { DocumentationPublishStatus, DocumentationSiteStatus } from '../documentation-site/site-types';
import { PublishingError } from './publisher-errors';
import { siteGenerator } from '../documentation-site/site-generator';
import { publisherRegistry } from './publisher-registry';
import { freshnessService } from '../documentation-freshness/freshness-service';
import { ActivityService } from '../documentation-intelligence/activity-service';

export const publishingService = {
  async publishSite(repositoryAnalysisId: string) {
    // 1. Generate latest site payload
    const payload = await siteGenerator.generateSite(repositoryAnalysisId);

    // 2. Fetch quality & freshness metrics for warnings
    const docs = await prisma.documentation.findMany({
      where: { repositoryAnalysisId },
    });

    const qualityWarnings: Array<{ documentId: string; documentType: string; score: number }> = [];
    for (const doc of docs) {
      if ((doc.qualityScore ?? 100) < 60) {
        qualityWarnings.push({
          documentId: doc.id,
          documentType: (doc.metadata as any)?.type || 'README',
          score: doc.qualityScore || 0,
        });
      }
    }

    const freshnessSummary = await freshnessService.getFreshnessSummary(repositoryAnalysisId);
    const freshnessWarnings = freshnessSummary.documents.filter(
      d => d.status === 'REVIEW_RECOMMENDED' || d.status === 'OUTDATED'
    );

    // 3. Select active publisher
    const publisher = publisherRegistry.getPublisher();

    // 4. Create DocumentationSitePublish record
    const publishRecord = await prisma.documentationSitePublish.create({
      data: {
        documentationSiteId: payload.siteId,
        status: DocumentationPublishStatus.BUILDING,
        manifest: payload.manifest as any,
      },
    });

    try {
      // Update site status to PUBLISHING
      await prisma.documentationSite.update({
        where: { id: payload.siteId },
        data: { status: DocumentationSiteStatus.PUBLISHING },
      });

      // 5. Execute publish
      const result = await publisher.publish({
        siteId: payload.siteId,
        siteName: payload.siteName,
        manifest: payload.manifest,
        pages: payload.pages,
        navigation: payload.navigation,
        searchIndex: payload.searchIndex,
      });

      const now = new Date();

      // 6. Update publish record
      const updatedPublishRecord = await prisma.documentationSitePublish.update({
        where: { id: publishRecord.id },
        data: {
          status: result.status,
          deploymentId: result.deploymentId,
          deploymentUrl: result.deploymentUrl,
          completedAt: now,
        },
      });

      // 7. Update site record
      const updatedSite = await prisma.documentationSite.update({
        where: { id: payload.siteId },
        data: {
          status: DocumentationSiteStatus.PUBLISHED,
          publishedAt: now,
          lastPublishedAt: now,
          slug: result.deploymentUrl,
        },
      });

      // 8. Log activity
      const totalPublishes = await prisma.documentationSitePublish.count({
        where: {
          documentationSiteId: payload.siteId,
          status: 'PUBLISHED',
        },
      });
      const activityType = totalPublishes > 1 ? 'SITE_REPUBLISHED' : 'SITE_PUBLISHED';
      try {
        await ActivityService.logActivity({
          repositoryAnalysisId,
          type: activityType,
          summary: activityType === 'SITE_PUBLISHED'
            ? `Published documentation site to ${result.deploymentUrl}`
            : `Republished documentation site to ${result.deploymentUrl}`,
          metadata: { deploymentUrl: result.deploymentUrl, publishId: updatedPublishRecord.id },
        });
      } catch (activityErr) {
        console.error('Failed to log site publish activity:', activityErr);
      }

      return {
        publishId: updatedPublishRecord.id,
        siteId: updatedSite.id,
        deploymentUrl: result.deploymentUrl,
        status: result.status,
        publishedAt: now.toISOString(),
        qualityWarnings,
        freshnessWarnings,
      };
    } catch (e: any) {
      await prisma.documentationSitePublish.update({
        where: { id: publishRecord.id },
        data: {
          status: DocumentationPublishStatus.FAILED,
          errorCode: e?.code || 'DOCUMENT_SITE_PUBLISH_FAILED',
          completedAt: new Date(),
        },
      });

      await prisma.documentationSite.update({
        where: { id: payload.siteId },
        data: { status: DocumentationSiteStatus.FAILED },
      });

      if (e instanceof PublishingError) throw e;
      throw new PublishingError('DOCUMENT_SITE_PUBLISH_FAILED', e?.message || 'Failed to publish documentation site', 500);
    }
  },

  async getPublishHistory(repositoryAnalysisId: string) {
    const site = await prisma.documentationSite.findUnique({
      where: { repositoryAnalysisId },
      include: {
        publishes: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!site) return [];
    return site.publishes.map(p => ({
      id: p.id,
      status: p.status,
      deploymentUrl: p.deploymentUrl,
      deploymentId: p.deploymentId,
      createdAt: p.createdAt.toISOString(),
      completedAt: p.completedAt?.toISOString() || null,
      errorCode: p.errorCode,
    }));
  },

  async detectPublishChanges(repositoryAnalysisId: string) {
    const site = await prisma.documentationSite.findUnique({
      where: { repositoryAnalysisId },
      include: {
        publishes: {
          where: { status: DocumentationPublishStatus.PUBLISHED },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!site || site.publishes.length === 0) {
      return { isBehind: false, changedDocuments: [] };
    }

    const lastPublish = site.publishes[0];
    const lastManifest = lastPublish.manifest as any;
    const lastDocEntries = (lastManifest?.documents as any[]) || [];

    const currentDocs = await prisma.documentation.findMany({
      where: { repositoryAnalysisId },
    });

    const changedDocuments: string[] = [];

    for (const doc of currentDocs) {
      const docType = (doc.metadata as any)?.type || 'README';
      const prevEntry = lastDocEntries.find(d => d.documentType === docType);

      if (!prevEntry) {
        changedDocuments.push(`${docType} added`);
      } else {
        const currentHash = crypto.createHash('sha256').update(doc.markdown).digest('hex');
        if (prevEntry.contentHash !== currentHash) {
          changedDocuments.push(`${docType} updated`);
        }
      }
    }

    return {
      isBehind: changedDocuments.length > 0,
      changedDocuments,
      lastPublishedAt: lastPublish.createdAt.toISOString(),
    };
  }
};
