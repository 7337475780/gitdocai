import { NextResponse } from 'next/server';
import { getGitHubSession } from '@/lib/github/github-session';

export async function GET() {
  try {
    const session = await getGitHubSession();
    const userLogin = session?.user?.login;

    // Check AI providers status safely
    const providers = [
      { id: 'gemini', name: 'Gemini', status: Boolean(process.env.GEMINI_API_KEY) ? 'Configured' : 'Not configured' },
      { id: 'openrouter', name: 'OpenRouter', status: Boolean(process.env.OPENROUTER_API_KEY) ? 'Configured' : 'Not configured' },
      { id: 'groq', name: 'Groq', status: Boolean(process.env.GROQ_API_KEY) ? 'Configured' : 'Not configured' },
      { id: 'huggingface', name: 'Hugging Face', status: Boolean(process.env.HUGGINGFACE_API_KEY) ? 'Configured' : 'Not configured' },
      { id: 'cerebras', name: 'Cerebras', status: Boolean(process.env.CEREBRAS_API_KEY) ? 'Configured' : 'Not configured' },
    ];

    // GitHub config integration check
    const githubConfigured = !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

    return NextResponse.json({
      success: true,
      data: {
        appInfo: {
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
          capabilities: [
            'README documentation generation',
            'Architecture guide compilation',
            'Contributing guidelines generation',
            'Developer setup guides compilation',
            'API reference generation',
            'Freshness scanning & delta recovery',
            'Quality evaluation engine',
          ],
          githubIntegration: githubConfigured ? 'OAuth Configured' : 'OAuth Not Configured',
        },
        providers,
        userLogin: userLogin || null,
      },
    });
  } catch (error: any) {
    console.error('Settings API route error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'SETTINGS_LOAD_FAILED',
          message: 'Unable to retrieve settings metadata.',
        },
      },
      { status: 500 }
    );
  }
}
