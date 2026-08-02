import { DocumentationPublishStatus } from '../documentation-site/site-types';

export interface DocumentationPublishInput {
  siteId: string;
  siteName: string;
  manifest: any;
  pages: Record<string, any>;
  navigation: any[];
  searchIndex: any[];
}

export interface DocumentationPublishResult {
  deploymentId: string;
  deploymentUrl: string;
  status: DocumentationPublishStatus;
  publishedAt: string;
}

export interface DocumentationPublishStatusResult {
  deploymentId: string;
  status: DocumentationPublishStatus;
  deploymentUrl?: string;
  errorCode?: string;
}

export interface DocumentationPublisher {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  publish(input: DocumentationPublishInput): Promise<DocumentationPublishResult>;
  getStatus?(deploymentId: string): Promise<DocumentationPublishStatusResult>;
}
