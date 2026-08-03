import { z } from 'zod';

const PLACEHOLDER_STRINGS = [
  'change-me',
  'your-key-here',
  'example-key',
  'placeholder',
  'your_secret_here',
  'your-secret-here',
  'xxxxxx',
];

const isNotPlaceholder = (val?: string) => {
  if (!val) return true;
  const lower = val.toLowerCase().trim();
  return !PLACEHOLDER_STRINGS.some(p => lower.includes(p));
};

export const EnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required').refine(isNotPlaceholder, 'DATABASE_URL contains placeholder value'),
  APPLICATION_URL: z.string().url('APPLICATION_URL must be a valid URL').default('http://localhost:3000').refine(isNotPlaceholder, 'APPLICATION_URL contains placeholder value'),
  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET must be at least 16 characters').default('dev-auth-secret-key-32-chars-long-min').refine(isNotPlaceholder, 'AUTH_SECRET contains placeholder value'),

  // Optional AI Provider Keys
  OPENROUTER_API_KEY: z.string().optional().refine(isNotPlaceholder, 'OPENROUTER_API_KEY contains placeholder value'),
  GROQ_API_KEY: z.string().optional().refine(isNotPlaceholder, 'GROQ_API_KEY contains placeholder value'),
  HUGGINGFACE_API_KEY: z.string().optional().refine(isNotPlaceholder, 'HUGGINGFACE_API_KEY contains placeholder value'),
  CEREBRAS_API_KEY: z.string().optional().refine(isNotPlaceholder, 'CEREBRAS_API_KEY contains placeholder value'),
  GEMINI_API_KEY: z.string().optional().refine(isNotPlaceholder, 'GEMINI_API_KEY contains placeholder value'),

  // Optional GitHub Integration
  GITHUB_CLIENT_ID: z.string().optional().refine(isNotPlaceholder, 'GITHUB_CLIENT_ID contains placeholder value'),
  GITHUB_CLIENT_SECRET: z.string().optional().refine(isNotPlaceholder, 'GITHUB_CLIENT_SECRET contains placeholder value'),

  // Optional Vercel Publishing
  VERCEL_TOKEN: z.string().optional().refine(isNotPlaceholder, 'VERCEL_TOKEN contains placeholder value'),
  VERCEL_TEAM_ID: z.string().optional().refine(isNotPlaceholder, 'VERCEL_TEAM_ID contains placeholder value'),
  VERCEL_PROJECT_ID: z.string().optional().refine(isNotPlaceholder, 'VERCEL_PROJECT_ID contains placeholder value'),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    if (!data.APPLICATION_URL.startsWith('https://')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'APPLICATION_URL must use HTTPS in production',
        path: ['APPLICATION_URL'],
      });
    }
  }
});

export type EnvironmentConfig = z.infer<typeof EnvironmentSchema>;
