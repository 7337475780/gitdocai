import { DocumentationReadiness, RepositoryMetadata } from '../../types';

export class Scoring {
  
  static calculate(
    metadata: RepositoryMetadata, 
    files: string[], 
    packageJson: any, 
    packageManager: string
  ): DocumentationReadiness {
    let score = 0;
    const present: string[] = [];
    const recommended: string[] = [];

    // 1. Repository Basics (30 points)
    if (metadata.description) {
      score += 10;
      present.push('Repository description');
    } else {
      recommended.push('Add a repository description');
    }

    if (files.some(f => f.toLowerCase() === 'readme.md')) {
      score += 15;
      present.push('README file');
    } else {
      recommended.push('Add a README.md file');
    }

    if (metadata.license || files.some(f => f.toLowerCase() === 'license' || f.toLowerCase() === 'license.md')) {
      score += 5;
      present.push('Open source license');
    } else {
      recommended.push('Add an open source license');
    }

    // 2. Setup Information (30 points)
    if (packageManager !== 'unknown') {
      score += 10;
      present.push(`${packageManager} package manager detected`);
    } else {
      recommended.push('Define a clear package manager');
    }

    if (packageJson && packageJson.scripts && Object.keys(packageJson.scripts).length > 0) {
      score += 10;
      present.push('Project scripts defined');
    } else {
      recommended.push('Define project scripts (start, build, etc.)');
    }

    if (files.some(f => f.includes('.env.example') || f.includes('.env.sample'))) {
      score += 10;
      present.push('Environment example file');
    } else if (files.some(f => f.includes('.env'))) {
      recommended.push('Create a safe .env.example file');
    } else {
      // It's possible the project doesn't need env vars. Give partial credit.
      score += 10; 
    }

    // 3. Developer Experience (40 points)
    let hasTest = false;
    let hasLint = false;
    
    if (packageJson && packageJson.scripts) {
      hasTest = Object.keys(packageJson.scripts).some(k => k.includes('test'));
      hasLint = Object.keys(packageJson.scripts).some(k => k.includes('lint'));
    }

    if (hasTest) {
      score += 15;
      present.push('Test scripts available');
    } else {
      recommended.push('Add testing scripts');
    }

    if (hasLint) {
      score += 10;
      present.push('Linting configured');
    } else {
      recommended.push('Add linting scripts');
    }

    if (files.some(f => f.includes('.github/workflows/'))) {
      score += 10;
      present.push('CI/CD workflows detected');
    } else {
      recommended.push('Setup CI/CD workflows');
    }

    if (files.some(f => f.toLowerCase() === 'contributing.md')) {
      score += 5;
      present.push('Contribution guidelines');
    } else {
      recommended.push('Add CONTRIBUTING.md guidelines');
    }

    // Determine Label
    let label = 'Needs Improvement';
    if (score >= 90) label = 'Excellent Foundation';
    else if (score >= 70) label = 'Good Foundation';
    else if (score >= 50) label = 'Fair Foundation';

    return {
      score,
      label,
      present,
      recommended,
    };
  }
}
