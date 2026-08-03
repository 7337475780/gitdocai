export class MarkdownSanitizer {
  /**
   * Sanitizes Markdown text to eliminate XSS vectors, unsafe HTML tags,
   * javascript: URLs, and event attributes.
   */
  static sanitize(markdown: string): string {
    if (!markdown || typeof markdown !== 'string') {
      return '';
    }

    let sanitized = markdown;

    // 1. Remove dangerous script/iframe/object tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
    sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
    sanitized = sanitized.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');

    // 2. Remove inline event handlers (on* attributes like onerror=, onload=, onclick=)
    sanitized = sanitized.replace(/\s+on[a-z]+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi, '');

    // 3. Block javascript: and data:text/html URLs in links and image targets
    sanitized = sanitized.replace(/href\s*=\s*["']?\s*javascript:[^"'>\s]+/gi, 'href="#"');
    sanitized = sanitized.replace(/src\s*=\s*["']?\s*javascript:[^"'>\s]+/gi, 'src="#"');
    sanitized = sanitized.replace(/\[([^\]]+)\]\(\s*javascript:[^)]+\)/gi, '[$1](#)');

    sanitized = sanitized.replace(/href\s*=\s*["']?\s*data:text\/html[^"'>\s]+/gi, 'href="#"');
    sanitized = sanitized.replace(/src\s*=\s*["']?\s*data:text\/html[^"'>\s]+/gi, 'src="#"');

    return sanitized;
  }
}
