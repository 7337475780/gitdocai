import { DocumentationPublisher, DocumentationPublishInput, DocumentationPublishResult, DocumentationPublishStatusResult } from './publisher-types';
import { DocumentationPublishStatus } from '../documentation-site/site-types';
import { PublishingError } from './publisher-errors';

export class VercelPublisher implements DocumentationPublisher {
  public readonly id = 'vercel';
  public readonly name = 'Vercel Deployment Publisher';

  isConfigured(): boolean {
    return !!process.env.VERCEL_TOKEN && !!process.env.VERCEL_PROJECT_ID;
  }

  async publish(input: DocumentationPublishInput): Promise<DocumentationPublishResult> {
    if (!this.isConfigured()) {
      throw new PublishingError(
        'DOCUMENT_SITE_PUBLISHING_NOT_CONFIGURED',
        'Publishing is not configured for this deployment. Missing VERCEL_TOKEN or VERCEL_PROJECT_ID.',
        400
      );
    }

    const token = process.env.VERCEL_TOKEN;
    const projectId = process.env.VERCEL_PROJECT_ID;
    const teamId = process.env.VERCEL_TEAM_ID;

    const teamQuery = teamId ? `?teamId=${teamId}` : '';
    const url = `https://api.vercel.com/v13/deployments${teamQuery}`;

    // Prepare files for Vercel deployment payload
    const files: Array<{ file: string; data: string }> = [
      { file: 'site-manifest.json', data: JSON.stringify(input.manifest, null, 2) },
      { file: 'search-index.json', data: JSON.stringify(input.searchIndex, null, 2) },
    ];

    for (const [slug, pageData] of Object.entries<any>(input.pages)) {
      files.push({
        file: `pages/${slug}.json`,
        data: JSON.stringify(pageData, null, 2),
      });
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: input.siteName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          projectId,
          target: 'production',
          files,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new PublishingError(
          'DOCUMENT_SITE_DEPLOYMENT_FAILED',
          errorData.error?.message || `Vercel deployment failed with status ${res.status}`,
          500
        );
      }

      const data = await res.json();
      return {
        deploymentId: data.id || `vercel-${Date.now()}`,
        deploymentUrl: data.url ? `https://${data.url}` : `https://${input.siteName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.vercel.app`,
        status: DocumentationPublishStatus.PUBLISHED,
        publishedAt: new Date().toISOString(),
      };
    } catch (e: any) {
      if (e instanceof PublishingError) throw e;
      throw new PublishingError('DOCUMENT_SITE_DEPLOYMENT_FAILED', e?.message || 'Failed to trigger Vercel deployment', 500);
    }
  }

  async getStatus(deploymentId: string): Promise<DocumentationPublishStatusResult> {
    if (!this.isConfigured()) {
      return { deploymentId, status: DocumentationPublishStatus.FAILED, errorCode: 'NOT_CONFIGURED' };
    }

    const token = process.env.VERCEL_TOKEN;
    const teamId = process.env.VERCEL_TEAM_ID;
    const teamQuery = teamId ? `?teamId=${teamId}` : '';

    try {
      const res = await fetch(`https://api.vercel.com/v13/deployments/${deploymentId}${teamQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        return { deploymentId, status: DocumentationPublishStatus.FAILED };
      }

      const data = await res.json();
      const state = data.readyState;
      let status = DocumentationPublishStatus.PENDING;

      if (state === 'READY') status = DocumentationPublishStatus.PUBLISHED;
      else if (state === 'BUILDING') status = DocumentationPublishStatus.BUILDING;
      else if (state === 'ERROR' || state === 'CANCELED') status = DocumentationPublishStatus.FAILED;

      return {
        deploymentId,
        status,
        deploymentUrl: data.url ? `https://${data.url}` : undefined,
      };
    } catch {
      return { deploymentId, status: DocumentationPublishStatus.FAILED };
    }
  }
}
