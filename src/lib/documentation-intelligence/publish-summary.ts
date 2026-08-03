import { DocumentationPublishState, PublishingSummaryResult } from './intelligence-types';

export class PublishSummaryCalculator {
  static calculate(
    site: any,
    documents: Array<{ updatedAt: Date | string }>
  ): PublishingSummaryResult {
    if (!site || !site.publishes || site.publishes.length === 0) {
      return {
        status: DocumentationPublishState.NOT_PUBLISHED,
        userFacingLabel: 'Not Published',
        lastPublishedAt: null,
        siteUrl: null,
      };
    }

    const successfulPublishes = site.publishes
      .filter((p: any) => p.status === 'PUBLISHED' && p.deploymentUrl)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const latestPublish = site.publishes.sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    if (!successfulPublishes || successfulPublishes.length === 0) {
      if (latestPublish?.status === 'FAILED') {
        return {
          status: DocumentationPublishState.PUBLISH_FAILED,
          userFacingLabel: 'Publish Failed',
          lastPublishedAt: null,
          siteUrl: null,
        };
      } else if (latestPublish?.status === 'BUILDING' || latestPublish?.status === 'DEPLOYING' || latestPublish?.status === 'PENDING') {
        return {
          status: DocumentationPublishState.PUBLISHING,
          userFacingLabel: 'Publishing',
          lastPublishedAt: null,
          siteUrl: null,
        };
      }
      return {
        status: DocumentationPublishState.NOT_PUBLISHED,
        userFacingLabel: 'Not Published',
        lastPublishedAt: null,
        siteUrl: null,
      };
    }

    const lastPublish = successfulPublishes[0];
    const lastPublishedAt = lastPublish.completedAt || lastPublish.createdAt;
    const lastPublishTime = new Date(lastPublishedAt).getTime();

    // Check if any doc was updated after last publish
    const isDocUpdatedAfterPublish = documents.some(
      d => new Date(d.updatedAt).getTime() > lastPublishTime + 1000 // 1s tolerance
    );

    if (isDocUpdatedAfterPublish) {
      return {
        status: DocumentationPublishState.NEEDS_REPUBLISHING,
        userFacingLabel: 'Needs Republishing',
        lastPublishedAt: new Date(lastPublishedAt).toISOString(),
        siteUrl: lastPublish.deploymentUrl,
      };
    }

    return {
      status: DocumentationPublishState.PUBLISHED,
      userFacingLabel: 'Published',
      lastPublishedAt: new Date(lastPublishedAt).toISOString(),
      siteUrl: lastPublish.deploymentUrl,
    };
  }
}
