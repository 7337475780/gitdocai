import crypto from 'crypto';
import { getGitHubSession } from './github-session';

export function generateOAuthState(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function getGitHubOAuthUrl(returnTo?: string): Promise<string> {
  const state = generateOAuthState();
  const session = await getGitHubSession();
  
  session.oauthState = state;
  if (returnTo && returnTo.startsWith('/studio/')) {
    session.returnTo = returnTo;
  } else {
    session.returnTo = undefined;
  }
  
  await session.save();

  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error('GitHub OAuth environment variables are not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
    scope: 'repo', // Required for committing files to repositories
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

export async function exchangeOAuthCode(code: string, state: string): Promise<{ accessToken: string, returnTo?: string }> {
  const session = await getGitHubSession();
  
  if (!session.oauthState || session.oauthState !== state) {
    throw new Error('Invalid OAuth state');
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const redirectUri = process.env.GITHUB_OAUTH_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('GitHub OAuth environment variables are not configured');
  }

  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      state,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange GitHub authorization code');
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`GitHub OAuth error: ${data.error_description || data.error}`);
  }

  if (!data.access_token) {
    throw new Error('No access token received from GitHub');
  }

  // Clear state
  session.oauthState = undefined;
  const returnTo = session.returnTo;
  session.returnTo = undefined;
  
  // Save token
  session.accessToken = data.access_token;
  await session.save();

  console.log(JSON.stringify({ event: 'github_oauth_completed', success: true }));

  return { accessToken: data.access_token, returnTo };
}
