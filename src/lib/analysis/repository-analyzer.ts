import { RepositoryService } from '../github/repository-service';
import { FileReader } from '../github/file-reader';
import { PackageAnalyzer } from './package-analyzer';
import { TechnologyDetector } from './technology-detector';
import { ProjectTypeDetector } from './project-type-detector';
import { Scoring } from './scoring';
import { RepositoryAnalysisResult, ProjectSignal } from '../../types';
import { PathSanitizer } from '../documentation/path-sanitizer';

// ─── File Importance Classifier ──────────────────────────────────────────────

type FileImportance = 'CORE' | 'IMPORTANT' | 'SUPPORTING' | 'CONFIGURATION' | 'TEST' | 'GENERATED' | 'IGNORE';

function classifyFile(path: string): FileImportance {
  const lower = path.toLowerCase();

  // Ignore generated/artifact directories
  if (
    lower.includes('node_modules/') ||
    lower.startsWith('.next/') ||
    lower.startsWith('dist/') ||
    lower.startsWith('build/') ||
    lower.startsWith('.git/') ||
    lower.includes('/__pycache__/') ||
    lower.includes('/.cache/') ||
    lower.endsWith('.d.ts') && lower.includes('/node_modules/')
  ) return 'IGNORE';

  // Test files
  if (
    lower.includes('.test.') ||
    lower.includes('.spec.') ||
    lower.includes('__tests__/') ||
    lower.includes('/tests/') ||
    lower.includes('/test/')
  ) return 'TEST';

  // Configuration files
  if (
    lower === 'package.json' ||
    lower === 'tsconfig.json' ||
    lower.includes('next.config') ||
    lower.includes('tailwind.config') ||
    lower.includes('vite.config') ||
    lower.includes('webpack.config') ||
    lower.includes('eslint') ||
    lower.includes('.prettierrc') ||
    lower === 'dockerfile' ||
    lower.includes('docker-compose') ||
    lower.includes('.env') ||
    lower.includes('drizzle.config') ||
    lower.includes('prisma/schema')
  ) return 'CONFIGURATION';

  // Core application source files
  if (
    lower.includes('src/app/') ||
    lower.includes('src/pages/') ||
    lower.includes('src/server/') ||
    lower.includes('src/api/') ||
    lower.includes('app/api/') ||
    lower.includes('pages/api/') ||
    lower.includes('src/lib/') ||
    lower.includes('src/services/') ||
    lower.includes('src/hooks/') ||
    lower.includes('src/store/')
  ) return 'CORE';

  // Important supporting files
  if (
    lower.includes('src/components/') ||
    lower.includes('src/utils/') ||
    lower.includes('src/types') ||
    lower.includes('src/schemas') ||
    lower.includes('src/middleware') ||
    lower.includes('middleware.ts') ||
    lower.endsWith('readme.md') ||
    lower.includes('contributing')
  ) return 'IMPORTANT';

  return 'SUPPORTING';
}

// ─── Source File Priority Scorer ─────────────────────────────────────────────

/**
 * Returns a priority score for which files are most valuable to read.
 * Higher score = read first.
 */
function sourceFilePriority(path: string): number {
  const lower = path.toLowerCase();

  // API route handlers are the highest priority — they define actual functionality
  if ((lower.includes('app/api/') || lower.includes('pages/api/')) &&
      (lower.endsWith('route.ts') || lower.endsWith('route.js') ||
       lower.endsWith('index.ts') || lower.endsWith('index.js'))) return 100;

  // DB schema — defines data model
  if (lower.includes('schema.prisma') || lower.includes('drizzle/schema') ||
      lower.includes('db/schema')) return 90;

  // Middleware — defines auth guards and routing logic
  if (lower === 'middleware.ts' || lower === 'src/middleware.ts' ||
      lower === 'middleware.js') return 85;

  // Root layout — defines app title/metadata/providers
  if (lower.endsWith('app/layout.tsx') || lower.endsWith('app/layout.ts') ||
      lower.endsWith('app/layout.jsx')) return 80;

  // Root page — describes the app's landing/home screen purpose
  if (lower === 'app/page.tsx' || lower === 'app/page.ts' ||
      lower === 'src/app/page.tsx' || lower.endsWith('(app)/page.tsx') ||
      lower.endsWith('(marketing)/page.tsx')) return 78;

  // Other top-level pages
  if ((lower.includes('/app/') || lower.includes('/pages/')) &&
      (lower.endsWith('page.tsx') || lower.endsWith('page.ts') ||
       lower.endsWith('page.jsx') || lower.endsWith('.tsx') || lower.endsWith('.ts')) &&
      !lower.includes('/api/')) return 60;

  // Core lib / services / actions
  if (lower.includes('/lib/') || lower.includes('/services/') ||
      lower.includes('/actions/') || lower.includes('/server/')) return 55;

  // Hooks
  if (lower.includes('/hooks/')) return 45;

  // Store / state
  if (lower.includes('/store/') || lower.includes('/context/')) return 40;

  // Utility functions
  if (lower.includes('/utils/') || lower.includes('/helpers/')) return 30;

  return 0;
}

