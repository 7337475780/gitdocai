import { DocumentSection } from './section-parser';
import { QualityResult } from './quality-analyzer';

export interface GeneratedDocument {
  id: string;
  title: string;
  markdown: string;
  template: string;
  tone: string;
  sections: DocumentSection[];
  metadata: {
    wordCount: number;
    characterCount: number;
    generationTimeMs: number;
  };
  quality: QualityResult;
}
