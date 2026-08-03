import { NextResponse } from 'next/server';
import { getGitHubSession } from '@/lib/github/github-session';

export async function GET() {
  try {
    const session = await getGitHubSession();
    
    if (!session.accessToken) {
      return NextResponse.json({
        success: true,
        data: {
          connected: false,
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
      } catch (e) {
        // Fallback if GitHub API call fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        connected: true,
        user,
      },
    });
  } catch (error) {
    return NextResponse.json({
      success: true,
      data: {
        connected: false,
        user: null,
      },
    });
  }
}
