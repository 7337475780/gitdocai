import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { getGitHubSession } from '@/lib/github/github-session';

export async function GET(req: Request) {
  try {
    const session = await getGitHubSession();
    const userLogin = session?.user?.login;

    // Strict user authorization check
    if (!userLogin) {
      return NextResponse.json({ success: true, data: [] });
    }

    const url = new URL(req.url);
    const search = url.searchParams.get('search')?.toLowerCase() || '';
    const typeFilter = url.searchParams.get('type') || '';
    const qualityFilter = url.searchParams.get('quality') || '';
    const freshnessFilter = url.searchParams.get('freshness') || '';
    const sortBy = url.searchParams.get('sort') || 'updatedAt';
    const sortOrder = url.searchParams.get('order') || 'desc';

    // 1. Query all documents belonging to repositories owned by the current user
    const dbDocs = await prisma.documentation.findMany({
      where: {
        repositoryAnalysis: {
          repositoryOwner: userLogin,
        },
      },
      include: {
        repositoryAnalysis: {
          select: {
            repositoryName: true,
            repositoryOwner: true,
          },
        },
        freshnessImpacts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            status: true,
          },
        },
      },
    });

    // 2. Map DB records to clean API response objects, computing quality & freshness statuses
    let documents = dbDocs.map((doc) => {
      const metadata = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : (doc.metadata || {});
      const type = (metadata.type || metadata.documentType || 'README').toUpperCase();
      const title = metadata.title || type;

      // Compute quality status
      const score = doc.qualityScore;
      let qualityStatus = 'UNKNOWN';
      if (score !== null && score !== undefined) {
        if (score >= 90) qualityStatus = 'EXCELLENT';
        else if (score >= 75) qualityStatus = 'GOOD';
        else if (score >= 60) qualityStatus = 'NEEDS_IMPROVEMENT';
        else qualityStatus = 'POOR';
      }

      // Compute freshness status
      const freshnessStatus = doc.freshnessImpacts[0]?.status || 'UNKNOWN';

      return {
        id: doc.id,
        repositoryAnalysisId: doc.repositoryAnalysisId,
        repositoryName: doc.repositoryAnalysis.repositoryName,
        repositoryOwner: doc.repositoryAnalysis.repositoryOwner,
        title,
        type,
        qualityScore: doc.qualityScore,
        qualityStatus,
        freshnessStatus,
        createdAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
        revision: (doc as any).revision || 1,
      };
    });

    // 3. Apply search query
    if (search) {
      documents = documents.filter((doc) => {
        return (
          doc.title.toLowerCase().includes(search) ||
          doc.repositoryName.toLowerCase().includes(search) ||
          doc.type.toLowerCase().includes(search)
        );
      });
    }

    // 4. Apply type filter
    if (typeFilter) {
      documents = documents.filter((doc) => doc.type === typeFilter.toUpperCase());
    }

    // 5. Apply quality status filter
    if (qualityFilter) {
      documents = documents.filter((doc) => doc.qualityStatus === qualityFilter.toUpperCase());
    }

    // 6. Apply freshness status filter
    if (freshnessFilter) {
      documents = documents.filter((doc) => doc.freshnessStatus === freshnessFilter.toUpperCase());
    }

    // 7. Apply sorting
    documents.sort((a: any, b: any) => {
      let comparison = 0;

      if (sortBy === 'title') {
        comparison = a.title.localeCompare(b.title);
      } else if (sortBy === 'qualityScore') {
        const scoreA = a.qualityScore ?? -1;
        const scoreB = b.qualityScore ?? -1;
        comparison = scoreA - scoreB;
      } else if (sortBy === 'createdAt') {
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        // default to updatedAt
        comparison = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });

    return NextResponse.json({
      success: true,
      data: documents,
    });
  } catch (error: any) {
    console.error('Error fetching documents library list:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'LIBRARY_FETCH_FAILED',
          message: 'Unable to load documents.',
        },
      },
      { status: 500 }
    );
  }
}
