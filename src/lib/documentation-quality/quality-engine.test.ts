import { describe, it, expect } from 'vitest';
import { QualityEngine } from './quality-engine';
import { RepositoryAnalysisResult } from '@/types';

describe('QualityEngine', () => {
  const mockAnalysisBase: RepositoryAnalysisResult = {
    analysisId: 'test-analysis',
    repositoryName: 'test-repo',
    owner: 'test-owner',
    url: 'https://github.com/test-owner/test-repo',
    description: 'A mock repository for testing quality checks.',
    primaryLanguage: 'TypeScript',
    projectType: 'fullstack',
    packageManager: 'npm',
    framework: 'next',
    styling: 'tailwind',
    mainBranch: 'main',
    status: 'completed',
    technologies: [
      { name: 'React', category: 'Frontend Framework', confidence: 'high', evidence: [] },
      { name: 'Prisma', category: 'Database ORM', confidence: 'high', evidence: [] },
      { name: 'PostgreSQL', category: 'Database', confidence: 'high', evidence: [] },
    ],
    signals: [],
    scripts: [
      { name: 'dev', command: 'next dev' },
      { name: 'build', command: 'next build' },
      { name: 'test', command: 'vitest' },
    ],
    readinessScore: 90,
    readinessDetails: { score: 90, label: 'Ready', present: [], recommended: [] },
    metadata: {
      name: 'test-repo',
      fullName: 'test-owner/test-repo',
      ownerLogin: 'test-owner',
      ownerAvatar: '',
      description: 'A mock repository',
      htmlUrl: '',
      defaultBranch: 'main',
      visibility: 'public',
      isArchived: false,
      isFork: false,
      size: 1000,
      stars: 10,
      forks: 2,
      openIssues: 0,
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z',
      primaryLanguage: 'TypeScript',
      license: 'MIT',
    },
    languages: [{ name: 'TypeScript', bytes: 10000, percentage: 100 }],
    tree: {
      truncated: false,
      files: [
        { path: 'package.json', type: 'blob' },
        { path: 'tsconfig.json', type: 'blob' },
        { path: '.env.example', type: 'blob' },
      ],
    },
  };

  it('should score 100 for a perfectly complete README', () => {
    const perfectReadme = `# test-repo

A mock repository built with React and Prisma for testing quality checks. This is a complete explanation of the project purpose and functionality.

## Prerequisites

Ensure you have Node.js version 18 or higher installed on your local machine.

## Installation

\`\`\`bash
npm install
\`\`\`

## Environment Variables

Copy the configuration template:
\`\`\`bash
cp .env.example .env
\`\`\`
Fill in the database url keys:
- DATABASE_URL: PostgreSQL connection string.

## Usage

Start the development server locally:
\`\`\`bash
npm run dev
\`\`\`

## Available Scripts

- \`npm run dev\`: Runs local dev server.
- \`npm run build\`: Builds production package.
- \`npm run test\`: Executes tests.

## API Documentation

The server exposes endpoints under the \`/api\` path:
- GET \`/api/users\`: Retrieves a list of users.

## Testing

Run unit tests via vitest:
\`\`\`bash
npm run test
\`\`\`

## Contributing

Pull requests are welcome. Please open an issue to discuss proposed changes first.

## License

This project is licensed under the MIT License.
`;

    const result = QualityEngine.evaluate(perfectReadme, mockAnalysisBase);
    expect(result.overallScore).toBe(100);
    expect(result.issues.length).toBe(0);
    expect(result.strengths.length).toBeGreaterThanOrEqual(4);
    expect(result.categories.clarity.score).toBe(20);
    expect(result.categories.setup.score).toBe(20);
    expect(result.categories.usage.score).toBe(20);
    expect(result.categories.repositoryCoverage.score).toBe(15);
    expect(result.categories.structure.score).toBe(15);
    expect(result.categories.maintenance.score).toBe(10);
  });

  it('should detect missing H1 title (DOC001)', () => {
    const badReadme = `No title here. Just text.`;
    const result = QualityEngine.evaluate(badReadme, mockAnalysisBase);
    const hasDoc001 = result.issues.some(i => i.id === 'DOC001');
    expect(hasDoc001).toBe(true);
    expect(result.categories.clarity.score).toBe(0); // Deducted 20 points
  });

  it('should detect missing installation (DOC003) when package.json exists', () => {
    const readme = `# Title\n\nIntroduction text explaining project purpose in detail.`;
    const result = QualityEngine.evaluate(readme, mockAnalysisBase);
    const hasDoc003 = result.issues.some(i => i.id === 'DOC003');
    expect(hasDoc003).toBe(true);
    expect(result.categories.setup.score).toBe(0);
  });

  it('should detect missing environment configuration (DOC006) when .env.example exists', () => {
    const readme = `# Title\n\nIntroduction text explaining project purpose in detail.\n\n## Installation\n\n\`npm install\``;
    const result = QualityEngine.evaluate(readme, mockAnalysisBase);
    const hasDoc006 = result.issues.some(i => i.id === 'DOC006');
    expect(hasDoc006).toBe(true);
  });

  it('should detect missing Docker setup (DOC010) when dockerfile is in tree', () => {
    const analysisWithDocker: RepositoryAnalysisResult = {
      ...mockAnalysisBase,
      tree: {
        truncated: false,
        files: [
          { path: 'package.json', type: 'blob' },
          { path: 'Dockerfile', type: 'blob' },
          { path: 'docker-compose.yml', type: 'blob' },
        ],
      },
    };
    const readmeWithoutDocker = `# Title\n\nIntro text explaining project purpose in detail.\n\n## Installation\n\n\`npm install\``;
    const result = QualityEngine.evaluate(readmeWithoutDocker, analysisWithDocker);
    const hasDoc010 = result.issues.some(i => i.id === 'DOC010');
    expect(hasDoc010).toBe(true);
  });

  it('should detect missing API documentation (DOC009) when API routes exist', () => {
    const analysisWithApi: RepositoryAnalysisResult = {
      ...mockAnalysisBase,
      tree: {
        truncated: false,
        files: [
          { path: 'package.json', type: 'blob' },
          { path: 'src/app/api/users/route.ts', type: 'blob' },
        ],
      },
    };
    const readmeWithoutApi = `# Title\n\nIntro text explaining project purpose in detail.\n\n## Installation\n\n\`npm install\``;
    const result = QualityEngine.evaluate(readmeWithoutApi, analysisWithApi);
    const hasDoc009 = result.issues.some(i => i.id === 'DOC009');
    expect(hasDoc009).toBe(true);
  });

  it('should not require API docs for a frontend project (DOC009)', () => {
    const analysisFrontend: RepositoryAnalysisResult = {
      ...mockAnalysisBase,
      projectType: 'frontend',
      tree: {
        truncated: false,
        files: [
          { path: 'package.json', type: 'blob' },
          { path: 'src/app/api/users/route.ts', type: 'blob' }, // Mock routes but frontend config
        ],
      },
    };
    const readmeWithoutApi = `# Title\n\nIntro text explaining project purpose in detail.\n\n## Installation\n\n\`npm install\``;
    const result = QualityEngine.evaluate(readmeWithoutApi, analysisFrontend);
    const hasDoc009 = result.issues.some(i => i.id === 'DOC009');
    expect(hasDoc009).toBe(false);
  });

  it('should detect duplicate headings (DOC011)', () => {
    const readme = `# Title\n\nIntro text explaining project purpose in detail.\n\n## Setup\n\nFirst setup\n\n## Setup\n\nSecond setup`;
    const result = QualityEngine.evaluate(readme, mockAnalysisBase);
    const hasDoc011 = result.issues.some(i => i.id === 'DOC011');
    expect(hasDoc011).toBe(true);
  });

  it('should detect empty sections (DOC013)', () => {
    const readme = `# Title\n\nIntro text explaining project purpose.\n\n## Setup\n\n`;
    const result = QualityEngine.evaluate(readme, mockAnalysisBase);
    const hasDoc013 = result.issues.some(i => i.id === 'DOC013');
    expect(hasDoc013).toBe(true);
  });

  it('should detect heading level jumps (DOC012)', () => {
    const readme = `# Title\n\nIntro text explaining project purpose.\n\n### Nested Section\n\nContent here.`;
    const result = QualityEngine.evaluate(readme, mockAnalysisBase);
    const hasDoc012 = result.issues.some(i => i.id === 'DOC012');
    expect(hasDoc012).toBe(true);
  });

  it('should detect placeholder text (DOC014)', () => {
    const readme = `# Title\n\nIntro text explaining project purpose.\n\nTODO: Write description here.`;
    const result = QualityEngine.evaluate(readme, mockAnalysisBase);
    const hasDoc014 = result.issues.some(i => i.id === 'DOC014');
    expect(hasDoc014).toBe(true);
  });

  it('should remain within score boundaries [0, 100]', () => {
    const emptyReadme = ``;
    const result = QualityEngine.evaluate(emptyReadme, mockAnalysisBase);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  it('should generate same score for identical input', () => {
    const readme = `# Title\n\nThis is an intro section explaining what the repository is.\n\n## Installation\n\n\`npm install\``;
    const r1 = QualityEngine.evaluate(readme, mockAnalysisBase);
    const r2 = QualityEngine.evaluate(readme, mockAnalysisBase);
    expect(r1.overallScore).toBe(r2.overallScore);
    expect(r1.issues.length).toBe(r2.issues.length);
  });
});
