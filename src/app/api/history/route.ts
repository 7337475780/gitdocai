import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { getGitHubSession } from '@/lib/github/github-session';

export async function GET(req: Request) {
  try {
    const session = await getGitHubSession();
    const userLogin = session?.user?.login;

    // Authorization check: If no authenticated session exists, return an empty state.
    if (!userLogin) {
      return NextResponse.json({
        success: true,
        data: {
          activities: [],
          pagination: {
            page: 1,
            limit: 10,
            total: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPrevPage: false,
          },
        },
      });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    const type = url.searchParams.get('type') || undefined;
    const repositoryAnalysisId = url.searchParams.get('repositoryAnalysisId') || undefined;
    const documentId = url.searchParams.get('documentId') || undefined;
    const startDate = url.searchParams.get('startDate') || undefined;
    const endDate = url.searchParams.get('endDate') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const searchQuery = url.searchParams.get('query') || undefined;
    const sortBy = url.searchParams.get('sortBy') || 'newest';

    const where: any = {
      repositoryAnalysis: {
        repositoryOwner: userLogin,
      },
    };

    if (type) {
      where.type = type;
    }
    if (repositoryAnalysisId) {
      where.repositoryAnalysisId = repositoryAnalysisId;
    }
    if (documentId) {
      where.documentId = documentId;
    }

    // Date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Status filter - check inside metadata JSON for status field
    if (status) {
      where.metadata = {
        path: ['status'],
        equals: status,
      };
    }

    // Search query
    if (searchQuery) {
      where.OR = [
        {
          summary: {
            contains: searchQuery,
            mode: 'insensitive',
          },
        },
        {
          repositoryAnalysis: {
            repositoryName: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
        },
        {
          document: {
            metadata: {
              path: ['title'],
              string_contains: searchQuery,
            },
          },
        },
      ];
    }

    const orderBy = sortBy === 'oldest' ? { createdAt: 'asc' } as const : { createdAt: 'desc' } as const;

    const [total, records] = await Promise.all([
      prisma.documentationActivity.count({ where }),
      prisma.documentationActivity.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          repositoryAnalysis: {
            select: {
              id: true,
              repositoryName: true,
              repositoryOwner: true,
              repositoryFullName: true,
            },
          },
          document: {
            select: {
              id: true,
              metadata: true,
            },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    const activities = records.map(r => {
      const docMetadata = r.document?.metadata as any;
      const documentTitle = docMetadata?.title || docMetadata?.fileName || 'Unknown Document';
      const isDocumentDeleted = r.documentId ? !r.document : true;

      return {
        id: r.id,
        type: r.type,
        summary: r.summary,
        createdAt: r.createdAt.toISOString(),
        metadata: (r.metadata as Record<string, any>) || {},
        repository: r.repositoryAnalysis
          ? {
              id: r.repositoryAnalysis.id,
              name: r.repositoryAnalysis.repositoryName,
              fullName: r.repositoryAnalysis.repositoryFullName,
            }
          : null,
        document: r.documentId
          ? {
              id: r.documentId,
              title: documentTitle,
              isDeleted: isDocumentDeleted,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        activities,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });
  } catch (error: any) {
    console.error('Unified history API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'HISTORY_LOAD_FAILED',
          message: 'Unable to load unified history data.',
        },
      },
      { status: 500 }
    );
  }
}
