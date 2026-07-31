export interface DocumentSection {
  id: string;
  title: string;
  level: number;
  content: string;
  startLine: number;
  endLine: number;
}

export class SectionParser {
  /**
   * Parses flat Markdown text into structured blocks based on heading levels.
   */
  static parse(markdown: string): DocumentSection[] {
    const lines = markdown.split('\n');
    const sections: DocumentSection[] = [];
    
    let currentSection: Partial<DocumentSection> | null = null;
    let contentLines: string[] = [];

    // Simple slugifier for reliable IDs
    const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        // If we were building a section, save it
        if (currentSection) {
          currentSection.content = contentLines.join('\n').trim();
          currentSection.endLine = i - 1;
          sections.push(currentSection as DocumentSection);
        }

        // Start a new section
        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();
        
        currentSection = {
          id: slugify(title) || `section-${i}`,
          title,
          level,
          startLine: i,
        };
        contentLines = [line]; // Include the heading itself in the content block
      } else {
        if (currentSection) {
          contentLines.push(line);
        } else {
          // If we have content before any heading, create a dummy root section
          currentSection = {
            id: 'intro',
            title: 'Introduction',
            level: 1,
            startLine: i,
          };
          contentLines.push(line);
        }
      }
    }

    // Push the final section
    if (currentSection) {
      currentSection.content = contentLines.join('\n').trim();
      currentSection.endLine = lines.length - 1;
      sections.push(currentSection as DocumentSection);
    }

    // Ensure unique IDs
    const seenIds = new Set<string>();
    sections.forEach(s => {
      if (seenIds.has(s.id)) {
        let counter = 1;
        while (seenIds.has(`${s.id}-${counter}`)) {
          counter++;
        }
        s.id = `${s.id}-${counter}`;
      }
      seenIds.add(s.id);
    });

    return sections;
  }
}
