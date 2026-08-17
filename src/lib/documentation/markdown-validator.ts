export class MarkdownValidator {
  /**
   * Validates and cleans generated Markdown.
   * Throws if the markdown is empty, too short, or has no meaningful sections.
   *
   * Pipeline:
   *  1. Strip wrapping code fence (```markdown...```) if the model added one
   *  2. Trim whitespace
   *  3. Length guard
   *  4. Ensure exactly one H1 heading
   *  5. Fix unclosed code blocks (common LLM artifact)
   *  6. Remove AI-generated disclaimer boilerplate
   *  7. Ensure at least 2 ## sections exist (sanity check for depth)
   */
  static validate(markdown: string): string {
    // 1. Strip outer code fence wrapper
    let clean = stripOuterCodeFence(markdown.trim());

    // 2. Trim again after stripping
    clean = clean.trim();

    // 3. Length guard — suspiciously short means something went wrong
    if (!clean || clean.length < 50) {
      throw new Error('Generated markdown is suspiciously short or empty.');
    }

    // 4. Ensure there is exactly one H1 heading
    clean = ensureSingleH1(clean);

    // 5. Fix unclosed code blocks
    const codeBlockCount = (clean.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      clean += '\n```\n'; // close the dangling block safely
    }

    // 6. Strip trailing AI-generated disclaimers if the model ignored our instructions
    clean = clean.replace(/This (README|document) was (generated|created) (by AI|automatically).*/gi, '').trim();
    clean = clean.replace(/> ?_?Generated (by|with) (GitDoc AI|an AI assistant|artificial intelligence)[^.\n]*\.?_?/gi, '').trim();

    // 7. Ensure minimum depth — at least 2 ## sections for a non-minimal doc
    const sectionCount = (clean.match(/^## /gm) || []).length;
    if (sectionCount < 2) {
      // Don't throw — a minimal template might legitimately have just 1-2 sections.
      // Log a warning so it shows in server logs.
      console.warn(`MarkdownValidator: Generated README has only ${sectionCount} ## section(s). Output may be shallow.`);
    }

    return clean.trim();
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Strip ` ```markdown ` or ` ```md ` outer fence if the AI wrapped the whole doc.
 * Only strips if the fence wraps the entire content from start to end.
 */
function stripOuterCodeFence(text: string): string {
  const fenceStart = /^```(?:markdown|md)?\s*\n/i;
  const fenceEnd = /\n```\s*$/;

  if (fenceStart.test(text) && fenceEnd.test(text)) {
    return text.replace(fenceStart, '').replace(fenceEnd, '').trim();
  }
  return text;
}

/**
 * Ensure exactly one H1 in the document.
 * - If no H1: inject one from the first content (or generic fallback).
 * - If multiple H1s: keep the first, demote the rest to H2.
 */
function ensureSingleH1(text: string): string {
  const lines = text.split('\n');
  let h1Count = 0;
  const result: string[] = [];

  for (const line of lines) {
    if (/^# (?!#)/.test(line)) {
      h1Count++;
      if (h1Count > 1) {
        // Demote extra H1s to H2
        result.push(line.replace(/^# /, '## '));
        continue;
      }
    }
    result.push(line);
  }

  if (h1Count === 0) {
    // Inject a fallback H1 at the top
    return `# Generated Documentation\n\n${text}`;
  }

  return result.join('\n');
}
