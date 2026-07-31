import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseRepositoryUrl } from '@/lib/github/parse-repository-url';
import { RepositoryAnalyzer } from '@/lib/analysis/repository-analyzer';
import { GitHubError } from '@/lib/github/github-client';
import { repositoryAnalysisStore } from '@/lib/repository-analysis/analysis-store';
import { v4 as uuidv4 } from 'uuid';

const AnalyzeRequestSchema = z.object({
  repositoryUrl: z.string().url("Must be a valid URL"),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = AnalyzeRequestSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Invalid request body. Ensure repositoryUrl is provided.',
        }
      }, { status: 400 });
    }

    const { repositoryUrl } = result.data;
    
    const parsed = parseRepositoryUrl(repositoryUrl);
    if (!parsed) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Please provide a valid GitHub repository URL.',
        }
      }, { status: 400 });
    }

    const { owner, repo } = parsed;
    
    const rawAnalysisResult = await RepositoryAnalyzer.analyze(owner, repo);
    const analysisId = uuidv4();
    
    const analysisResult = {
      ...rawAnalysisResult,
      analysisId
    };

    repositoryAnalysisStore.save({
      analysisId,
      analysis: analysisResult,
      createdAt: new Date(),
    });

    const saved = repositoryAnalysisStore.get(analysisId);
    if (!saved) {
      throw new Error("Repository analysis could not be stored.");
    }

    return NextResponse.json({
      success: true,
      data: analysisResult,
    });

  } catch (error: any) {
    console.error('Analysis error:', error);

    if (error instanceof GitHubError) {
      if (error.status === 404) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'We could not find this repository. It may be private or deleted.',
          }
        }, { status: 404 });
      }
      
      if (error.status === 403 || error.status === 429) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: "GitHub's public API limit has been reached. Please try again shortly or configure a GITHUB_TOKEN.",
          }
        }, { status: 403 });
      }
    }

    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred during analysis.',
      }
    }, { status: 500 });
  }
}
