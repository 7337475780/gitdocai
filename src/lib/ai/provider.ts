import { DocumentSection } from '../documentation/section-parser';
import { AIModelGenerationResult } from './schemas/ai-response';

export type AIProviderId =
  | "gemini"
  | "openrouter"
  | "groq"
  | "cerebras"
  | "huggingface";
export interface DocumentationContext {
  repository: {
    name: string;
    owner: string;
    description: string;
    url: string;
    mainBranch: string;
    primaryLanguage: string;
  };
  projectType: string;
  technologies: Array<{ name: string; category: string }>;
  packageManager: string;
  dependencies: string[];
  scripts: Array<{ name: string; command: string }>;
  environmentVars: string[];
  tree: string[];
  signals: Array<{ type: string; value: string }>;
  existingReadmeExcerpt?: string;
}

export interface GenerateReadmeOptions {
  template: 'professional' | 'opensource' | 'api' | 'portfolio' | 'library' | 'minimal';
  tone: 'professional' | 'concise' | 'technical';
}

export interface GeneratedSectionResult {
  markdown: string;
}

export interface AIProvider {
  readonly id: AIProviderId;
  
  isConfigured(): boolean;
  
  getConfiguredModels(): string[];

  generateReadme(
    context: DocumentationContext,
    options: GenerateReadmeOptions,
    model: string,
    timeoutMs: number
  ): Promise<AIModelGenerationResult>;

  generateSection(
    sectionTitle: string,
    sectionContent: string,
    instruction: string,
    model: string,
    timeoutMs: number
  ): Promise<AIModelGenerationResult>;

  generateImprovement(
    context: DocumentationContext,
    issueTitle: string,
    issueDescription: string,
    recommendation: string,
    targetSectionTitle?: string,
    currentSectionContent?: string,
    model?: string,
    timeoutMs?: number
  ): Promise<AIModelGenerationResult>;
}