// ─── Source Code Reader ───────────────────────────────────────────────────────

const SOURCE_READ_LIMIT = 40;       // max files to read
const SOURCE_CHARS_PER_FILE = 2500; // truncate each file to this length
const BATCH_SIZE = 12;              // concurrent fetch limit

async function readSourceFiles(
  owner: string,
  repo: string,
  branch: string,
  filePaths: string[]
): Promise<Array<{ path: string; content: string }>> {
  // Score and rank files, pick the top SOURCE_READ_LIMIT
  const ranked = filePaths
    .map(p => ({ path: p, score: sourceFilePriority(p) }))
    .filter(f => f.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, SOURCE_READ_LIMIT)
    .map(f => f.path);

  const results: Array<{ path: string; content: string }> = [];

  // Fetch in batches to avoid overwhelming GitHub's raw CDN
  for (let i = 0; i < ranked.length; i += BATCH_SIZE) {
    const batch = ranked.slice(i, i + BATCH_SIZE);
    const fetched = await Promise.all(
      batch.map(async path => {
        const raw = await FileReader.getFileContent(owner, repo, path, branch);
        if (!raw || raw.trim().length === 0) return null;
        const truncated = raw.length > SOURCE_CHARS_PER_FILE
          ? raw.substring(0, SOURCE_CHARS_PER_FILE) + '\n// ... (truncated)'
          : raw;
        // Sanitize local machine paths before the content reaches the LLM
        const content = PathSanitizer.sanitizeSourceContent(truncated);
        return { path, content };
      })
    );
    for (const f of fetched) {
      if (f) results.push(f);
    }
  }

  return results;
}

// ─── API Route Analyzer (deep, source-aware) ─────────────────────────────────

/** Shape returned for each detected API route */
export interface DetectedApiRoute {
  method: string;
  path: string;
  purpose: string;
  authentication: boolean;
  queryParams: string[];
  bodyFields: string[];
  validationSchema?: string;
  successResponseFields: string[];
  errorResponses: Array<{ status: number; fields: string[] }>;
  responseCodes: number[];
  isStreaming: boolean;
  contentType?: string;
}

