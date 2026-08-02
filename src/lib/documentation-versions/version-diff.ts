import { DocumentSection, SectionParser } from '../documentation/section-parser';
import { SectionDiff, VersionComparisonResult } from './version-types';

function getWordSet(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/\s+/).filter(w => w.length > 1));
}

function calculateJaccardSimilarity(textA: string, textB: string): number {
  const setA = getWordSet(textA);
  const setB = getWordSet(textB);
  if (setA.size === 0 || setB.size === 0) return 0;
  
  let intersectionSize = 0;
  for (const word of setA) {
    if (setB.has(word)) {
      intersectionSize++;
    }
  }
  const unionSize = setA.size + setB.size - intersectionSize;
  return intersectionSize / unionSize;
}

export function diffLines(before: string, after: string): { addedLines: number; removedLines: number } {
  const linesBefore = before.split('\n');
  const linesAfter = after.split('\n');
  
  const n = linesBefore.length;
  const m = linesAfter.length;
  
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      if (linesBefore[i - 1].trim() === linesAfter[j - 1].trim()) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  let i = n;
  let j = m;
  let addedLines = 0;
  let removedLines = 0;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && linesBefore[i - 1].trim() === linesAfter[j - 1].trim()) {
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      addedLines++;
      j--;
    } else {
      removedLines++;
      i--;
    }
  }
  
  return { addedLines, removedLines };
}

export function compareVersions(
  baseId: string,
  baseNum: number,
  baseMarkdown: string,
  baseSectionsJson: any,
  compareId: string,
  compareNum: number,
  compareMarkdown: string,
  compareSectionsJson: any
): VersionComparisonResult {
  const baseSections: DocumentSection[] = Array.isArray(baseSectionsJson) 
    ? baseSectionsJson 
    : SectionParser.parse(baseMarkdown);
    
  const compareSections: DocumentSection[] = Array.isArray(compareSectionsJson)
    ? compareSectionsJson
    : SectionParser.parse(compareMarkdown);

  const changes: SectionDiff[] = [];
  const matchedBaseIds = new Set<string>();
  const matchedCompareIds = new Set<string>();

  // 1. Direct match by ID
  for (const compSec of compareSections) {
    const baseSec = baseSections.find(b => b.id === compSec.id);
    if (baseSec) {
      matchedBaseIds.add(baseSec.id);
      matchedCompareIds.add(compSec.id);
      
      const beforeContent = baseSec.content;
      const afterContent = compSec.content;
      
      if (beforeContent.trim() === afterContent.trim()) {
        changes.push({
          type: 'unchanged',
          section: compSec.title,
          before: beforeContent,
          after: afterContent
        });
      } else {
        changes.push({
          type: 'modified',
          section: compSec.title,
          before: beforeContent,
          after: afterContent
        });
      }
    }
  }

  // 2. Content similarity match for headings that changed
  const unmatchedCompare = compareSections.filter(c => !matchedCompareIds.has(c.id));
  const unmatchedBase = baseSections.filter(b => !matchedBaseIds.has(b.id));

  for (const compSec of unmatchedCompare) {
    let bestMatch: DocumentSection | null = null;
    let maxSim = 0;
    
    for (const baseSec of unmatchedBase) {
      if (matchedBaseIds.has(baseSec.id)) continue;
      const sim = calculateJaccardSimilarity(baseSec.content, compSec.content);
      if (sim > maxSim) {
        maxSim = sim;
        bestMatch = baseSec;
      }
    }

    if (bestMatch && maxSim > 0.4) {
      matchedBaseIds.add(bestMatch.id);
      matchedCompareIds.add(compSec.id);
      
      changes.push({
        type: 'modified',
        section: compSec.title,
        before: bestMatch.content,
        after: compSec.content
      });
    }
  }

  // 3. Collect additions (remaining unmatched in compare)
  for (const compSec of compareSections) {
    if (!matchedCompareIds.has(compSec.id)) {
      changes.push({
        type: 'added',
        section: compSec.title,
        before: '',
        after: compSec.content
      });
    }
  }

  // 4. Collect removals (remaining unmatched in base)
  for (const baseSec of baseSections) {
    if (!matchedBaseIds.has(baseSec.id)) {
      changes.push({
        type: 'removed',
        section: baseSec.title,
        before: baseSec.content,
        after: ''
      });
    }
  }

  const lineStats = diffLines(baseMarkdown, compareMarkdown);
  const changedSectionsCount = changes.filter(c => c.type !== 'unchanged').length;

  return {
    baseVersion: {
      versionId: baseId,
      versionNumber: baseNum
    },
    compareVersion: {
      versionId: compareId,
      versionNumber: compareNum
    },
    summary: {
      addedLines: lineStats.addedLines,
      removedLines: lineStats.removedLines,
      changedSections: changedSectionsCount
    },
    changes
  };
}
