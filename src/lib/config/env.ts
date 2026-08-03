import { EnvironmentSchema, EnvironmentConfig } from './env-schema';
import { EnvironmentValidationError } from './env-errors';

class EnvironmentService {
  private config: EnvironmentConfig | null = null;

  public get env(): EnvironmentConfig {
    if (!this.config) {
      this.config = this.validate();
    }
    return this.config;
  }

  public validate(): EnvironmentConfig {
    const rawEnv = {
      NODE_ENV: process.env.NODE_ENV,
      DATABASE_URL: process.env.DATABASE_URL,
      APPLICATION_URL: process.env.APPLICATION_URL,
      AUTH_SECRET: process.env.AUTH_SECRET,

      OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
      GROQ_API_KEY: process.env.GROQ_API_KEY,
      HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
      CEREBRAS_API_KEY: process.env.CEREBRAS_API_KEY,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,

      GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
      GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,

      VERCEL_TOKEN: process.env.VERCEL_TOKEN,
      VERCEL_TEAM_ID: process.env.VERCEL_TEAM_ID,
      VERCEL_PROJECT_ID: process.env.VERCEL_PROJECT_ID,
    };

    const parsed = EnvironmentSchema.safeParse(rawEnv);

    if (!parsed.success) {
      const errorMessages = parsed.error.issues.map(
        issue => `${issue.path.join('.')}: ${issue.message}`
      );
      throw new EnvironmentValidationError(errorMessages);
    }

    this.logStatus(parsed.data);
    return parsed.data;
  }

  /**
   * Log safe environment configuration status without revealing secret values.
   */
  private logStatus(config: EnvironmentConfig): void {
    const configuredAIProviders = [
      config.OPENROUTER_API_KEY,
      config.GROQ_API_KEY,
      config.HUGGINGFACE_API_KEY,
      config.CEREBRAS_API_KEY,
      config.GEMINI_API_KEY,
    ].filter(Boolean).length;

    const githubConfigured = Boolean(config.GITHUB_CLIENT_ID && config.GITHUB_CLIENT_SECRET);
    const vercelConfigured = Boolean(config.VERCEL_TOKEN);

    console.log(
      `[CONFIG] Environment validated (${config.NODE_ENV}). AI providers configured: ${configuredAIProviders}. GitHub integration: ${
        githubConfigured ? 'enabled' : 'disabled'
      }. Publishing: ${vercelConfigured ? 'enabled' : 'disabled'}`
    );
  }
}

export const envService = new EnvironmentService();
export const env = envService.env;
