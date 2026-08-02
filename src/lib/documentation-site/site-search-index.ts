import { SearchIndexEntry } from './site-types';
import { siteNavigation } from './site-navigation';

export const siteSearchIndex = {
  buildIndex(
    documents: Array<{
      id: string;
      metadata: any;
      markdown: string;
      headings?: Array<{ id: string; text: string; level: number }>;
    }>
  ): SearchIndexEntry[] {
    const entries: SearchIndexEntry[] = [];

    for (const doc of documents) {
      const docType = (doc.metadata as any)?.type || 'README';
      const slug = siteNavigation.getSlug(docType);
      const docTitle = siteNavigation.getHumanReadableLabel(docType);

      // Add document level entry
      entries.push({
        documentId: doc.id,
        documentType: docType,
        slug,
        title: docTitle,
        snippet: doc.markdown.substring(0, 180).replace(/[#*`]/g, '').trim(),
      });

      // Add heading entries
      if (doc.headings && doc.headings.length > 0) {
        for (const h of doc.headings) {
          entries.push({
            documentId: doc.id,
            documentType: docType,
            slug,
            title: docTitle,
            heading: h.text,
            headingId: h.id,
            snippet: `${docTitle} > ${h.text}`,
          });
        }
      }
    }

    return entries;
  },

  search(entries: SearchIndexEntry[], query: string): SearchIndexEntry[] {
    if (!query || query.trim().length === 0) return [];
    const q = query.toLowerCase().trim();

    return entries.filter(e => {
      const titleMatch = e.title.toLowerCase().includes(q);
      const headingMatch = e.heading ? e.heading.toLowerCase().includes(q) : false;
      const snippetMatch = e.snippet.toLowerCase().includes(q);
      return titleMatch || headingMatch || snippetMatch;
    }).slice(0, 15);
  }
};
