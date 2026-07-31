import { z } from 'zod';

export const RepositoryMetadataSchema = z.object({
  name: z.string(),
  fullName: z.string(),
  ownerLogin: z.string(),
  ownerAvatar: z.string(),
  description: z.string().nullable(),
  htmlUrl: z.string(),
  defaultBranch: z.string(),
  visibility: z.string(),
  isArchived: z.boolean(),
  isFork: z.boolean(),
  size: z.number(),
  stars: z.number(),
  forks: z.number(),
  openIssues: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  primaryLanguage: z.string().nullable(),
  license: z.string().nullable(),
});

export const RepositoryLanguageSchema = z.object({
  name: z.string(),
  bytes: z.number(),
  percentage: z.number(),
});

export const RepositoryFileSchema = z.object({
  path: z.string(),
  type: z.enum(['blob', 'tree']),
  size: z.number().optional(),
});

export const RepositoryTreeSchema = z.object({
  truncated: z.boolean(),
  files: z.array(RepositoryFileSchema),
});

export type RepositoryMetadata = z.infer<typeof RepositoryMetadataSchema>;
export type RepositoryLanguage = z.infer<typeof RepositoryLanguageSchema>;
export type RepositoryFile = z.infer<typeof RepositoryFileSchema>;
export type RepositoryTree = z.infer<typeof RepositoryTreeSchema>;
