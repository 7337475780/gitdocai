import { DetectedTechnology } from '../../types';

export class ProjectTypeDetector {
  
  static detect(techs: DetectedTechnology[], files: string[], packageJson: any): string {
    const techNames = techs.map(t => t.name.toLowerCase());
    
    // Monorepo Check
    if (
      files.includes('pnpm-workspace.yaml') || 
      files.includes('turbo.json') || 
      files.includes('nx.json') || 
      files.includes('lerna.json') ||
      files.some(f => f.startsWith('packages/') || f.startsWith('apps/'))
    ) {
      return 'Monorepo';
    }

    // Full-stack Frameworks
    if (techNames.includes('next.js') || techNames.includes('nuxt') || techNames.includes('sveltekit') || techNames.includes('remix')) {
      return 'Full-stack Web Application';
    }

    // Backend APIs
    if (techNames.includes('express') || techNames.includes('nestjs') || techNames.includes('fastify')) {
      return 'Backend API';
    }

    // Frontend Single Page Apps
    if (techNames.includes('react') || techNames.includes('vue') || techNames.includes('svelte') || techNames.includes('angular')) {
      return 'Frontend Web Application';
    }

    // Libraries / Packages
    if (packageJson && !packageJson.private && (packageJson.main || packageJson.exports)) {
      return 'Library / Package';
    }

    // Python / Data Science
    if (files.includes('requirements.txt') || files.includes('pyproject.toml')) {
      return 'Data Science / Python Project';
    }

    return 'Unknown Project Type';
  }
}
