import { prisma } from '../database/prisma';
import { ActivityServiceError } from './intelligence-errors';
import { RecentActivityItem } from './intelligence-types';

export class ActivityService {
  /**
   * Safely log a documentation activity item into the database.
   */
  static async logActivity(params: {
    repositoryAnalysisId: string;
    documentId?: string | null;
    type:
      | 'DOCUMENT_GENERATED'
      | 'DOCUMENT_UPDATED'
      | 'DOCUMENT_RESTORED'
      | 'QUALITY_EVALUATED'
      | 'FRESHNESS_SCANNED'
      | 'SECTION_REGENERATED'
      | 'DOCUMENT_COMMITTED'
      | 'DOCUMENT_EXPORTED'
      | 'SITE_PREVIEWED'
      | 'SITE_PUBLISHED'
      | 'SITE_REPUBLISHED';
    summary: string;
    metadata?: Record<string, any>;
  }): Promise<RecentActivityItem> {
    try {
      const sanitizedMetadata = this.sanitizeMetadata(params.metadata);

      const record = await prisma.documentationActivity.create({
        data: {
          repositoryAnalysisId: params.repositoryAnalysisId,
          documentId: params.documentId || null,
          type: params.type as any,
          summary: params.summary,
          metadata: sanitizedMetadata || {},
        },
      });

      return {
        id: record.id,
        type: record.type,
        summary: record.summary,
        documentId: record.documentId,
        createdAt: record.createdAt.toISOString(),
        metadata: (record.metadata as Record<string, any>) || undefined,
      };
    } catch (e: any) {
      console.error('Failed to log activity:', e);
      throw new ActivityServiceError(e?.message);
    }
  }

  /**
   * Fetch recent activity items for a repository analysis.
   */
  static async getRecentActivities(
    repositoryAnalysisId: string,
    limit: number = 5
  ): Promise<RecentActivityItem[]> {
    try {
      const records = await prisma.documentationActivity.findMany({
        where: { repositoryAnalysisId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return records.map(r => ({
        id: r.id,
        type: r.type,
        summary: r.summary,
        documentId: r.documentId,
        createdAt: r.createdAt.toISOString(),
        metadata: (r.metadata as Record<string, any>) || undefined,
      }));
    } catch (e: any) {
      console.error('Failed to fetch recent activities:', e);
      return [];
    }
  }

  /**
   * Fetch paginated activity history.
   */
  static async getPaginatedActivities(params: {
    repositoryAnalysisId: string;
    page?: number;
    limit?: number;
    documentId?: string;
    type?: string;
  }) {
    try {
      const page = Math.max(1, params.page || 1);
      const limit = Math.min(50, Math.max(1, params.limit || 10));
      const skip = (page - 1) * limit;

      const where: any = { repositoryAnalysisId: params.repositoryAnalysisId };
      if (params.documentId) where.documentId = params.documentId;
      if (params.type) where.type = params.type;

      const [total, records] = await Promise.all([
        prisma.documentationActivity.count({ where }),
        prisma.documentationActivity.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        activities: records.map(r => ({
          id: r.id,
          type: r.type,
          summary: r.summary,
          documentId: r.documentId,
          createdAt: r.createdAt.toISOString(),
          metadata: (r.metadata as Record<string, any>) || undefined,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (e: any) {
      console.error('Failed to fetch paginated activities:', e);
      throw new ActivityServiceError(e?.message);
    }
  }

  /**
   * Helper to ensure no secret tokens, credentials, or massive markdown payloads are persisted.
   */
  private static sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;

    const safe: Record<string, any> = {};
    const forbiddenKeys = ['token', 'secret', 'key', 'password', 'markdown', 'content', 'raw', 'auth'];

    for (const [key, value] of Object.entries(metadata)) {
      const lowerKey = key.toLowerCase();
      if (forbiddenKeys.some(fk => lowerKey.includes(fk))) {
        continue;
      }
      if (typeof value === 'string' && value.length > 500) {
        safe[key] = value.substring(0, 500) + '...[truncated]';
      } else {
        safe[key] = value;
      }
    }

    return safe;
  }
}
