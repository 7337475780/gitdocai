import { describe, it, expect } from 'vitest';
import { SectionParser } from './section-parser';

describe('SectionParser', () => {
  it('should parse markdown into sections', () => {
    const raw = `# Project Title
Some intro text.

## Features
- A
- B

### Sub feature
Details.

## License
MIT
`;

    const sections = SectionParser.parse(raw);
    
    expect(sections.length).toBe(4);
    
    expect(sections[0].title).toBe('Project Title');
    expect(sections[0].level).toBe(1);
    expect(sections[0].content).toContain('Some intro text');

    expect(sections[1].title).toBe('Features');
    expect(sections[1].level).toBe(2);
    expect(sections[1].content).toContain('- A');

    expect(sections[2].title).toBe('Sub feature');
    expect(sections[2].level).toBe(3);

    expect(sections[3].title).toBe('License');
    expect(sections[3].id).toBe('license');
  });

  it('should create an intro section if text appears before headings', () => {
    const raw = `This is just text\nwithout a heading first.\n# Title\nContent`;
    const sections = SectionParser.parse(raw);

    expect(sections.length).toBe(2);
    expect(sections[0].id).toBe('intro');
    expect(sections[0].content).toContain('This is just text');
    
    expect(sections[1].title).toBe('Title');
  });
});
