import { describe, it, expect } from 'vitest';
import { siteNavigation } from './site-navigation';
import { markdownRenderer } from './markdown-renderer';

describe('MarkdownExport & Rendering', () => {
  it('derives human-readable title and safe slug from document types', () => {
    expect(siteNavigation.getHumanReadableLabel('README')).toBe('README');
    expect(siteNavigation.getHumanReadableLabel('SETUP')).toBe('Setup');
    expect(siteNavigation.getHumanReadableLabel('ARCHITECTURE')).toBe('Architecture');
    expect(siteNavigation.getHumanReadableLabel('API')).toBe('API Reference');
    expect(siteNavigation.getHumanReadableLabel('CONTRIBUTING')).toBe('Contributing');

    expect(siteNavigation.getSlug('README')).toBe('readme');
    expect(siteNavigation.getSlug('SETUP')).toBe('setup');
    expect(siteNavigation.getSlug('API')).toBe('api');
  });

  it('renders markdown to HTML, extracts headings, and blocks javascript: links', () => {
    const md = `# Overview
This is a test document.

## Installation Steps
Run npm install.

[Unsafe Link](javascript:alert(1))
`;

    const rendered = markdownRenderer.render(md);
    expect(rendered.headings.length).toBe(2);
    expect(rendered.headings[0].text).toBe('Overview');
    expect(rendered.headings[1].id).toBe('installation-steps');
    expect(rendered.htmlContent).not.includes('javascript:');
    expect(rendered.htmlContent).includes('blocked-script:');
  });
});
