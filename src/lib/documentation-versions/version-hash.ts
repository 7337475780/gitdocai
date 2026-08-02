import { createHash } from 'crypto';

export function calculateContentHash(markdown: string): string {
  // Normalize line endings to \n
  // Remove trailing whitespace from each line
  // Trim overall leading/trailing whitespace
  const normalized = markdown
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+$/gm, '')
    .trim();
  
  return createHash('sha256').update(normalized, 'utf8').digest('hex');
}
