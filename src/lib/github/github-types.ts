import { z } from 'zod';

// Zod schemas for the commit request
export const GitHubCommitRequestSchema = z.object({
  documentId: z.string().min(1),
  repository: z.object({
    owner: z.string().min(1),
    name: z.string().min(1),
  }),
  branch: z.string().min(1),
  path: z.string().min(1).regex(/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$)).+$/, 'Invalid path'),
  message: z.string().min(1).max(255),
});

export type GitHubCommitRequest = z.infer<typeof GitHubCommitRequestSchema>;

// Models for GitHub API responses
export interface GitHubRepository {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
  language?: string | null;
  updatedAt?: string;
  visibility?: string;
  analysisId?: string | null;
  analysisStatus?: 'COMPLETED' | 'NONE';
}

export interface GitHubBranch {
  name: string;
}

export interface GitHubFileStatus {
  exists: boolean;
  path: string;
  sha?: string; // Present if exists
}

export interface GitHubCommitResult {
  commitUrl: string;
  fileUrl: string;
}

export class GitHubError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
    this.name = 'GitHubError';
  }
}
