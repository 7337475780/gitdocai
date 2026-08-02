import { DocumentationPublisher, DocumentationPublishInput, DocumentationPublishResult, DocumentationPublishStatusResult } from './publisher-types';
import { DocumentationPublishStatus } from '../documentation-site/site-types';

export class MockPublisher implements DocumentationPublisher {
  public readonly id = 'mock';
  public readonly name = 'Local Mock Publisher';

  isConfigured(): boolean {
    return true;
  }

  async publish(input: DocumentationPublishInput): Promise<DocumentationPublishResult> {
    const deploymentId = `mock-dep-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const deploymentUrl = `/documentation-site/${input.siteId}/preview`;

    return {
      deploymentId,
      deploymentUrl,
      status: DocumentationPublishStatus.PUBLISHED,
      publishedAt: new Date().toISOString(),
    };
  }

  async getStatus(deploymentId: string): Promise<DocumentationPublishStatusResult> {
    return {
      deploymentId,
      status: DocumentationPublishStatus.PUBLISHED,
    };
  }
}
