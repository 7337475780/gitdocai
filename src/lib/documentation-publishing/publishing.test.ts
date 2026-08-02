import { describe, it, expect } from 'vitest';
import { MockPublisher } from './mock-publisher';
import { VercelPublisher } from './vercel-publisher';
import { publisherRegistry } from './publisher-registry';

describe('PublishingProvider Abstraction', () => {
  it('MockPublisher publishes successfully and returns preview deployment URL', async () => {
    const mock = new MockPublisher();
    expect(mock.isConfigured()).toBe(true);

    const result = await mock.publish({
      siteId: 'site-123',
      siteName: 'Test Site',
      manifest: {},
      pages: {},
      navigation: [],
      searchIndex: [],
    });

    expect(result.status).toBe('PUBLISHED');
    expect(result.deploymentUrl).toBe('/documentation-site/site-123/preview');
  });

  it('VercelPublisher indicates unconfigured status when env variables are absent', () => {
    const vercel = new VercelPublisher();
    const isConfigured = vercel.isConfigured();
    expect(isConfigured).toBe(false);
  });

  it('publisherRegistry selects MockPublisher when Vercel is unconfigured', () => {
    const pub = publisherRegistry.getPublisher();
    expect(pub).toBeDefined();
    expect(pub.id).toBe('mock');
  });
});
