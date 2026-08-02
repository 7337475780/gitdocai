import { describe, it, expect } from 'vitest';
import { siteSearchIndex } from './site-search-index';
import { siteManifest } from './site-manifest';
import { mermaidRenderer } from './mermaid-renderer';

describe('SiteGenerator components', () => {
  it('generates a lightweight search index and executes queries', () => {
    const docs = [
      {
        id: 'doc-1',
        metadata: { type: 'README' },
        markdown: '# Project Overview\nThis project provides automated documentation generation.',
        headings: [{ id: 'overview', text: 'Overview', level: 1 }],
      },
      {
        id: 'doc-2',
        metadata: { type: 'SETUP' },
        markdown: '# Setup Guide\nRun npm install to configure dependencies.',
        headings: [{ id: 'setup-guide', text: 'Setup Guide', level: 1 }],
      },
    ];

    const index = siteSearchIndex.buildIndex(docs);
    expect(index.length).toBeGreaterThan(0);

    const searchResults = siteSearchIndex.search(index, 'dependencies');
    expect(searchResults.length).toBe(1);
    expect(searchResults[0].documentType).toBe('SETUP');
  });

  it('builds a site manifest with content hashes', () => {
    const docs = [
      { id: '1', metadata: { type: 'README' }, markdown: '# README' },
    ];

    const manifest = siteManifest.createManifest('My Project', 'Description', {
      siteName: 'My Project',
      defaultTheme: 'SYSTEM',
      showTableOfContents: true,
      showSearch: true,
      showAttribution: true,
    }, docs);

    expect(manifest.siteName).toBe('My Project');
    expect(manifest.documents[0].contentHash).toBeDefined();
    expect(manifest.documents[0].contentHash.length).toBe(64);
  });

  it('handles valid and invalid Mermaid diagram definitions gracefully', () => {
    const valid = mermaidRenderer.renderDiagram('graph TD\nA-->B');
    expect(valid.success).toBe(true);

    const invalid = mermaidRenderer.renderDiagram('random text invalid diagram');
    expect(invalid.success).toBe(false);
    expect(invalid.content).includes('This diagram could not be rendered.');
  });
});
