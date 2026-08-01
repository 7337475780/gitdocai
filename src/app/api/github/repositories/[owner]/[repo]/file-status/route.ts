import { NextRequest, NextResponse } from 'next/server';
import { getGitHubFileStatus } from '@/lib/github/github-contents';
import { z } from 'zod';

const QuerySchema = z.object({
  path: z.string().min(1),
  branch: z.string().min(1),
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

    const { path, branch } = query.data;
    const result = await getGitHubFileStatus(owner, repo, path, branch);
    
    // Do not expose the SHA to the client as per requirements
    return NextResponse.json({
      success: true,
      data: {
        exists: result.exists,
        path: result.path
      }
    });
  } catch (error: any) {
    console.error('GitHub file status error:', error);
    if (error.name === 'GitHubError' && error.status === 401) {
      return NextResponse.json({ success: false, error: 'Not connected to GitHub' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Failed to fetch file status' }, { status: 500 });
  }
}
