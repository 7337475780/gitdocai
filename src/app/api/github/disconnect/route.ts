import { NextResponse } from 'next/server';
import { getGitHubSession } from '@/lib/github/github-session';

export async function POST() {
  try {
    const session = await getGitHubSession();
    session.destroy();
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('GitHub disconnect error:', error);
    return NextResponse.json({ success: false, error: 'Failed to disconnect' }, { status: 500 });
  }
}
