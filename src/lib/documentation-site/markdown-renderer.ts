export interface RenderedMarkdownResult {
  htmlContent: string;
  headings: Array<{ id: string; text: string; level: number }>;
}

export const markdownRenderer = {
  render(markdown: string): RenderedMarkdownResult {
    const headings: Array<{ id: string; text: string; level: number }> = [];
    const lines = markdown.split('\n');
    let inCodeBlock = false;
    let codeLanguage = '';
    let currentCodeBuffer: string[] = [];

    const processedLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Code block toggle
      if (line.trim().startsWith('```')) {
        if (inCodeBlock) {
          // Close code block
          inCodeBlock = false;
          const codeText = this.sanitizeHtml(currentCodeBuffer.join('\n'));
          const langAttr = codeLanguage ? ` data-language="${codeLanguage}"` : '';
          processedLines.push(
            `<div className="relative group my-4 rounded-xl border border-border bg-slate-950 p-4 font-mono text-xs text-slate-100 overflow-x-auto">\n` +
            `<div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3 text-slate-400 font-sans text-[11px]">\n` +
            `<span>${codeLanguage || 'code'}</span>\n` +
            `<button className="copy-code-btn px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors" data-code="${encodeURIComponent(currentCodeBuffer.join('\n'))}">Copy</button>\n` +
            `</div>\n` +
            `<pre><code${langAttr}>${codeText}</code></pre>\n` +
            `</div>`
          );
          currentCodeBuffer = [];
          codeLanguage = '';
        } else {
          // Open code block
          inCodeBlock = true;
          codeLanguage = line.trim().replace(/^```/, '').trim();
          currentCodeBuffer = [];
        }
        continue;
      }

      if (inCodeBlock) {
        currentCodeBuffer.push(line);
        continue;
      }

      // Heading detection
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const text = headingMatch[2].trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

        headings.push({ id, text, level });

        const headingTag = `h${level}`;
        const className = 
          level === 1 ? 'text-2xl font-bold tracking-tight text-foreground mt-8 mb-4 border-b border-border pb-2' :
          level === 2 ? 'text-xl font-semibold tracking-tight text-foreground mt-6 mb-3' :
          'text-lg font-medium text-foreground mt-4 mb-2';

        processedLines.push(`<${headingTag} id="${id}" className="${className}">${this.sanitizeHtml(text)}</${headingTag}>`);
        continue;
      }

      // Check blockquote
      if (line.startsWith('>')) {
        const quoteText = line.replace(/^>\s*/, '');
        processedLines.push(`<blockquote className="border-l-4 border-brand-cyan/50 pl-4 py-1.5 my-3 text-sm italic text-muted-foreground bg-secondary/30 rounded-r">${this.sanitizeHtml(quoteText)}</blockquote>`);
        continue;
      }

      // Simple lists
      if (line.match(/^[\*\-]\s+(.+)$/)) {
        const itemText = line.replace(/^[\*\-]\s+/, '');
        processedLines.push(`<li className="ml-4 list-disc text-sm text-foreground/90 my-1">${this.sanitizeHtml(itemText)}</li>`);
        continue;
      }

      // Paragraphs
      if (line.trim().length > 0) {
        processedLines.push(`<p className="text-sm text-foreground/90 leading-relaxed my-2">${this.sanitizeHtml(line)}</p>`);
      }
    }

    return {
      htmlContent: processedLines.join('\n'),
      headings,
    };
  },

  sanitizeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/javascript:/gi, 'blocked-script:');
  }
};
