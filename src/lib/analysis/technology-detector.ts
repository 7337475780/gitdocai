import { DetectedTechnology } from '../../types';

export class TechnologyDetector {
  
  static detect(dependencies: string[], files: string[]): DetectedTechnology[] {
    const techs: DetectedTechnology[] = [];
    
    // Frameworks
    if (dependencies.includes('next')) {
      techs.push({
        name: 'Next.js',
        category: 'Framework',
        confidence: 'high',
        evidence: ['dependency: next'],
        iconName: 'Globe',
      });
    }
    
    if (dependencies.includes('react') || dependencies.includes('react-dom')) {
      // Don't duplicate React as a Framework if Next.js is present
      const isNext = dependencies.includes('next');
      techs.push({
        name: 'React',
        category: isNext ? 'UI Library' : 'Framework',
        confidence: 'high',
        evidence: ['dependency: react'],
        iconName: 'Library',
      });
    }

    if (dependencies.includes('vue')) {
      techs.push({
        name: 'Vue',
        category: 'Framework',
        confidence: 'high',
        evidence: ['dependency: vue'],
        iconName: 'Globe',
      });
    }

    if (dependencies.includes('express')) {
      techs.push({
        name: 'Express',
        category: 'Backend Framework',
        confidence: 'high',
        evidence: ['dependency: express'],
        iconName: 'Server',
      });
    }

    // Styling
    if (dependencies.includes('tailwindcss') || files.some(f => f.includes('tailwind.config'))) {
      techs.push({
        name: 'Tailwind CSS',
        category: 'Styling',
        confidence: 'high',
        evidence: ['Tailwind configuration or dependency detected'],
        iconName: 'Palette',
      });
    }

    // Language / Typed
    if (dependencies.includes('typescript') || files.includes('tsconfig.json')) {
      techs.push({
        name: 'TypeScript',
        category: 'Language',
        confidence: 'high',
        evidence: ['TypeScript configuration or dependency detected'],
        iconName: 'FileCode2',
      });
    }

    // Databases & ORMs
    if (dependencies.includes('prisma') || dependencies.includes('@prisma/client') || files.some(f => f.includes('schema.prisma'))) {
      techs.push({
        name: 'Prisma',
        category: 'ORM',
        confidence: 'high',
        evidence: ['Prisma schema or dependency detected'],
        iconName: 'Server',
      });
    }

    // Infrastructure
    if (files.includes('Dockerfile') || files.some(f => f.includes('docker-compose'))) {
      techs.push({
        name: 'Docker',
        category: 'Infrastructure',
        confidence: 'high',
        evidence: ['Docker configuration files detected'],
        iconName: 'Package',
      });
    }
    
    return techs;
  }
}
