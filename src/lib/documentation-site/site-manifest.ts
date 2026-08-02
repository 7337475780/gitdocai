import { createHash } from 'crypto';
import { SiteManifest, SiteConfiguration } from './site-types';

export const siteManifest = {
  calculateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  },

  createManifest(
    siteName: string,
    siteDescription: string | undefined,
    configuration: SiteConfiguration,
    documents: Array<{
      id: string;
      metadata: any;
      markdown: string;
    }>
  ): SiteManifest {
    const docEntries = documents.map(doc => {
      const docType = (doc.metadata as any)?.type || 'README';
      const fileName = (doc.metadata as any)?.fileName || `${docType}.md`;
      const slug = docType.toLowerCase();
      const contentHash = this.calculateContentHash(doc.markdown);

      return {
        documentId: doc.id,
        documentType: docType,
        fileName,
        slug,
        title: docType,
        contentHash,
      };
    });

    return {
      version: '1.0.0',
      siteName,
      siteDescription,
      generatedAt: new Date().toISOString(),
      configuration,
      documents: docEntries,
      searchIndexVersion: this.calculateContentHash(JSON.stringify(docEntries)),
    };
  }
};
