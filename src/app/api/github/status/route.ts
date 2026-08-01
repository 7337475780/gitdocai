import { NextResponse } from 'next/server';
import { getGitHubSession } from '@/lib/github/github-session';

export async function GET() {
  try {
    const session = await getGitHubSession();
    
    return NextResponse.json({
      success: true,
      data: {
        connected: !!session.accessToken
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: true, // Still success true, just not connected
      data: {
        connected: false
      }
    });
  }
}
