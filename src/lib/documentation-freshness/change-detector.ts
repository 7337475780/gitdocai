import { RepositoryFileManifest, RepositoryChange, RepositoryChangeType, ChangeImportance } from './freshness-types';

export const changeDetector = {
  detectChanges(baseline: RepositoryFileManifest, latest: RepositoryFileManifest): RepositoryChange[] {
    const changes: RepositoryChange[] = [];

    const baselineFiles = baseline.files || {};
    const latestFiles = latest.files || {};

    const addedPaths: string[] = [];
    const removedPaths: string[] = [];
    const modifiedPaths: string[] = [];

    // Detect added and modified files
    for (const [path, info] of Object.entries(latestFiles)) {
      if (!baselineFiles[path]) {
        addedPaths.push(path);
      } else if (baselineFiles[path].hash !== info.hash) {
        modifiedPaths.push(path);
      }
    }

    // Detect removed files
    for (const path of Object.keys(baselineFiles)) {
      if (!latestFiles[path]) {
        removedPaths.push(path);
      }
    }

    // Detect renamed files heuristic (matching hash)
    const processedAdded = new Set<string>();
    const processedRemoved = new Set<string>();

    for (const remPath of removedPaths) {
      const remHash = baselineFiles[remPath]?.hash;
      if (!remHash) continue;

      for (const addPath of addedPaths) {
        if (processedAdded.has(addPath)) continue;
        const addHash = latestFiles[addPath]?.hash;
        if (remHash === addHash) {
          changes.push({
            type: RepositoryChangeType.FILE_RENAMED,
            path: addPath,
            previousPath: remPath,
            importance: this.assessFileImportance(addPath),
            summary: `File renamed from ${remPath} to ${addPath}`,
            confidence: 95,
          });
          processedAdded.add(addPath);
          processedRemoved.add(remPath);
          break;
        }
      }
    }

    // Unmatched added files
    for (const addPath of addedPaths) {
      if (!processedAdded.has(addPath)) {
        const changeType = this.categorizePathChange(addPath, RepositoryChangeType.FILE_ADDED);
        changes.push({
          type: changeType,
          path: addPath,
          importance: this.assessFileImportance(addPath, changeType),
          summary: `File added: ${addPath}`,
          confidence: 90,
        });
      }
    }

    // Unmatched removed files
    for (const remPath of removedPaths) {
      if (!processedRemoved.has(remPath)) {
        const changeType = this.categorizePathChange(remPath, RepositoryChangeType.FILE_REMOVED);
        changes.push({
          type: changeType,
          path: remPath,
          importance: this.assessFileImportance(remPath, changeType),
          summary: `File removed: ${remPath}`,
          confidence: 90,
        });
      }
    }

    // Modified files
    for (const modPath of modifiedPaths) {
      const changeType = this.categorizePathChange(modPath, RepositoryChangeType.FILE_MODIFIED);
      changes.push({
        type: changeType,
        path: modPath,
        importance: this.assessFileImportance(modPath, changeType),
        summary: `File modified: ${modPath}`,
        confidence: 85,
      });
    }

    // Script changes
    const baseScripts = baseline.scripts || {};
    const latestScripts = latest.scripts || {};
    for (const [name, command] of Object.entries(latestScripts)) {
      if (!baseScripts[name]) {
        changes.push({
          type: RepositoryChangeType.SCRIPT_CHANGED,
          path: 'package.json',
          importance: 'HIGH',
          summary: `New script added: "${name}": "${command}"`,
          evidence: `script:${name}`,
          confidence: 100,
        });
      } else if (baseScripts[name] !== command) {
        changes.push({
          type: RepositoryChangeType.SCRIPT_CHANGED,
          path: 'package.json',
          importance: 'HIGH',
          summary: `Script "${name}" changed from "${baseScripts[name]}" to "${command}"`,
          evidence: `script:${name}`,
          confidence: 100,
        });
      }
    }
    for (const name of Object.keys(baseScripts)) {
      if (!latestScripts[name]) {
        changes.push({
          type: RepositoryChangeType.SCRIPT_CHANGED,
          path: 'package.json',
          importance: 'CRITICAL',
          summary: `Script removed: "${name}"`,
          evidence: `removed_script:${name}`,
          confidence: 100,
        });
      }
    }

    // Dependency changes
    const baseDeps = baseline.dependencies || {};
    const latestDeps = latest.dependencies || {};
    for (const [pkg, ver] of Object.entries(latestDeps)) {
      if (!baseDeps[pkg]) {
        changes.push({
          type: RepositoryChangeType.DEPENDENCY_CHANGED,
          path: 'package.json',
          importance: 'MEDIUM',
          summary: `Dependency added: ${pkg}@${ver}`,
          confidence: 95,
        });
      } else if (baseDeps[pkg] !== ver) {
        changes.push({
          type: RepositoryChangeType.DEPENDENCY_CHANGED,
          path: 'package.json',
          importance: 'MEDIUM',
          summary: `Dependency version changed: ${pkg} (${baseDeps[pkg]} -> ${ver})`,
          confidence: 90,
        });
      }
    }
    for (const [pkg, ver] of Object.entries(baseDeps)) {
      if (!latestDeps[pkg]) {
        changes.push({
          type: RepositoryChangeType.DEPENDENCY_CHANGED,
          path: 'package.json',
          importance: 'HIGH',
          summary: `Dependency removed: ${pkg}@${ver}`,
          evidence: `removed_package:${pkg}`,
          confidence: 95,
        });
      }
    }

    // Environment variable changes
    const baseEnv = new Set(baseline.envVars || []);
    const latestEnv = new Set(latest.envVars || []);
    for (const envVar of latestEnv) {
      if (!baseEnv.has(envVar)) {
        changes.push({
          type: RepositoryChangeType.ENVIRONMENT_CHANGED,
          path: '.env',
          importance: 'HIGH',
          summary: `Environment variable added: ${envVar}`,
          confidence: 95,
        });
      }
    }
    for (const envVar of baseEnv) {
      if (!latestEnv.has(envVar)) {
        changes.push({
          type: RepositoryChangeType.ENVIRONMENT_CHANGED,
          path: '.env',
          importance: 'CRITICAL',
          summary: `Environment variable removed: ${envVar}`,
          evidence: `removed_env_var:${envVar}`,
          confidence: 100,
        });
      }
    }

    // API Route changes
    const baseApi = new Set(baseline.apiRoutes || []);
    const latestApi = new Set(latest.apiRoutes || []);
    for (const route of latestApi) {
      if (!baseApi.has(route)) {
        changes.push({
          type: RepositoryChangeType.API_CHANGED,
          path: route,
          importance: 'HIGH',
          summary: `API endpoint added: ${route}`,
          confidence: 95,
        });
      }
    }
    for (const route of baseApi) {
      if (!latestApi.has(route)) {
        changes.push({
          type: RepositoryChangeType.API_CHANGED,
          path: route,
          importance: 'CRITICAL',
          summary: `API endpoint removed: ${route}`,
          evidence: `removed_api_endpoint:${route}`,
          confidence: 100,
        });
      }
    }

    return changes;
  },

  categorizePathChange(path: string, defaultType: RepositoryChangeType): RepositoryChangeType {
    const lower = path.toLowerCase();
    if (lower.includes('package.json') || lower.includes('pnpm-lock') || lower.includes('package-lock')) {
      return RepositoryChangeType.DEPENDENCY_CHANGED;
    }
    if (lower.endsWith('.env') || lower.includes('.env.')) {
      return RepositoryChangeType.ENVIRONMENT_CHANGED;
    }
    if (lower.includes('/api/') || lower.includes('/routes/') || lower.includes('/controllers/')) {
      return RepositoryChangeType.API_CHANGED;
    }
    if (lower.endsWith('.prisma') || lower.includes('/migrations/') || lower.includes('/models/') || lower.includes('/schema/')) {
      return RepositoryChangeType.DATABASE_CHANGED;
    }
    if (lower.includes('docker') || lower.endsWith('.dockerfile') || lower.includes('docker-compose')) {
      return RepositoryChangeType.DOCKER_CHANGED;
    }
    if (lower.includes('.github/workflows') || lower.includes('.gitlab-ci') || lower.includes('circleci')) {
      return RepositoryChangeType.CI_CHANGED;
    }
    if (lower.includes('/auth/') || lower.includes('session') || lower.includes('passport') || lower.includes('jwt')) {
      return RepositoryChangeType.AUTHENTICATION_CHANGED;
    }
    if (lower.endsWith('.config.js') || lower.endsWith('.config.ts') || lower.endsWith('.json') || lower.endsWith('.yaml') || lower.endsWith('.yml')) {
      return RepositoryChangeType.CONFIGURATION_CHANGED;
    }
    return defaultType;
  },

  assessFileImportance(path: string, type?: RepositoryChangeType): ChangeImportance {
    const lower = path.toLowerCase();

    // LOW Importance: Styling, internal utility tests, docs
    if (
      lower.endsWith('.css') ||
      lower.endsWith('.scss') ||
      lower.endsWith('.less') ||
      lower.includes('.test.') ||
      lower.includes('.spec.') ||
      lower.includes('/__tests__/')
    ) {
      return 'LOW';
    }

    // CRITICAL Importance: Essential env, main entry, schema removal
    if (type === RepositoryChangeType.ENVIRONMENT_CHANGED || type === RepositoryChangeType.FILE_REMOVED) {
      return 'CRITICAL';
    }

    // HIGH Importance: Core API routes, DB schema, package.json, docker, env
    if (
      lower.includes('package.json') ||
      lower.endsWith('.env') ||
      lower.endsWith('.prisma') ||
      lower.includes('/api/') ||
      lower.includes('/routes/') ||
      lower.includes('/auth/') ||
      lower.includes('docker-compose')
    ) {
      return 'HIGH';
    }

    // MEDIUM Importance: Application modules, configurations, components
    return 'MEDIUM';
  }
};