function analyzeApiRoutesFromSource(
  filePaths: string[],
  sourceFiles: Array<{ path: string; content: string }>
): DetectedApiRoute[] {
  const apiFiles = filePaths.filter(f => {
    const lower = f.toLowerCase();
    return (
      (lower.includes('app/api/') || lower.includes('pages/api/')) &&
      (lower.endsWith('route.ts') || lower.endsWith('route.js') ||
       lower.endsWith('index.ts') || lower.endsWith('index.js'))
    );
  });

  return apiFiles.slice(0, 30).map(f => {
    // ── 1. Derive canonical URL path ──────────────────────────────────────
    const apiPath = '/' + f
      .replace(/.*app\/api\//, 'api/')
      .replace(/.*pages\/api\//, 'api/')
      .replace(/\/route\.(ts|js)$/, '')
      .replace(/\/index\.(ts|js)$/, '')
      .replace(/\[([^\]]+)\]/g, ':$1');

    const sourceFile = sourceFiles.find(sf => sf.path === f);
    const source = sourceFile?.content || '';

    // ── 2. HTTP methods — from exported handler names ──────────────────────
    const exportedMethods: string[] = [];
    for (const m of source.matchAll(/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/gi)) {
      exportedMethods.push(m[1].toUpperCase());
    }
    const method = exportedMethods.length > 0 ? exportedMethods.join(' | ') : 'GET | POST';

    // ── 3. Purpose — JSDoc first, then path segment ───────────────────────
    let purpose = '';
    const jsdocMatch = source.match(/\/\*\*\s*([\s\S]*?)\*\//);
    if (jsdocMatch) {
      purpose = jsdocMatch[1].replace(/\s*\*\s?/g, ' ').trim().split('.')[0].trim();
    }
    if (!purpose) {
      const segments = apiPath.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1] || 'resource';
      purpose = `Handles ${lastSegment.replace(/-/g, ' ')} operations`;
    }

    // ── 4. Query parameters — all searchParams.get(...) calls ─────────────
    const queryParams = [...source.matchAll(/searchParams\.get\(['"]([^'"]+)['"]\)/g)]
      .map(m => m[1])
      .filter((v, i, arr) => arr.indexOf(v) === i); // deduplicate

    // ── 5. Body fields — destructured from request.json() and Zod schemas ──
    const bodyFields: string[] = [];

    // Pattern: const { a, b, c } = await request.json()
    const destructMatches = source.matchAll(
      /const\s*\{([^}]+)\}\s*=\s*(?:await\s+)?(?:req(?:uest)?\.json\(\)|body)/g
    );
    for (const m of destructMatches) {
      const fields = m[1].split(',').map(s => s.trim().split(':')[0].trim()).filter(Boolean);
      for (const f2 of fields) {
        if (f2 && !bodyFields.includes(f2)) bodyFields.push(f2);
      }
    }

    // ── 6. Zod validation schema ───────────────────────────────────────────
    let validationSchema: string | undefined;
    const zodMatch = source.match(/z\.object\(\{([\s\S]{0,300})\}\)(?:\.(?:safeParse|parse|parseAsync))?/);
    if (zodMatch) {
      // Extract field names only (strip types)
      const zodFields = zodMatch[1]
        .split('\n')
        .map(line => line.trim().match(/^([a-zA-Z_][\w]*)/)?.[1])
        .filter(Boolean)
        .slice(0, 15);
      if (zodFields.length > 0) {
        validationSchema = `z.object({ ${zodFields.join(', ')} })`;
        // Also add zod fields to bodyFields if not already present
        for (const zf of zodFields as string[]) {
          if (!bodyFields.includes(zf)) bodyFields.push(zf);
        }
      }
    }

    // ── 7. All NextResponse.json() calls — collect keys and status codes ───
    // This is the most important part: scan EVERY response branch, not just the first.
    const successResponseFields: string[] = [];
    const errorResponses: Array<{ status: number; fields: string[] }> = [];
    const responseCodes: number[] = [];

    // Match all NextResponse.json({ ... }, { status: NNN }) or NextResponse.json({ ... })
    // We use a simpler regex to find each call site then parse it.
    const responseCallPattern = /NextResponse\.json\(([\s\S]{0,400}?)(?:,\s*\{[\s\S]*?status:\s*(\d+)[\s\S]*?\})?\s*\)/g;
    for (const m of source.matchAll(responseCallPattern)) {
      const body = m[1] || '';
      const statusStr = m[2];
      const status = statusStr ? parseInt(statusStr, 10) : 200;

      if (status && !responseCodes.includes(status)) responseCodes.push(status);

      // Extract top-level keys from the response object literal
      const keyMatches = [...body.matchAll(/\b([a-zA-Z_][\w]*)\s*:/g)]
        .map(km => km[1])
        .filter(k => !['success', 'true', 'false', 'null', 'undefined'].includes(k) === false
          ? false
          : !['options', 'headers', 'status', 'cache'].includes(k));

      // Simpler: get all word-colon patterns
      const allKeys = [...body.matchAll(/([a-zA-Z_][\w]*)\s*:/g)]
        .map(km => km[1])
        .filter(k => !['status', 'headers', 'cache', 'revalidate'].includes(k));

      if (status >= 400) {
        // Error branch
        const existing = errorResponses.find(e => e.status === status);
        if (existing) {
          for (const k of allKeys) {
            if (!existing.fields.includes(k)) existing.fields.push(k);
          }
        } else {
          errorResponses.push({ status, fields: allKeys.slice(0, 8) });
        }
      } else {
        // Success branch
        for (const k of allKeys) {
          if (!successResponseFields.includes(k)) successResponseFields.push(k);
        }
      }
    }

    // Ensure 200 is in responseCodes if we have any success response
    if (successResponseFields.length > 0 && !responseCodes.includes(200)) {
      responseCodes.unshift(200);
    }

    // ── 8. Streaming detection ─────────────────────────────────────────────
    const isStreaming =
      source.includes('ReadableStream') ||
      source.includes('StreamingTextResponse') ||
      source.includes('new Response(stream') ||
      source.includes('TransformStream') ||
      source.includes('createStreamableValue');

    // ── 9. Content type ────────────────────────────────────────────────────
    let contentType: string | undefined;
    const ctMatch = source.match(/['"]Content-Type['"](\s*:\s*|\s*,\s*)['"]([^'"]+)['"]/);
    if (ctMatch) contentType = ctMatch[2];
    else if (isStreaming) contentType = 'text/event-stream';
    else if (successResponseFields.length > 0) contentType = 'application/json';

    // ── 10. Authentication ─────────────────────────────────────────────────
    const hasAuth =
      source.includes('getServerSession') ||
      source.includes('auth()') ||
      source.includes('verifyToken') ||
      source.includes('requireAuth') ||
      source.includes('session.user') ||
      source.includes('currentUser') ||
      source.includes('getSession') ||
      source.includes('authMiddleware') ||
      source.includes('protect(') ||
      f.toLowerCase().includes('auth') ||
      f.toLowerCase().includes('session') ||
      f.toLowerCase().includes('protected');

    return {
      method,
      path: '/' + apiPath,
      purpose,
      authentication: hasAuth,
      queryParams,
      bodyFields,
      ...(validationSchema ? { validationSchema } : {}),
      successResponseFields: successResponseFields.slice(0, 15),
      errorResponses,
      responseCodes: responseCodes.sort((a, b) => a - b),
      isStreaming,
      ...(contentType ? { contentType } : {}),
    };
  });
}

// ─── Feature Extractor (source-aware) ────────────────────────────────────────

function extractFeaturesFromSource(
  filePaths: string[],
  dependencies: string[],
  pageRoutes: string[],
  apiRoutes: Array<{ path: string }>,
  authInfo: ReturnType<typeof detectAuth>,
  dbInfo: ReturnType<typeof detectDatabase>,
  sourceFiles: Array<{ path: string; content: string }>
): Array<{ name: string; description: string; routes?: string[]; components?: string[] }> {
  const features: Array<{ name: string; description: string; routes?: string[]; components?: string[] }> = [];

  if (authInfo) {
    features.push({
      name: 'Authentication',
      description: `User authentication powered by ${authInfo.provider}. Supports: ${authInfo.strategies.join(', ')}.`,
      routes: apiRoutes.filter(r => r.path.includes('auth') || r.path.includes('session')).map(r => r.path),
    });
  }

  if (dbInfo) {
    features.push({
      name: 'Data Persistence',
      description: `Persistent data storage using ${dbInfo.orm} with a ${dbInfo.type} database.${dbInfo.hasSchema ? ' Schema defined.' : ''}`,
    });
  }

  // Detect dashboard/analytics pages
  if (pageRoutes.some(r => r.includes('dashboard') || r.includes('analytics') || r.includes('overview'))) {
    features.push({
      name: 'Dashboard',
      description: 'An analytics or management dashboard providing an overview of data and user activity.',
      routes: pageRoutes.filter(r => r.includes('dashboard') || r.includes('analytics')),
    });
  }

  // Source-aware: scan page files for clues about user-facing features
  const pageFiles = sourceFiles.filter(sf => {
    const lower = sf.path.toLowerCase();
    return (lower.endsWith('page.tsx') || lower.endsWith('page.ts') || lower.endsWith('page.jsx')) &&
      !lower.includes('/api/');
  });
  for (const pf of pageFiles.slice(0, 6)) {
    // Extract title from metadata exports or JSX h1/h2 patterns
    const metaTitleMatch = pf.content.match(/title:\s*['"`]([^'"`\n]{5,80})['"`]/);
    const h1Match = pf.content.match(/<h1[^>]*>([^<]{5,80})<\/h1>/);
    const descriptionMatch = pf.content.match(/description:\s*['"`]([^'"`\n]{10,150})['"`]/);
    if (metaTitleMatch || h1Match || descriptionMatch) {
      const name = metaTitleMatch?.[1] || h1Match?.[1] || 'Page Feature';
      const description = descriptionMatch?.[1] || `Page: ${pf.path.split('/').filter(Boolean).slice(-2).join('/')}`;
      if (!features.some(f => f.name === name)) {
        features.push({ name, description });
      }
    }
  }

  // Dependency-based feature detection (only if not already covered by source)
  if (dependencies.some(d => d.includes('openai') || d.includes('anthropic') || d.includes('groq') || d.includes('gemini') || d.includes('@google/generative-ai'))) {
    features.push({ name: 'AI / LLM Integration', description: 'Integrates large language model (LLM) providers for AI-powered generation, analysis, or conversation.' });
  }
  if (dependencies.some(d => d.includes('multer') || d.includes('formidable') || d.includes('uploadthing') || d.includes('@uploadcare'))) {
    features.push({ name: 'File Upload', description: 'Handles file upload and storage operations.' });
  }
  if (dependencies.some(d => d.includes('nodemailer') || d.includes('resend') || d.includes('@sendgrid') || d.includes('postmark'))) {
    features.push({ name: 'Email Integration', description: 'Sends transactional or notification emails via an email provider.' });
  }
  if (dependencies.some(d => d.includes('stripe') || d.includes('@stripe') || d.includes('lemonsqueezy') || d.includes('paddle'))) {
    features.push({ name: 'Payments', description: 'Processes payments and subscription billing via a payment provider.' });
  }
  if (dependencies.some(d => d.includes('algolia') || d.includes('typesense') || d.includes('meilisearch') || d.includes('elasticlunr'))) {
    features.push({ name: 'Search', description: 'Implements fast full-text search functionality.' });
  }
  if (dependencies.some(d => d.includes('socket.io') || d.includes('ws') || d.includes('pusher') || d.includes('ably') || d.includes('liveblocks'))) {
    features.push({ name: 'Real-time Updates', description: 'Delivers real-time data updates using WebSockets or a managed real-time service.' });
  }
  if (dependencies.some(d => d.includes('jspdf') || d.includes('pdfkit') || d.includes('archiver') || d.includes('jszip') || d.includes('exceljs'))) {
    features.push({ name: 'Document Export', description: 'Generates downloadable files such as PDFs, spreadsheets, or ZIP archives.' });
  }
  if (dependencies.some(d => d.includes('octokit') || d.includes('@octokit') || d.includes('github'))) {
    features.push({ name: 'GitHub Integration', description: 'Interacts with the GitHub API to read repository data, commit files, or manage workflows.' });
  }

  return features.slice(0, 12);
}

// ─── Page Route Detector ──────────────────────────────────────────────────────

function detectPageRoutes(filePaths: string[]): string[] {
  return filePaths
    .filter(f => {
      const lower = f.toLowerCase();
      return (
        (lower.includes('app/') && (lower.endsWith('page.tsx') || lower.endsWith('page.ts') || lower.endsWith('page.jsx') || lower.endsWith('page.js'))) ||
        (lower.includes('pages/') && !lower.includes('pages/api/') && (lower.endsWith('.tsx') || lower.endsWith('.ts') || lower.endsWith('.jsx') || lower.endsWith('.js')))
      );
    })
    .map(f => {
      return '/' + f
        .replace(/.*app\//, '')
        .replace(/.*pages\//, '')
        .replace(/\/page\.(tsx|ts|jsx|js)$/, '')
        .replace(/\.(tsx|ts|jsx|js)$/, '')
        .replace(/\[([^\]]+)\]/g, ':$1')
        .replace(/\/index$/, '')
        || '/';
    })
    .slice(0, 20);
}

// ─── State Management Detector ────────────────────────────────────────────────

function detectStateManagement(dependencies: string[], filePaths: string[]): string[] {
  const detected: string[] = [];
  if (dependencies.includes('zustand')) detected.push('Zustand');
  if (dependencies.includes('redux') || dependencies.includes('@reduxjs/toolkit')) detected.push('Redux Toolkit');
  if (dependencies.includes('jotai')) detected.push('Jotai');
  if (dependencies.includes('recoil')) detected.push('Recoil');
  if (dependencies.includes('mobx')) detected.push('MobX');
  if (dependencies.includes('@tanstack/react-query') || dependencies.includes('react-query')) detected.push('TanStack Query');
  if (dependencies.includes('swr')) detected.push('SWR');
  if (filePaths.some(f => f.toLowerCase().includes('/store/'))) detected.push('Custom Store');
  return detected;
}

// ─── Auth Pattern Detector ────────────────────────────────────────────────────

function detectAuth(dependencies: string[], filePaths: string[]): { provider: string; strategies: string[]; hasProtectedRoutes: boolean } | null {
  const strategies: string[] = [];
  let provider = '';

  if (dependencies.includes('next-auth') || dependencies.includes('@auth/core')) {
    provider = 'NextAuth.js';
    strategies.push('OAuth');
    if (dependencies.includes('@auth/prisma-adapter') || dependencies.includes('next-auth/prisma-adapter')) strategies.push('Database sessions');
  }
  if (dependencies.includes('clerk') || dependencies.includes('@clerk/nextjs') || dependencies.includes('@clerk/clerk-sdk-node')) {
    provider = 'Clerk';
    strategies.push('Managed auth');
  }
  if (dependencies.includes('lucia') || dependencies.includes('lucia-auth')) {
    provider = 'Lucia';
    strategies.push('Session-based');
  }
  if (dependencies.includes('jsonwebtoken') || dependencies.includes('jose')) {
    strategies.push('JWT');
    if (!provider) provider = 'Custom JWT';
  }
  if (dependencies.includes('passport')) {
    provider = provider || 'Passport.js';
    strategies.push('Strategy-based');
  }
  if (dependencies.includes('better-auth')) {
    provider = 'Better Auth';
    strategies.push('Session-based');
  }

  if (!provider) return null;

  const hasProtectedRoutes =
    filePaths.some(f => f.toLowerCase().includes('middleware')) ||
    filePaths.some(f => f.toLowerCase().includes('protected')) ||
    filePaths.some(f => f.toLowerCase().includes('auth'));

  return { provider, strategies, hasProtectedRoutes };
}

// ─── Database Detector ────────────────────────────────────────────────────────

function detectDatabase(dependencies: string[], filePaths: string[]): { type: string; orm: string; hasSchema: boolean; models: string[] } | null {
  let dbType = '';
  let orm = '';

  if (dependencies.includes('@prisma/client') || dependencies.includes('prisma')) {
    orm = 'Prisma';
    if (filePaths.some(f => f.toLowerCase().includes('schema.prisma'))) dbType = 'Relational (via Prisma)';
  }
  if (dependencies.includes('drizzle-orm')) {
    orm = 'Drizzle ORM';
    dbType = dbType || 'Relational (via Drizzle)';
  }
  if (dependencies.includes('mongoose')) {
    orm = 'Mongoose';
    dbType = 'MongoDB';
  }
  if (dependencies.includes('typeorm')) {
    orm = 'TypeORM';
    dbType = dbType || 'Relational (via TypeORM)';
  }
  if (dependencies.includes('sequelize')) {
    orm = 'Sequelize';
    dbType = dbType || 'Relational (via Sequelize)';
  }
  if (dependencies.includes('pg') || dependencies.includes('postgres') || dependencies.includes('@vercel/postgres')) {
    dbType = dbType || 'PostgreSQL';
  }
  if (dependencies.includes('mysql2') || dependencies.includes('mysql')) {
    dbType = dbType || 'MySQL';
  }
  if (dependencies.includes('better-sqlite3') || dependencies.includes('sqlite3')) {
    dbType = dbType || 'SQLite';
  }
  if (dependencies.includes('@libsql/client') || dependencies.includes('turso')) {
    dbType = dbType || 'LibSQL / Turso';
  }

  if (!dbType && !orm) return null;

  const hasSchema = filePaths.some(f =>
    f.toLowerCase().includes('schema.prisma') ||
    f.toLowerCase().includes('drizzle') ||
    f.toLowerCase().includes('schema.ts') ||
    f.toLowerCase().includes('/models/')
  );

  // Detect model names from file paths (e.g. /models/User.ts)
  const modelFiles = filePaths.filter(f =>
    f.toLowerCase().includes('/models/') || f.toLowerCase().includes('/model/')
  );
  const models = modelFiles
    .map(f => f.split('/').pop()?.replace(/\.(ts|js|prisma)$/, '') || '')
    .filter(Boolean)
    .slice(0, 10);

  return { type: dbType || 'Unknown', orm: orm || 'Direct SQL', hasSchema, models };
}

// ─── Testing Framework Detector ───────────────────────────────────────────────

function detectTestingFrameworks(dependencies: string[], filePaths: string[]): string[] {
  const detected: string[] = [];
  if (dependencies.includes('vitest')) detected.push('Vitest');
  if (dependencies.includes('jest') || dependencies.includes('@jest/core')) detected.push('Jest');
  if (dependencies.includes('@playwright/test') || dependencies.includes('playwright')) detected.push('Playwright (E2E)');
  if (dependencies.includes('cypress')) detected.push('Cypress (E2E)');
  if (dependencies.includes('@testing-library/react')) detected.push('React Testing Library');
  if (filePaths.some(f => f.toLowerCase().includes('.test.') || f.toLowerCase().includes('.spec.'))) {
    if (detected.length === 0) detected.push('Unknown framework (test files detected)');
  }
  return detected;
}

// ─── Config File Detector ─────────────────────────────────────────────────────

function detectConfigFiles(filePaths: string[]): string[] {
  const known = [
    'next.config.js', 'next.config.ts', 'next.config.mjs',
    'tailwind.config.js', 'tailwind.config.ts',
    'tsconfig.json',
    'vite.config.ts', 'vite.config.js',
    'Dockerfile',
    'docker-compose.yml', 'docker-compose.yaml',
    '.env.example', '.env.sample',
    'drizzle.config.ts', 'drizzle.config.js',
    'vitest.config.ts', 'jest.config.ts', 'jest.config.js',
    'eslint.config.js', '.eslintrc.js', '.eslintrc.json',
    '.prettierrc', 'prettier.config.js',
    'vercel.json', 'netlify.toml',
  ];
  return filePaths.filter(f => known.some(k => f.toLowerCase().endsWith(k.toLowerCase())));
}

// ─── Repository Structure Builder ────────────────────────────────────────────

function buildRepositoryStructure(filePaths: string[]): string {
  const topDirs = new Set<string>();
  const topFiles: string[] = [];

  for (const p of filePaths) {
    const parts = p.split('/');
    if (parts.length === 1) {
      topFiles.push(p);
    } else {
      topDirs.add(parts[0]);
    }
  }

  const lines: string[] = ['.'];
  for (const dir of Array.from(topDirs).sort().slice(0, 15)) {
    const subdirs = new Set<string>();
    for (const p of filePaths) {
      const parts = p.split('/');
      if (parts[0] === dir && parts.length > 2) subdirs.add(parts[1]);
    }
    if (subdirs.size > 0) {
      lines.push(`├── ${dir}/`);
      for (const sub of Array.from(subdirs).sort().slice(0, 6)) {
        lines.push(`│   ├── ${sub}/`);
      }
    } else {
      lines.push(`├── ${dir}/`);
    }
  }
  for (const f of topFiles.slice(0, 10)) {
    lines.push(`├── ${f}`);
  }

  return lines.join('\n');
}

// ─── Main Analyzer ────────────────────────────────────────────────────────────

export class RepositoryAnalyzer {

  static async analyze(owner: string, repo: string): Promise<Omit<RepositoryAnalysisResult, 'analysisId'>> {
    // 1. Fetch GitHub metadata and file tree
    const metadata = await RepositoryService.getMetadata(owner, repo);
    const languages = await RepositoryService.getLanguages(owner, repo);
    const tree = await RepositoryService.getTree(owner, repo, metadata.defaultBranch);
    const filePaths = tree.files.map(f => f.path);

    // 2. Classify files by importance
    const importantFilePaths = filePaths.filter(p => {
      const importance = classifyFile(p);
      return importance === 'CORE' || importance === 'IMPORTANT' || importance === 'CONFIGURATION';
    });

    // 3. Fetch core configuration files in parallel
    const [packageJson, envExample, readmeContent] = await Promise.all([
      FileReader.getPackageJson(owner, repo, metadata.defaultBranch),
      FileReader.getFileContent(owner, repo, '.env.example', metadata.defaultBranch)
        .then(c => c || FileReader.getFileContent(owner, repo, '.env.sample', metadata.defaultBranch))
        .then(c => c || FileReader.getFileContent(owner, repo, '.env.local.example', metadata.defaultBranch)),
      FileReader.getFileContent(owner, repo, 'README.md', metadata.defaultBranch),
    ]);

    // 4. Parse package.json for dependencies and scripts
    const allDependencies = PackageAnalyzer.getDependencies(packageJson);
    const devDependencies = packageJson?.devDependencies ? Object.keys(packageJson.devDependencies) : [];
    const scripts = PackageAnalyzer.getScripts(packageJson);
    const packageManager = PackageAnalyzer.getPackageManager(packageJson, filePaths);

    // 5. Parse environment variable keys from .env.example
    const envVarKeys = envExample
      ? envExample
          .split('\n')
          .filter(line => line.trim() && !line.trim().startsWith('#'))
          .map(line => line.split('=')[0].trim())
          .filter(Boolean)
      : [];

    // 6. Detect technologies and project type
    const technologies = TechnologyDetector.detect(allDependencies, filePaths);
    const projectType = ProjectTypeDetector.detect(technologies, filePaths, packageJson);

    // 7. Read actual source files for deep documentation grounding
    const sourceFiles = await readSourceFiles(owner, repo, metadata.defaultBranch, filePaths);

    // 8. Deep intelligence detection (now source-aware)
    const apiEndpoints = analyzeApiRoutesFromSource(filePaths, sourceFiles);
    const pageRoutes = detectPageRoutes(filePaths);
    const stateManagement = detectStateManagement(allDependencies, filePaths);
    const authInfo = detectAuth(allDependencies, filePaths);
    const dbInfo = detectDatabase(allDependencies, filePaths);
    const testingFrameworks = detectTestingFrameworks(allDependencies, filePaths);
    const configFiles = detectConfigFiles(filePaths);
    const features = extractFeaturesFromSource(filePaths, allDependencies, pageRoutes, apiEndpoints, authInfo, dbInfo, sourceFiles);
    const repositoryStructure = buildRepositoryStructure(importantFilePaths.length > 0 ? importantFilePaths : filePaths);

    const hasDocker = filePaths.some(f => f.toLowerCase() === 'dockerfile' || f.toLowerCase().includes('docker-compose'));
    const hasCi = filePaths.some(f =>
      f.toLowerCase().includes('.github/workflows/') ||
      f.toLowerCase().includes('.gitlab-ci') ||
      f.toLowerCase().includes('circleci') ||
      f.toLowerCase().includes('jenkins')
    );

    // 9. Infer framework and styling
    const framework = technologies.find(t => t.category === 'Framework')?.name || 'None detected';
    const styling = technologies.find(t => t.category === 'Styling')?.name || 'None detected';

    // 10. Gather project signals
    const signals: ProjectSignal[] = [];
    if (packageManager !== 'unknown') signals.push({ type: 'Package Manager', value: packageManager });
    if (technologies.some(t => t.name === 'TypeScript')) {
      signals.push({ type: 'Language', value: 'TypeScript' });
    } else if (metadata.primaryLanguage) {
      signals.push({ type: 'Language', value: metadata.primaryLanguage });
    }
    if (hasDocker) signals.push({ type: 'Infrastructure', value: 'Docker' });
    if (hasCi) signals.push({ type: 'CI/CD', value: 'Automated pipelines detected' });
    if (authInfo) signals.push({ type: 'Authentication', value: authInfo.provider });
    if (dbInfo) signals.push({ type: 'Database', value: `${dbInfo.type} via ${dbInfo.orm}` });
    if (stateManagement.length > 0) signals.push({ type: 'State Management', value: stateManagement.join(', ') });
    if (testingFrameworks.length > 0) signals.push({ type: 'Testing', value: testingFrameworks.join(', ') });
    envVarKeys.forEach(k => signals.push({ type: 'Environment', value: k }));

    // Store rich API route intelligence in signals for ContextBuilder to consume.
    // The full DetectedApiRoute is JSON-encoded so ContextBuilder can reconstruct it exactly.
    apiEndpoints.forEach(ep => signals.push({
      type: 'API Route',
      value: JSON.stringify(ep),
    }));
    pageRoutes.forEach(pr => signals.push({ type: 'Page Route', value: pr }));
    features.forEach(ft => signals.push({ type: 'Feature', value: `${ft.name}: ${ft.description}` }));

    // 11. Score documentation readiness
    const readinessDetails = Scoring.calculate(metadata, filePaths, packageJson, packageManager);

    // 12. Assemble result
    return {
      repositoryName: metadata.name,
      owner: metadata.ownerLogin,
      url: metadata.htmlUrl,
      description: metadata.description || '',
      primaryLanguage: metadata.primaryLanguage || 'Unknown',
      projectType,
      packageManager,
      framework,
      styling,
      mainBranch: metadata.defaultBranch,
      status: metadata.isArchived ? 'Archived' : 'Active',
      technologies,
      signals,
      scripts,
      readinessScore: readinessDetails.score,
      readinessDetails,
      metadata,
      languages,
      tree,
      sourceFiles,
    };
  }
}
