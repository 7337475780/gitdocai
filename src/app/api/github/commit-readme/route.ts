import { NextRequest, NextResponse } from 'next/server';
import { getGitHubSession } from '@/lib/github/github-session';
import { getGitHubFileStatus, commitGitHubFile } from '@/lib/github/github-contents';
import { GitHubCommitRequestSchema } from '@/lib/github/github-types';
import { prisma } from '@/lib/database/prisma';
import { ActivityService } from '@/lib/documentation-intelligence/activity-service';

export async function POST(req: NextRequest) {
  try {
    const session = await getGitHubSession();
    if (!session.accessToken) {
      return NextResponse.json({ success: false, error: 'Connect GitHub before committing.', code: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = GitHubCommitRequestSchema.safeParse(body);
    
    if (!parseResult.success) {
      return NextResponse.json({ success: false, error: 'Invalid commit request parameters.', code: 'invalid_request' }, { status: 400 });
    }

    const { documentId, repository, branch, path, message } = parseResult.data;

    // Retrieve the Documentation record from PostgreSQL
    const doc = await prisma.documentation.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found.', code: 'not_found' }, { status: 404 });
    }

    // Retrieve the current target file immediately before commit to avoid conflicts
    let currentSha: string | undefined;
    try {
      const fileStatus = await getGitHubFileStatus(repository.owner, repository.name, path, branch);
      currentSha = fileStatus.sha;
    } catch (error: any) {
      if (error.name === 'GitHubError') {
        if (error.status === 404) {
          // File does not exist, safe to create
        } else if (error.status === 403 || error.status === 401) {
          return NextResponse.json({ success: false, error: 'You do not have permission to update this repository.', code: 'forbidden' }, { status: 403 });
        } else if (error.status === 409) {
          return NextResponse.json({ success: false, error: 'The file changed on GitHub before this commit was completed.', code: 'GITHUB_FILE_CONFLICT' }, { status: 409 });
        } else {
          return NextResponse.json({ success: false, error: 'GitHub could not be reached. Please try again.', code: 'github_error' }, { status: 502 });
        }
      } else {
        throw error;
      }
    }

    // Execute the commit using the latest saved Markdown
    let commitResult;
    try {
      commitResult = await commitGitHubFile(
        repository.owner,
        repository.name,
        path,
        branch,
        message,
        doc.markdown,
        currentSha
      );
    } catch (error: any) {
      if (error.name === 'GitHubError' && error.status === 409) {
        return NextResponse.json({ success: false, error: 'The file changed on GitHub before this commit was completed.', code: 'GITHUB_FILE_CONFLICT' }, { status: 409 });
      }
      if (error.name === 'GitHubError' && error.code === 'rate_limit') {
        return NextResponse.json({ success: false, error: 'GitHub is temporarily rate-limiting requests. Please try again shortly.', code: 'rate_limit' }, { status: 429 });
      }
      console.error('GitHub commit failed', error);
      return NextResponse.json({ success: false, error: 'The README could not be committed. Your GitDoc AI document is still safe.', code: 'unknown_error' }, { status: 500 });
    }

    const operation = currentSha ? 'update' : 'create';
    
    // Log the successful commit (sanitized)
    console.log(JSON.stringify({
      event: 'github_readme_commit',
      documentId,
      repository: `${repository.owner}/${repository.name}`,
      branch,
      path,
      operation,
      success: true,
      durationMs: 0 // Mocked for structure
    }));

    try {
      await ActivityService.logActivity({
        repositoryAnalysisId: doc.repositoryAnalysisId,
        documentId: doc.id,
        type: 'DOCUMENT_COMMITTED',
        summary: `Committed ${path} to GitHub (${branch})`,
        metadata: { repository: `${repository.owner}/${repository.name}`, branch, path, operation }
      });
    } catch (activityErr) {
      console.error('Failed to log document commit activity:', activityErr);
    }

    return NextResponse.json({
      success: true,
      data: commitResult
    });

  } catch (error: any) {
    console.error('Unhandled GitHub commit error:', error);
    return NextResponse.json({ success: false, error: 'The README could not be committed. Your GitDoc AI document is still safe.', code: 'internal_error' }, { status: 500 });
  }
}
