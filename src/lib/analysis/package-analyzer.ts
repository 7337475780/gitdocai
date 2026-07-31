import { RepositoryScript } from '../../types';

export class PackageAnalyzer {
  
  static getScripts(packageJson: any): RepositoryScript[] {
    if (!packageJson || !packageJson.scripts) {
      return [];
    }

    return Object.entries(packageJson.scripts).map(([name, command]) => ({
      name,
      command: command as string,
    }));
  }

  static getDependencies(packageJson: any): string[] {
    if (!packageJson) return [];
    
    return [
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.devDependencies || {}),
      ...Object.keys(packageJson.peerDependencies || {}),
    ];
  }

  static getPackageManager(packageJson: any, files: string[]): string {
    // 1. Check packageManager field in package.json
    if (packageJson?.packageManager) {
      if (packageJson.packageManager.includes('pnpm')) return 'pnpm';
      if (packageJson.packageManager.includes('yarn')) return 'Yarn';
      if (packageJson.packageManager.includes('npm')) return 'npm';
      if (packageJson.packageManager.includes('bun')) return 'Bun';
    }

    // 2. Check lock files
    if (files.includes('pnpm-lock.yaml')) return 'pnpm';
    if (files.includes('yarn.lock')) return 'Yarn';
    if (files.includes('package-lock.json')) return 'npm';
    if (files.includes('bun.lockb') || files.includes('bun.lock')) return 'Bun';

    return 'unknown';
  }
}
