import { NextResponse } from 'next/server';
import { getGitHubSession } from '@/lib/github/github-session';

export async function GET() {
  try {
    const session = await getGitHubSession();
    const configured = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
    
    if (!session.accessToken) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
          configured,
          user: null,
        },
      });
    }

    let user = session.user || null;

    if (!user) {
      try {
        const ghRes = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'User-Agent': 'GitDoc-AI-App',
          },
        });
        if (ghRes.ok) {
          const ghUser = await ghRes.json();
          user = {
            login: ghUser.login,
            name: ghUser.name || ghUser.login,
            avatarUrl: ghUser.avatar_url,
            email: ghUser.email || `${ghUser.login}@users.noreply.github.com`,
          };
          session.user = user;
          await session.save();
        }
      } catch {
        // Fallback if GitHub API call fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        configured,
        user,
      },
    });
  } catch {
    const configured = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
    return NextResponse.json({
      success: true,
      data: {
        connected: false,
        configured,
        user: null,
      },
    });
  }
}
