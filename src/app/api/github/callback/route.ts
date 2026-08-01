import { NextRequest, NextResponse } from 'next/server';
import { exchangeOAuthCode } from '@/lib/github/github-auth';

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get('code');
    const state = req.nextUrl.searchParams.get('state');
    const error = req.nextUrl.searchParams.get('error');

    if (error) {
      // User likely denied authorization
      const url = new URL('/', req.url);
      url.searchParams.set('github_error', 'authorization_cancelled');
      return NextResponse.redirect(url);
    }

    if (!code || !state) {
      return NextResponse.json({ success: false, error: 'Missing code or state' }, { status: 400 });
    }

    const { returnTo } = await exchangeOAuthCode(code, state);

    // Redirect to the safe return path or fallback to home
    const redirectUrl = new URL(returnTo || '/', req.url);
    
    // Pass a success flag to trigger a toast if needed
    redirectUrl.searchParams.set('github_connected', 'true');
    
    return NextResponse.redirect(redirectUrl);
  } catch (error: any) {
    console.error('GitHub callback error:', error);
    const url = new URL('/', req.url);
    url.searchParams.set('github_error', 'verification_failed');
    return NextResponse.redirect(url);
  }
}
