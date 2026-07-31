import { z } from 'zod';
import { RepositoryMetadataSchema, RepositoryLanguageSchema, RepositoryTreeSchema } from './repository';

export const DetectedTechnologySchema = z.object({
  name: z.string(),
  category: z.string(),
  confidence: z.enum(['low', 'medium', 'high']),
  evidence: z.array(z.string()),
  iconName: z.string().optional(),
});

export const ProjectSignalSchema = z.object({
  type: z.string(),
  value: z.string(),
});

export const RepositoryScriptSchema = z.object({
  name: z.string(),
  command: z.string(),
});

export const DocumentationReadinessSchema = z.object({
  score: z.number(),
  label: z.string(),
  present: z.array(z.string()),
  recommended: z.array(z.string()),
});

export const RepositoryAnalysisResultSchema = z.object({
  analysisId: z.string(),
  repositoryName: z.string(),
  owner: z.string(),
  url: z.string(),
  description: z.string(),
  primaryLanguage: z.string(),
  projectType: z.string(),
  packageManager: z.string(),
  framework: z.string(),
  styling: z.string(),
  mainBranch: z.string(),
  status: z.string(),
  technologies: z.array(DetectedTechnologySchema),
  signals: z.array(ProjectSignalSchema),
  scripts: z.array(RepositoryScriptSchema),
  readinessScore: z.number(),
  readinessDetails: DocumentationReadinessSchema,
  metadata: RepositoryMetadataSchema,
  languages: z.array(RepositoryLanguageSchema),
  tree: RepositoryTreeSchema,
});

export const AnalysisErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const AnalysisResponseSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: RepositoryAnalysisResultSchema,
  }),
  z.object({
    success: z.literal(false),
    error: AnalysisErrorSchema,
  }),
]);

export type DetectedTechnology = z.infer<typeof DetectedTechnologySchema>;
export type ProjectSignal = z.infer<typeof ProjectSignalSchema>;
export type RepositoryScript = z.infer<typeof RepositoryScriptSchema>;
export type DocumentationReadiness = z.infer<typeof DocumentationReadinessSchema>;
export type RepositoryAnalysisResult = z.infer<typeof RepositoryAnalysisResultSchema>;
export type AnalysisError = z.infer<typeof AnalysisErrorSchema>;
export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;
