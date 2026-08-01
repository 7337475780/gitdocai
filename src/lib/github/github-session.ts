import { SessionOptions, getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface GitHubSessionData {
  accessToken?: string;
  oauthState?: string;
  returnTo?: string;
}

const sessionOptions: SessionOptions = {
  password: process.env.GITHUB_SESSION_SECRET || 'a-very-long-fallback-secret-password-that-is-at-least-32-chars',
  cookieName: 'gitdoc_github_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

export async function getGitHubSession() {
  const cookieStore = await cookies();
  return getIronSession<GitHubSessionData>(cookieStore, sessionOptions);
}
