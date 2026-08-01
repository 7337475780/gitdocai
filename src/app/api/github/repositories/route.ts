import { NextRequest, NextResponse } from 'next/server';
import { listGitHubRepositories } from '@/lib/github/github-repositories';
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

    const { page, perPage, search } = query.data;
    
    const result = await listGitHubRepositories(page, perPage, search);
    
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('GitHub repositories error:', error);
    if (error.name === 'GitHubError' && error.status === 401) {
      return NextResponse.json({ success: false, error: 'Not connected to GitHub' }, { status: 401 });
    }
    return NextResponse.json({ success: false, error: 'Failed to fetch repositories' }, { status: 500 });
  }
}
