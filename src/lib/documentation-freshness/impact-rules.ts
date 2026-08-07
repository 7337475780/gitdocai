import { RepositoryChangeType } from './freshness-types';

export interface DocumentRule {
  documentType: string; // 'README' | 'SETUP' | 'ARCHITECTURE' | 'API' | 'CONTRIBUTING'
  relevantChangeTypes: RepositoryChangeType[];
  headingKeywords: Record<string, string[]>;
}

export const DOCUMENT_IMPACT_RULES: Record<string, DocumentRule> = {
  README: {
    documentType: 'README',
    relevantChangeTypes: [
      RepositoryChangeType.SCRIPT_CHANGED,
      RepositoryChangeType.DEPENDENCY_CHANGED,
      RepositoryChangeType.ENVIRONMENT_CHANGED,
      RepositoryChangeType.API_CHANGED,
      RepositoryChangeType.ARCHITECTURE_CHANGED,
      RepositoryChangeType.CONFIGURATION_CHANGED,
      RepositoryChangeType.FILE_ADDED,
      RepositoryChangeType.FILE_REMOVED,
    ],
    headingKeywords: {
      'scripts': ['script', 'commands', 'npm run', 'yarn', 'pnpm', 'available scripts'],
      'installation': ['install', 'getting started', 'quick start', 'setup'],
      'configuration': ['environment', 'env', 'config', 'configuration'],
      'architecture': ['architecture', 'structure', 'project structure', 'overview'],
      'api': ['api', 'endpoints', 'routes', 'usage'],
    },
  },
  SETUP: {
    documentType: 'SETUP',
    relevantChangeTypes: [
      RepositoryChangeType.DEPENDENCY_CHANGED,
      RepositoryChangeType.ENVIRONMENT_CHANGED,
      RepositoryChangeType.DATABASE_CHANGED,
      RepositoryChangeType.DOCKER_CHANGED,
      RepositoryChangeType.CONFIGURATION_CHANGED,
      RepositoryChangeType.SCRIPT_CHANGED,
    ],
    headingKeywords: {
      'prerequisites': ['prerequisites', 'requirements', 'dependencies', 'node version'],
      'installation': ['installation', 'install', 'setup', 'getting started'],
      'environment': ['environment variables', 'env', '.env', 'configuration'],
      'database': ['database', 'db', 'prisma', 'migration'],
      'docker': ['docker', 'container', 'docker-compose'],
      'running': ['running', 'start', 'dev server', 'scripts'],
    },
  },
  ARCHITECTURE: {
    documentType: 'ARCHITECTURE',
    relevantChangeTypes: [
      RepositoryChangeType.ARCHITECTURE_CHANGED,
      RepositoryChangeType.DATABASE_CHANGED,
      RepositoryChangeType.AUTHENTICATION_CHANGED,
      RepositoryChangeType.FILE_ADDED,
      RepositoryChangeType.FILE_REMOVED,
      RepositoryChangeType.FILE_RENAMED,
      RepositoryChangeType.CONFIGURATION_CHANGED,
    ],
    headingKeywords: {
      'system': ['system overview', 'overview', 'high level', 'architecture'],
      'services': ['services', 'modules', 'packages', 'components'],
      'data': ['database', 'data model', 'schema', 'persistence'],
      'auth': ['auth', 'authentication', 'security', 'session'],
      'structure': ['folder structure', 'directory layout', 'codebase layout'],
    },
  },
  API: {
    documentType: 'API',
    relevantChangeTypes: [
      RepositoryChangeType.API_CHANGED,
      RepositoryChangeType.AUTHENTICATION_CHANGED,
      RepositoryChangeType.ENVIRONMENT_CHANGED,
    ],
    headingKeywords: {
      'endpoints': ['endpoints', 'routes', 'api reference', 'resources'],
      'authentication': ['auth', 'authentication', 'headers', 'tokens'],
      'requests': ['request', 'payload', 'body', 'parameters'],
      'responses': ['response', 'errors', 'status codes'],
    },
  },
  CONTRIBUTING: {
    documentType: 'CONTRIBUTING',
    relevantChangeTypes: [
      RepositoryChangeType.SCRIPT_CHANGED,
      RepositoryChangeType.CI_CHANGED,
      RepositoryChangeType.CONFIGURATION_CHANGED,
    ],
    headingKeywords: {
      'testing': ['test', 'testing', 'unit test', 'e2e'],
      'linting': ['lint', 'formatting', 'prettier', 'eslint'],
      'workflow': ['workflow', 'pull request', 'pr', 'branching', 'ci'],
    },
  },
};
