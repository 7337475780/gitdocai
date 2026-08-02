export enum DocumentationSiteStatus {
  DRAFT = 'DRAFT',
  GENERATING = 'GENERATING',
  READY = 'READY',
  PUBLISHING = 'PUBLISHING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

export enum DocumentationPublishStatus {
  PENDING = 'PENDING',
  BUILDING = 'BUILDING',
  DEPLOYING = 'DEPLOYING',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
}

export interface SiteConfiguration {
  siteName: string;
  siteDescription?: string;
  defaultTheme: 'SYSTEM' | 'LIGHT' | 'DARK';
  showTableOfContents: boolean;
  showSearch: boolean;
  showAttribution: boolean;
}

export interface SiteNavigationItem {
  id: string;
  documentId: string;
  documentType: string;
  title: string;
  slug: string;
  order: number;
}

export interface SearchIndexEntry {
  documentId: string;
  documentType: string;
  slug: string;
  title: string;
  heading?: string;
  headingId?: string;
  snippet: string;
}

export interface SiteManifest {
  version: string;
  siteName: string;
  siteDescription?: string;
  generatedAt: string;
  configuration: SiteConfiguration;
  documents: Array<{
    documentId: string;
    documentType: string;
    fileName: string;
    slug: string;
    title: string;
    contentHash: string;
    versionId?: string;
  }>;
  searchIndexVersion: string;
}

export interface SitePageData {
  slug: string;
  documentId: string;
  documentType: string;
  title: string;
  markdown: string;
  htmlContent: string;
  headings: Array<{ id: string; text: string; level: number }>;
  updatedAt: string;
}

export interface DocumentationSitePayload {
  siteId: string;
  repositoryAnalysisId: string;
  status: DocumentationSiteStatus;
  siteName: string;
  slug?: string;
  configuration: SiteConfiguration;
  manifest: SiteManifest;
  pages: Record<string, SitePageData>;
  navigation: SiteNavigationItem[];
  searchIndex: SearchIndexEntry[];
}
