import { NextRequest, NextResponse } from 'next/server';
import { listGitHubBranches } from '@/lib/github/github-branches';
import { z } from 'zod';

const QuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(100).default(100),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ owner: string; repo: string }> }
) {
  try {
    const { owner, repo } = await params;
    const url = new URL(req.url);
    const query = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
    
    if (!query.success) {
      return NextResponse.json({ success: false, error: 'Invalid parameters' }, { status: 400 });
    }

    const { page, perPage } = query.data;
    const result = await listGitHubBranches(owner, repo, page, perPage);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('GitHub branches error:', error);
    if (error.name === 'GitHubError' && error.status === 401) {
      return NextResponse.json({ success: false, error: 'Not connected to GitHub' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Failed to fetch branches' }, { status: 500 });
  }
}
