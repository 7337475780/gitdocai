import { NextRequest, NextResponse } from 'next/server';
import { getGitHubOAuthUrl } from '@/lib/github/github-auth';

export async function GET(req: NextRequest) {
  try {
    const returnTo = req.nextUrl.searchParams.get('returnTo');
    
    // Validate returnTo path
    let safeReturnTo = undefined;
    if (returnTo && returnTo.startsWith('/studio/')) {
      safeReturnTo = returnTo;
    }

    const authUrl = await getGitHubOAuthUrl(safeReturnTo);
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('GitHub connect error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
