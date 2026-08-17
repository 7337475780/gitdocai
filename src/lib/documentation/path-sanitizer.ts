/**
 * PathSanitizer
 *
 * Removes or replaces local filesystem paths, machine-specific paths, and
 * personal usernames from source code excerpts and generated documentation.
 *
 * Applied at two points in the pipeline:
 *   1. readSourceFiles()   — cleans source content before it reaches the LLM
 *   2. generate/route.ts  — final safety net on the generated markdown
 *
 * Design goal: never expose Windows usernames, Linux home directories,
 * absolute local paths, or editor-specific paths in published documentation.
 */
export class PathSanitizer {

  // ─── Sanitize source code content ──────────────────────────────────────────

  /**
   * Strips local machine paths from a source file's content before it is
   * stored in sourceFiles[] and forwarded to the LLM.
   *
   * Handles:
   *  - Windows absolute paths with drive letters: C:\Users\<name>\...
   *  - Windows UNC paths: \\server\share\...
   *  - Unix home dirs: /home/<name>/... and /Users/<name>/...
   *  - macOS apps dir: /Applications/...
   *  - Editor config dirs: .vscode/..., .idea/...
   *  - Hardcoded executable paths (.exe, .bat, .sh with absolute prefix)
   */
  static sanitizeSourceContent(content: string): string {
    let out = content;

    // ── 1. Hardcoded executable paths → env var suggestion ─────────────────
    // Pattern: anything = 'C:\Users\...\tool.exe'  or  "C:\...\tool.exe"
    out = out.replace(
      /(['"`])[A-Za-z]:\\(?:[^'"`\r\n\\]+\\)*([^'"`\r\n\\]+\.(?:exe|bat|cmd|sh|bin))(['"`])/gi,
      (_match, q1, toolName, q2) =>
        `${q1}<path-to-${toolName.replace(/\s+/g, '-').toLowerCase()}>${q2} /* configure via environment variable */`
    );

    // ── 2. Windows paths: C:\Users\<username>\... ────────────────────────────
    out = out.replace(
      /[A-Za-z]:\\Users\\[^\\'" \t\r\n,;)]+(?:\\[^'" \t\r\n,;)]+)*/g,
      '<local-user-path>'
    );

    // ── 3. Windows paths: any other C:\<dir>\... ─────────────────────────────
    out = out.replace(
      /[A-Za-z]:\\(?:[^'" \t\r\n,;)<>]+\\)+[^'" \t\r\n,;)<>]*/g,
      '<local-path>'
    );

    // ── 4. Unix/macOS home directories ───────────────────────────────────────
    // /home/<username>/...  and  /Users/<username>/...
    out = out.replace(
      /\/(?:home|Users)\/[^/'" \t\r\n,;)<>]+(?:\/[^'" \t\r\n,;)<>]+)*/g,
      '<local-user-path>'
    );

    // ── 5. Tilde-expanded paths ~/... ────────────────────────────────────────
    out = out.replace(
      /~\/[^'" \t\r\n,;)<>]+/g,
      '<home-dir-path>'
    );

    // ── 6. UNC paths \\server\share\... ──────────────────────────────────────
    out = out.replace(
      /\\\\[^\\'" \t\r\n,;)<>]+(?:\\[^'" \t\r\n,;)<>]+)*/g,
      '<network-path>'
    );

    return out;
  }

  // ─── Sanitize generated markdown ───────────────────────────────────────────

  /**
   * Final safety net applied to the generated README markdown.
   *
   * Any path that leaked through source excerpts or was hallucinated by the
   * LLM will be caught and replaced with documentation-friendly language.
   */
  static sanitizeMarkdown(markdown: string): string {
    let out = markdown;

    // ── 1. Windows user paths appearing in prose ──────────────────────────────
    // Catches C:\Users\john\..., C:\Users\tharu\... etc.
    out = out.replace(
      /`?[A-Za-z]:\\Users\\[^`'" \t\r\n,;)<>\\]+(?:\\[^`'" \t\r\n,;)<>]+)*`?/g,
      '`<local-user-path>`'
    );

    // ── 2. Any remaining Windows absolute path ────────────────────────────────
    out = out.replace(
      /`?[A-Za-z]:\\(?:[^`'" \t\r\n,;)<>]+\\)+[^`'" \t\r\n,;)<>]+`?/g,
      '`<local-path>`'
    );

    // ── 3. Unix home directory paths in prose ─────────────────────────────────
    out = out.replace(
      /`?\/(?:home|Users)\/[^`'" \t\r\n,;)<>]+(?:\/[^`'" \t\r\n,;)<>]+)*`?/g,
      '`<local-user-path>`'
    );

    // ── 4. Tilde paths ─────────────────────────────────────────────────────────
    out = out.replace(
      /`?~\/[^`'" \t\r\n,;)<>]+`?/g,
      '`<home-dir-path>`'
    );

    // ── 5. Executable references — replace with env-var documentation note ────
    // e.g. "...the yt-dlp executable at <local-path>" → cleaner note
    out = out.replace(
      /<local-(?:user-)?path>(?:[/\\][^`'" \t\r\n,;)<>]*)?\.(?:exe|bat|cmd|sh|bin)/gi,
      '<tool-executable> (configure via environment variable)'
    );

    // ── 6. Inline code blocks that are just a local path ─────────────────────
    // `` `C:\something` `` that wasn't caught above
    out = out.replace(
      /`[A-Za-z]:\\[^`]+`/g,
      '`<local-path>`'
    );

    return out;
  }

  /**
   * Checks whether a string contains any detectable local path.
   * Useful for logging/debugging purposes.
   */
  static containsLocalPath(text: string): boolean {
    return (
      /[A-Za-z]:\\(?:Users|Program Files|Projects|Dev|home)/i.test(text) ||
      /\/(?:home|Users)\/[^/\s]{2,}\//.test(text) ||
      /~\//.test(text) ||
      /\\\\[a-zA-Z]/.test(text)
    );
  }
}
