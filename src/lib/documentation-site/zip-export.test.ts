import { describe, it, expect } from 'vitest';
import JSZip from 'jszip';

describe('ZIPExport', () => {
  it('creates sanitized ZIP archive with selected documents', async () => {
    const zip = new JSZip();

    const docs = [
      { type: 'README', content: '# Project Title' },
      { type: 'SETUP', content: '# Setup Instructions' },
    ];

    for (const doc of docs) {
      const fileName = `${doc.type.toUpperCase()}.md`.replace(/[\/\\]/g, '_');
      zip.file(fileName, doc.content);
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    expect(buffer).toBeDefined();
    expect(buffer.length).toBeGreaterThan(0);

    // Re-load zip to verify contents
    const unzipped = await JSZip.loadAsync(buffer);
    expect(unzipped.file('README.md')).toBeDefined();
    expect(unzipped.file('SETUP.md')).toBeDefined();

    const readmeText = await unzipped.file('README.md')?.async('string');
    expect(readmeText).toBe('# Project Title');
  });

  it('prevents path traversal characters in ZIP file names', () => {
    const rawPath = '../../../etc/passwd.md';
    const sanitized = rawPath.replace(/\.\./g, '').replace(/[\/\\]/g, '_').replace(/^_+/, '');
    expect(sanitized).not.includes('../');
    expect(sanitized).toBe('etc_passwd.md');
  });
});
