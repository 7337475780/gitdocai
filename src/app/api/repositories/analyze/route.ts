import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseRepositoryUrl } from '@/lib/github/parse-repository-url';
import { RepositoryAnalyzer } from '@/lib/analysis/repository-analyzer';
import { GitHubError } from '@/lib/github/github-client';
import { repositoryAnalysisService } from '@/lib/repository-analysis/repository-analysis.service';

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
    
    let analysisId: string;
    try {
      analysisId = await repositoryAnalysisService.createAnalysis({
        repositoryUrl,
        repositoryOwner: owner,
        repositoryName: repo,
        repositoryFullName: `${owner}/${repo}`,
        analysisData: rawAnalysisResult,
      });
    } catch (e) {
      console.error('Database persistence error:', e);
      return NextResponse.json({
        success: false,
        error: {
          code: 'REPOSITORY_ANALYSIS_PERSISTENCE_FAILED',
          message: 'The repository was analyzed, but the result could not be saved. Please try again.',
        }
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...rawAnalysisResult,
        analysisId,
      },
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
