import { CANONICAL_SECTION_ORDER } from '../ai/prompts/generate-readme';

interface ParsedSection {
  heading: string;       // e.g. "## Features"
  title: string;         // e.g. "Features"
  level: number;         // 2 for ##, 3 for ###
  body: string;          // content after the heading line
  raw: string;           // full original text including heading line
}

/**
 * SectionDeduplicator
 *
 * Post-processing pass that runs after the AI generates a README.
 * Responsibilities:
 *  1. Strip wrapping markdown code fences (```markdown ... ```) if the model added them
 *  2. Ensure exactly one H1 (#) heading at the top
 *  3. Merge duplicate ## sections — append later body into the first occurrence
 *  4. Remove empty sections (heading with no meaningful body)
 *  5. Re-order ## sections to match the canonical section order
 *  6. Preserve H1 and all ### subsections within each section
 */
export class SectionDeduplicator {

  static deduplicate(markdown: string): string {
    let text = markdown.trim();

    // ── Step 1: Strip wrapping code fence if the model wrapped the whole doc ──
    text = stripOuterCodeFence(text);

    // ── Step 2: Ensure exactly one H1 ───────────────────────────────────────
    text = deduplicateH1(text);

    // ── Step 3: Split into H1 header block + H2 sections ────────────────────
    const { header, sections } = splitIntoSections(text);

    // ── Step 4: Merge duplicate H2 sections ─────────────────────────────────
    const merged = mergeDuplicates(sections);

    // ── Step 5: Remove empty sections ───────────────────────────────────────
    const nonEmpty = merged.filter(s => s.body.trim().length > 0);

    // ── Step 6: Reorder sections by canonical order ──────────────────────────
    const reordered = reorderSections(nonEmpty);

    // ── Step 7: Reassemble ───────────────────────────────────────────────────
    const bodyParts = reordered.map(s => `${s.heading}\n\n${s.body.trim()}`);
    const result = [header.trim(), ...bodyParts].filter(Boolean).join('\n\n');

    return result.trim();
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strip ` ```markdown ` or ` ```md ` wrapping if the AI wrapped the entire doc.
 */
function stripOuterCodeFence(text: string): string {
  // Match: optional ```markdown or ```md at very start, optional ``` at very end
  const fenceStart = /^```(?:markdown|md)?\s*\n/i;
  const fenceEnd = /\n```\s*$/;

  if (fenceStart.test(text) && fenceEnd.test(text)) {
    return text.replace(fenceStart, '').replace(fenceEnd, '').trim();
  }
  return text;
}

/**
 * Deduplicate H1 headings — keep only the first one.
 * Extra H1 headings are demoted to H2 so their content remains visible.
 */
function deduplicateH1(text: string): string {
  const lines = text.split('\n');
  let foundH1 = false;
  return lines.map(line => {
    if (/^# (?!#)/.test(line)) {
      if (foundH1) {
        // Demote extra H1 to H2 to preserve the content
        return '#' + line; // '# Title' → '## Title'
      }
      foundH1 = true;
    }
    return line;
  }).join('\n');
}

/**
 * Split the markdown into a header block (everything up to and including the
 * first ## heading) and an array of ## sections.
 */
function splitIntoSections(text: string): { header: string; sections: ParsedSection[] } {
  const lines = text.split('\n');
  const sections: ParsedSection[] = [];
  let header = '';
  let currentSection: { heading: string; title: string; lines: string[] } | null = null;

  for (const line of lines) {
    const h2Match = line.match(/^(## )(.+)$/);

    if (h2Match) {
      // Save previous section
      if (currentSection) {
        sections.push({
          heading: currentSection.heading,
          title: currentSection.title,
          level: 2,
          body: currentSection.lines.join('\n'),
          raw: currentSection.heading + '\n' + currentSection.lines.join('\n'),
        });
      } else {
        // Header block is everything before the first ##
        header = header; // already accumulated
      }
      currentSection = { heading: line, title: h2Match[2].trim(), lines: [] };
    } else if (!currentSection) {
      header += line + '\n';
    } else {
      currentSection.lines.push(line);
    }
  }

  // Push last section
  if (currentSection) {
    sections.push({
      heading: currentSection.heading,
      title: currentSection.title,
      level: 2,
      body: currentSection.lines.join('\n'),
      raw: currentSection.heading + '\n' + currentSection.lines.join('\n'),
    });
  }

  return { header, sections };
}

/**
 * Merge sections that share the same normalised title.
 * The first occurrence keeps its heading. Later occurrences' bodies are
 * appended with a blank line separator.
 */
function mergeDuplicates(sections: ParsedSection[]): ParsedSection[] {
  const seen = new Map<string, ParsedSection>();
  const order: string[] = [];

  for (const section of sections) {
    const key = normalizeTitle(section.title);
    const existing = seen.get(key);

    if (existing) {
      // Merge: append body content (trimmed) if it's not empty
      const extra = section.body.trim();
      if (extra) {
        existing.body = existing.body.trimEnd() + '\n\n' + extra;
      }
    } else {
      seen.set(key, { ...section });
      order.push(key);
    }
  }

  return order.map(k => seen.get(k)!);
}

/**
 * Reorder sections to follow the canonical README section order.
 * Sections not in the canonical list are placed at the end, in their original relative order.
 */
function reorderSections(sections: ParsedSection[]): ParsedSection[] {
  const canonicalMap = new Map(
    CANONICAL_SECTION_ORDER.map((title, idx) => [normalizeTitle(title), idx])
  );

  const withIndex = sections.map(s => ({
    section: s,
    order: canonicalMap.has(normalizeTitle(s.title))
      ? canonicalMap.get(normalizeTitle(s.title))!
      : CANONICAL_SECTION_ORDER.length + sections.indexOf(s),
  }));

  withIndex.sort((a, b) => a.order - b.order);
  return withIndex.map(x => x.section);
}

/**
 * Normalise a heading title for comparison:
 * lowercase, collapse whitespace, strip special chars.
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
