import { describe, it, expect } from 'vitest';
import { SectionDeduplicator } from './section-deduplicator';

describe('SectionDeduplicator', () => {

  it('strips outer markdown code fence wrapper', () => {
    const input = '```markdown\n# My App\n\n## Overview\n\nGreat app.\n```';
    const result = SectionDeduplicator.deduplicate(input);
    expect(result).toContain('# My App');
    expect(result).not.toContain('```markdown');
    expect(result.startsWith('```')).toBe(false);
  });

  it('strips outer md code fence wrapper', () => {
    const input = '```md\n# My App\n\n## Overview\n\nGreat app.\n```';
    const result = SectionDeduplicator.deduplicate(input);
    expect(result.startsWith('```')).toBe(false);
    expect(result).toContain('# My App');
  });

  it('keeps document unchanged when no outer fence exists', () => {
    const input = '# My App\n\n## Overview\n\nGreat app.\n\n## Features\n\n- Feature A';
    const result = SectionDeduplicator.deduplicate(input);
    expect(result).toContain('# My App');
    expect(result).toContain('## Overview');
    expect(result).toContain('## Features');
  });

  it('deduplicates multiple H1 headings — keeps only the first', () => {
    const input = '# My App\n\n## Overview\n\nText.\n\n# My App Again\n\n## Features\n\nList.';
    const result = SectionDeduplicator.deduplicate(input);
    // Only one H1 must remain
    const h1Matches = result.match(/^# /gm) || [];
    expect(h1Matches.length).toBe(1);
    // The first H1 is preserved
    expect(result).toContain('# My App');
    // The extra H1 text does NOT appear as an H1
    expect(result).not.toMatch(/^# My App Again/m);
    // Original sections are preserved
    expect(result).toContain('## Overview');
    expect(result).toContain('## Features');
  });

  it('merges duplicate ## sections — appends second body to first', () => {
    const input = [
      '# My App',
      '',
      '## Setup',
      '',
      'First setup instructions.',
      '',
      '## Features',
      '',
      'Feature A.',
      '',
      '## Setup',
      '',
      'Second setup instructions.',
    ].join('\n');

    const result = SectionDeduplicator.deduplicate(input);

    // Only one ## Setup heading
    const setupMatches = result.match(/^## Setup$/gm) || [];
    expect(setupMatches.length).toBe(1);

    // Both bodies merged
    expect(result).toContain('First setup instructions.');
    expect(result).toContain('Second setup instructions.');
  });

  it('removes empty sections', () => {
    const input = [
      '# My App',
      '',
      '## Overview',
      '',
      'Useful description.',
      '',
      '## Empty Section',
      '',
      '## Features',
      '',
      'Feature list.',
    ].join('\n');

    const result = SectionDeduplicator.deduplicate(input);
    expect(result).not.toContain('## Empty Section');
    expect(result).toContain('## Overview');
    expect(result).toContain('## Features');
  });

  it('reorders sections to match canonical order', () => {
    const input = [
      '# My App',
      '',
      '## License',
      '',
      'MIT.',
      '',
      '## Installation',
      '',
      'Run npm install.',
      '',
      '## Overview',
      '',
      'This app does X.',
    ].join('\n');

    const result = SectionDeduplicator.deduplicate(input);
    const overviewPos = result.indexOf('## Overview');
    const installPos = result.indexOf('## Installation');
    const licensePos = result.indexOf('## License');

    // Overview should come before Installation, Installation before License
    expect(overviewPos).toBeLessThan(installPos);
    expect(installPos).toBeLessThan(licensePos);
  });

  it('handles an already-clean single-section document', () => {
    const input = '# App\n\n## Overview\n\nThis is a minimal README.';
    const result = SectionDeduplicator.deduplicate(input);
    expect(result).toContain('# App');
    expect(result).toContain('## Overview');
  });

  it('trims whitespace from output', () => {
    const input = '\n\n# App\n\n## Overview\n\nText.\n\n';
    const result = SectionDeduplicator.deduplicate(input);
    expect(result.startsWith('#')).toBe(true);
    expect(result.endsWith('.')).toBe(true);
  });

  it('preserves ### subsections within a parent ## section', () => {
    const input = [
      '# App',
      '',
      '## API Reference',
      '',
      'Base URL: /api',
      '',
      '### GET /api/users',
      '',
      'Returns user list.',
      '',
      '### POST /api/users',
      '',
      'Creates a user.',
    ].join('\n');

    const result = SectionDeduplicator.deduplicate(input);
    expect(result).toContain('### GET /api/users');
    expect(result).toContain('### POST /api/users');
  });
});
