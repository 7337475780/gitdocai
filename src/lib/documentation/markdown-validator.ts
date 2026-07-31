export class MarkdownValidator {
  /**
   * Validates and optionally cleans up generated Markdown.
   * Throws an error if the markdown is completely invalid/empty.
   */
  static validate(markdown: string): string {
    let clean = markdown.trim();

    if (!clean || clean.length < 50) {
      throw new Error('Generated markdown is suspiciously short or empty.');
    }

    // Ensure it has a top level title (h1)
    if (!clean.startsWith('# ')) {
      // If it doesn't start with H1, try to find one
      const h1Match = clean.match(/^# .+/m);
      if (!h1Match) {
        // Fallback title injection if the model forgot it entirely
        clean = `# Generated Documentation\n\n${clean}`;
      }
    }

    // Fix unclosed code blocks (a common LLM artifact)
    const codeBlockCount = (clean.match(/```/g) || []).length;
    if (codeBlockCount % 2 !== 0) {
      clean += '\n```\n'; // close the dangling block safely
    }

    // Strip trailing 'AI-generated' disclaimers if the model ignored our instructions
    clean = clean.replace(/This README was (generated|created) by AI.*/gi, '');

    return clean.trim();
  }
}
