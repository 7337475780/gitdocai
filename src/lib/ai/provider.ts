import { AIModelGenerationResult } from './schemas/ai-response';

export type AIProviderId =
  | "gemini"
  | "openrouter"
  | "groq"
  | "cerebras"
  | "huggingface";
export interface ApiEndpoint {
  method: string;
  path: string;
  purpose: string;
  authentication: boolean;
}

export interface DetectedFeature {
  name: string;
  description: string;
  routes?: string[];
  components?: string[];
}

export interface DocumentationContext {
  repository: {
    name: string;
    owner: string;
    description: string;
    url: string;
    mainBranch: string;
    primaryLanguage: string;
    stars?: number;
    forks?: number;
  };
  projectType: string;
  technologies: Array<{ name: string; category: string }>;
  packageManager: string;
  dependencies: string[];
  devDependencies: string[];
  scripts: Array<{ name: string; command: string }>;
  environmentVars: string[];
  // Deep intelligence fields
  apiEndpoints: ApiEndpoint[];
  features: DetectedFeature[];
  pageRoutes: string[];
  stateManagement: string[];
  databaseInfo: {
    type: string;
    orm: string;
    hasSchema: boolean;
    models: string[];
  } | null;
  authInfo: {
    provider: string;
    strategies: string[];
    hasProtectedRoutes: boolean;
  } | null;
  configFiles: string[];
  testingFrameworks: string[];
  hasDocker: boolean;
  hasCi: boolean;
  repositoryStructure: string;
  tree: string[];
  signals: Array<{ type: string; value: string }>;
  existingReadmeExcerpt?: string;
  /** Actual source file excerpts for deep, source-grounded documentation */
  sourceFiles?: Array<{ path: string; content: string }>;
}

export interface GenerateReadmeOptions {
  template: 'professional' | 'opensource' | 'api' | 'portfolio' | 'library' | 'minimal';
  tone: 'professional' | 'concise' | 'technical';
  title?: string;
  includeInstallation?: boolean;
  includeUsage?: boolean;
  includeAPI?: boolean;
  includeContributing?: boolean;
  detailLevel?: 'concise' | 'standard' | 'detailed';
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
