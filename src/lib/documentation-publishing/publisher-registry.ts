import { DocumentationPublisher } from './publisher-types';
import { MockPublisher } from './mock-publisher';
import { VercelPublisher } from './vercel-publisher';

export const publisherRegistry = {
  getPublisher(): DocumentationPublisher {
    const vercel = new VercelPublisher();
    if (vercel.isConfigured()) {
      return vercel;
    }
    return new MockPublisher();
  },

  isPublishingConfigured(): boolean {
    const vercel = new VercelPublisher();
    if (vercel.isConfigured()) return true;
    // Mock publisher is always available for local dev
    return process.env.NODE_ENV !== 'production' || process.env.ENABLE_MOCK_PUBLISHER === 'true';
  }
};
