import { NextRequest, NextResponse } from 'next/server';
import { listGitHubRepositories } from '@/lib/github/github-repositories';
import { getGitHubSession } from '@/lib/github/github-session';
import { prisma } from '@/lib/database/prisma';
import { z } from 'zod';

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(30),
  search: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
    
    if (!query.success) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }

    const session = await getGitHubSession();
    const userLogin = session?.user?.login;

    if (!userLogin) {
      return NextResponse.json({ success: false, error: 'Not connected to GitHub' }, { status: 401 });
    }

    const { page, perPage, search } = query.data;
    const result = await listGitHubRepositories(page, perPage, search);

    // Retrieve database repository analyses for the user
    const analyses = await prisma.repositoryAnalysis.findMany({
      where: {
        repositoryOwner: userLogin,
      },
      select: {
        id: true,
        repositoryFullName: true,
      },
    });

    const analysisMap = new Map(analyses.map(a => [a.repositoryFullName.toLowerCase(), a.id]));

    // Inject analysis status details
    const reposWithAnalysisStatus = result.repositories.map(repo => {
      const analysisId = analysisMap.get(repo.fullName.toLowerCase()) || null;
      return {
        ...repo,
        analysisId,
        analysisStatus: analysisId ? 'COMPLETED' as const : 'NONE' as const,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        repositories: reposWithAnalysisStatus,
      },
    });
  } catch (error: any) {
    console.error('GitHub repositories error:', error);
    if (error.name === 'GitHubError' && error.status === 401) {
      return NextResponse.json({ success: false, error: 'Not connected to GitHub' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Failed to fetch repositories' }, { status: 500 });
  }
}
