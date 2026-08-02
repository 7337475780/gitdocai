import { SiteNavigationItem } from './site-types';

export const siteNavigation = {
  getHumanReadableLabel(documentType: string): string {
    switch (documentType.toUpperCase()) {
      case 'README':
        return 'README';
      case 'SETUP':
        return 'Setup';
      case 'ARCHITECTURE':
        return 'Architecture';
      case 'API':
        return 'API Reference';
      case 'CONTRIBUTING':
        return 'Contributing';
      default:
        return documentType;
    }
  },

  getSlug(documentType: string): string {
    const upper = documentType.toUpperCase();
    if (upper === 'README') return 'readme';
    return upper.toLowerCase();
  },

  buildNavigation(documents: Array<{ id: string; metadata: any }>): SiteNavigationItem[] {
    const orderMap: Record<string, number> = {
      README: 1,
      SETUP: 2,
      ARCHITECTURE: 3,
      API: 4,
      CONTRIBUTING: 5,
    };

    const navItems: SiteNavigationItem[] = documents.map(doc => {
      const docType = (doc.metadata as any)?.type || 'README';
      const order = orderMap[docType.toUpperCase()] || 99;
      return {
        id: doc.id,
        documentId: doc.id,
        documentType: docType,
        title: this.getHumanReadableLabel(docType),
        slug: this.getSlug(docType),
        order,
      };
    });

    return navItems.sort((a, b) => a.order - b.order);
  }
};
