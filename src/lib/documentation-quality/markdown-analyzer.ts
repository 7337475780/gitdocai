import { SectionParser, DocumentSection } from '../documentation/section-parser';

export interface AnalyzedMarkdown {
  title: string | null;
  headings: DocumentSection[];
  hasH1: boolean;
  multipleH1: boolean;
  headingJumps: Array<{ from: number; to: number; heading: string }>;
  emptySections: string[];
  duplicateHeadings: string[];
  codeBlocks: Array<{ language: string | null; content: string; line: number }>;
  missingLanguages: number; // count of code blocks without language
  brokenInternalLinks: string[];
  placeholders: Array<{ pattern: string; evidence: string; line: number }>;
  paragraphCount: number;
  wordCount: number;
}

export class MarkdownAnalyzer {
  private static PLACEHOLDER_PATTERNS = [
    /TODO/i,
    /TBD/i,
    /Lorem ipsum/i,
    /Your project description here/i,
    /Replace this text/i,
    /<your-value>/i,
    /YOUR_API_KEY/i,
  ];

  static analyze(markdown: string): AnalyzedMarkdown {
    const sections = SectionParser.parse(markdown);
    const lines = markdown.split('\n');

    // 1. Extract Headings and Title info
    const headings = sections.filter(s => s.id !== 'intro');
    const h1s = headings.filter(h => h.level === 1);
    const hasH1 = h1s.length > 0;
    const multipleH1 = h1s.length > 1;
    const title = h1s.length > 0 ? h1s[0].title : null;

    // 2. Heading Jumps (e.g., level 1 to level 3)
    const headingJumps: Array<{ from: number; to: number; heading: string }> = [];
    let prevLevel = 0;
    for (const h of headings) {
      if (prevLevel > 0 && h.level - prevLevel > 1) {
        headingJumps.push({ from: prevLevel, to: h.level, heading: h.title });
      }
      prevLevel = h.level;
    }

    // 3. Duplicate Headings & Empty Sections
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const h of headings) {
      const titleLower = h.title.trim().toLowerCase();
      if (seen.has(titleLower)) {
        duplicates.add(h.title.trim());
      }
      seen.add(titleLower);
    }
    const duplicateHeadings = Array.from(duplicates);

    const emptySections: string[] = [];
    for (const s of sections) {
      // Content has the heading itself. We check if there's anything else beside the heading line.
      const linesInSection = s.content.split('\n').map(l => l.trim()).filter(Boolean);
      // If there is only one line in the section and it is the heading, it is empty.
      if (linesInSection.length <= 1) {
        emptySections.push(s.title);
      }
    }

    // 4. Code Blocks
    const codeBlocks: Array<{ language: string | null; content: string; line: number }> = [];
    let insideCodeBlock = false;
    let currentLang: string | null = null;
    let currentCodeContent: string[] = [];
    let codeBlockStartLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('```')) {
        if (!insideCodeBlock) {
          insideCodeBlock = true;
          const lang = line.slice(3).trim();
          currentLang = lang || null;
          currentCodeContent = [];
          codeBlockStartLine = i + 1;
        } else {
          insideCodeBlock = false;
          codeBlocks.push({
            language: currentLang,
            content: currentCodeContent.join('\n'),
            line: codeBlockStartLine,
          });
        }
      } else if (insideCodeBlock) {
        currentCodeContent.push(lines[i]);
      }
    }

    const missingLanguages = codeBlocks.filter(cb => !cb.language).length;

    // 5. Slugify helper matches SectionParser
    const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const validSlugs = new Set(sections.map(s => slugify(s.title)));

    // 6. Find links & broken internal links
    const brokenInternalLinks: string[] = [];
    const linkRegex = /\[([^\]]*)\]\((#[^\)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(markdown)) !== null) {
      const anchor = match[2].slice(1).trim(); // Remove leading '#'
      const decodedAnchor = decodeURIComponent(anchor);
      if (!validSlugs.has(anchor) && !validSlugs.has(decodedAnchor) && anchor !== '') {
        brokenInternalLinks.push(match[0]);
      }
    }

    // 7. Paragraph and Word counts
    let paragraphCount = 0;
    const wordCount = markdown.split(/\s+/).filter(Boolean).length;
    let currentParagraphLines: string[] = [];

    // Let's count paragraph blocks outside of code blocks and headings
    let inCode = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('```')) {
        inCode = !inCode;
        if (currentParagraphLines.length > 0) {
          paragraphCount++;
          currentParagraphLines = [];
        }
        continue;
      }
      if (inCode) continue;

      if (trimmed.startsWith('#')) {
        if (currentParagraphLines.length > 0) {
          paragraphCount++;
          currentParagraphLines = [];
        }
        continue;
      }

      if (trimmed === '') {
        if (currentParagraphLines.length > 0) {
          paragraphCount++;
          currentParagraphLines = [];
        }
      } else {
        currentParagraphLines.push(line);
      }
    }
    if (currentParagraphLines.length > 0) {
      paragraphCount++;
    }

    // 8. Placeholders detection
    const placeholders: Array<{ pattern: string; evidence: string; line: number }> = [];
    inCode = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (trimmed.startsWith('```')) {
        inCode = !inCode;
        continue;
      }
      // If we are in code block, we ignore placeholders except if it is an obvious unresolved template,
      // but to be safe, only check non-code block text or check code blocks for stand-alone TODOs.
      // Environment variables example definitions (e.g. MY_KEY=YOUR_API_KEY) inside bash/properties blocks are allowed,
      // but let's detect unresolved placeholders in text:
      for (const pattern of this.PLACEHOLDER_PATTERNS) {
        if (pattern.test(line)) {
          // Exclude valid env examples: e.g. API_KEY=YOUR_API_KEY or DATABASE_URL=mongodb://...
          // If the line contains a standard env var assignment and it is inside code, skip it
          if (inCode && (line.includes('=') || line.includes(':'))) {
            continue;
          }
          placeholders.push({
            pattern: pattern.toString(),
            evidence: trimmed,
            line: i + 1,
          });
        }
      }
    }

    return {
      title,
      headings,
      hasH1,
      multipleH1,
      headingJumps,
      emptySections,
      duplicateHeadings,
      codeBlocks,
      missingLanguages,
      brokenInternalLinks,
      placeholders,
      paragraphCount,
      wordCount,
    };
  }
}
