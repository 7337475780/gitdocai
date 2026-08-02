import prisma from '../database/prisma';
import { SiteError } from './site-errors';
import { DocumentationSitePayload, SiteConfiguration, SitePageData } from './site-types';
import { markdownRenderer } from './markdown-renderer';
import { siteNavigation } from './site-navigation';
import { siteSearchIndex } from './site-search-index';
import { siteManifest } from './site-manifest';
import { siteValidator } from './site-validator';

export const siteGenerator = {
  async generateSite(
    repositoryAnalysisId: string,
    customConfig?: Partial<SiteConfiguration>
  ): Promise<DocumentationSitePayload> {
    const analysis = await prisma.repositoryAnalysis.findUnique({
      where: { id: repositoryAnalysisId },
      include: {
        documents: true,
        site: true,
      },
    });

    if (!analysis) {
      throw new SiteError('DOCUMENT_SITE_NOT_FOUND', `Repository analysis ${repositoryAnalysisId} not found`, 404);
    }

    if (analysis.documents.length === 0) {
      throw new SiteError('DOCUMENT_SITE_GENERATION_FAILED', 'No generated documentation found for this repository analysis', 400);
    }

    const defaultConfig: SiteConfiguration = {
      siteName: `${analysis.repositoryName} Documentation`,
      siteDescription: `Official technical documentation for ${analysis.repositoryName}`,
      defaultTheme: 'SYSTEM',
      showTableOfContents: true,
      showSearch: true,
      showAttribution: true,
    };

    const existingConfig = (analysis.site?.configuration as any) || {};
    const config: SiteConfiguration = {
      ...defaultConfig,
      ...existingConfig,
      ...customConfig,
    };

    const pages: Record<string, SitePageData> = {};
    const docHeadingsMap: Array<{
      id: string;
      metadata: any;
      markdown: string;
      headings: Array<{ id: string; text: string; level: number }>;
    }> = [];

    for (const doc of analysis.documents) {
      const docType = (doc.metadata as any)?.type || 'README';
      const slug = siteNavigation.getSlug(docType);
      const title = siteNavigation.getHumanReadableLabel(docType);

      const rendered = markdownRenderer.render(doc.markdown);

      pages[slug] = {
        slug,
        documentId: doc.id,
        documentType: docType,
        title,
        markdown: doc.markdown,
        htmlContent: rendered.htmlContent,
        headings: rendered.headings,
        updatedAt: doc.updatedAt.toISOString(),
      };

      docHeadingsMap.push({
        id: doc.id,
        metadata: doc.metadata,
        markdown: doc.markdown,
        headings: rendered.headings,
      });
    }

    const navigation = siteNavigation.buildNavigation(analysis.documents);
    const searchIndex = siteSearchIndex.buildIndex(docHeadingsMap);
    const manifest = siteManifest.createManifest(
      config.siteName,
      config.siteDescription,
      config,
      analysis.documents
    );

    let site = analysis.site;
    if (!site) {
      site = await prisma.documentationSite.create({
        data: {
          repositoryAnalysisId,
          siteName: config.siteName,
          status: 'READY',
          configuration: config as any,
          manifest: manifest as any,
          generatedAt: new Date(),
        },
      });
    } else {
      site = await prisma.documentationSite.update({
        where: { id: site.id },
        data: {
          siteName: config.siteName,
          status: 'READY',
          configuration: config as any,
          manifest: manifest as any,
          generatedAt: new Date(),
        },
      });
    }

    const payload: DocumentationSitePayload = {
      siteId: site.id,
      repositoryAnalysisId,
      status: site.status as any,
      siteName: config.siteName,
      slug: site.slug || undefined,
      configuration: config,
      manifest,
      pages,
      navigation,
      searchIndex,
    };

    siteValidator.validate(payload);

    return payload;
  },

  async getSitePayload(siteId: string): Promise<DocumentationSitePayload> {
    const site = await prisma.documentationSite.findUnique({
      where: { id: siteId },
      include: {
        repositoryAnalysis: {
          include: { documents: true },
        },
      },
    });

    if (!site) {
      throw new SiteError('DOCUMENT_SITE_NOT_FOUND', `Documentation site ${siteId} not found`, 404);
    }

    return this.generateSite(site.repositoryAnalysisId);
  }
};
