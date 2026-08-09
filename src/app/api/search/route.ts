import { NextResponse } from 'next/server';
import { prisma } from '@/lib/database/prisma';
import { getGitHubSession } from '@/lib/github/github-session';

export async function GET(req: Request) {
  try {
    const session = await getGitHubSession();
    const userLogin = session?.user?.login;

    if (!userLogin) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() || '';

    if (query.length < 2) {
      return NextResponse.json({ success: true, data: { repositories: [], documents: [] } });
    }

    // 1. Search Repositories (RepositoryAnalysis)
    const repos = await prisma.repositoryAnalysis.findMany({
      where: {
        repositoryOwner: userLogin,
        OR: [
          { repositoryName: { contains: query, mode: 'insensitive' } },
          { repositoryFullName: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        repositoryName: true,
        repositoryFullName: true,
        createdAt: true,
      },
      take: 5,
    });

    // 2. Search Documentation (Documentation)
    const docs = await prisma.documentation.findMany({
      where: {
        repositoryAnalysis: {
          repositoryOwner: userLogin,
        },
      },
      include: {
        repositoryAnalysis: {
          select: {
            id: true,
            repositoryName: true,
          },
        },
      },
      take: 50,
    });

    // Filter documents by metadata title / content
    const matchedDocs = docs
      .map(doc => {
        const metadata = typeof doc.metadata === 'string' ? JSON.parse(doc.metadata) : (doc.metadata || {});
        const type = (metadata.type || metadata.documentType || 'README').toUpperCase();
        const title = metadata.title || type;
        return {
          id: doc.id,
          title,
          type,
          repositoryName: doc.repositoryAnalysis.repositoryName,
          repositoryAnalysisId: doc.repositoryAnalysis.id,
          updatedAt: doc.updatedAt,
        };
      })
      .filter(doc => doc.title.toLowerCase().includes(query.toLowerCase()) || doc.repositoryName.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        repositories: repos.map(r => ({
          id: r.id,
          name: r.repositoryName,
          fullName: r.repositoryFullName,
          createdAt: r.createdAt,
        })),
        documents: matchedDocs,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
