"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  GitBranch,
  Search,
  Sparkles,
  ExternalLink,
  RefreshCw,
  XCircle,
  Eye,
  Settings,
} from "lucide-react";
import { GlassCard, StatusBadge } from "@/components/ui/card";
import { GradientButton, SecondaryButton } from "@/components/ui/button";
import { PageContainer, EmptyState, LoadingSkeleton } from "@/components/ui/layout";

// ─── Helpers ──────────────────────────────────────────────────────────

function formatRelativeTime(dateString?: string): string {
  if (!dateString) return "unknown";
  const now = Date.now();
  const diff = now - new Date(dateString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

interface RepositoryItem {
  owner: string;
  name: string;
  fullName: string;
  defaultBranch: string;
  private: boolean;
  language: string | null;
  updatedAt: string;
  visibility: string;
  analysisId: string | null;
  analysisStatus: "COMPLETED" | "NONE";
}

export function GitHubRepositoriesView() {
  const router = useRouter();
  const [status, setStatus] = React.useState<{
    connected: boolean;
    configured: boolean;
    user: { name: string; login: string; avatarUrl?: string } | null;
  } | null>(null);
  const [repositories, setRepositories] = React.useState<RepositoryItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRepoLoading, setIsRepoLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const fetchRepos = React.useCallback(async (searchQuery: string) => {
    try {
      setIsRepoLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      const res = await fetch(`/api/github/repositories?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setRepositories(json.data.repositories);
      } else {
        setRepositories([]);
      }
    } catch {
      // Silently fall back to empty repositories
      setRepositories([]);
    } finally {
      setIsRepoLoading(false);
    }
  }, []);

  const fetchStatus = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch("/api/github/status");
      const json = await res.json();
      if (json.success) {
        setStatus(json.data);
        if (json.data.connected) {
          fetchRepos(search);
        }
      } else {
        setError("Failed to fetch connection status.");
      }
    } catch {
      setError("Network error while checking status.");
    } finally {
      setIsLoading(false);
    }
  }, [search, fetchRepos]);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Debounced search trigger
  React.useEffect(() => {
    if (status?.connected) {
      const delayDebounceFn = setTimeout(() => {
        fetchRepos(search);
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    }
  }, [search, status?.connected, fetchRepos]);

  // ─── Loading Skeletons ───────────────────────────────────────────

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <div className="space-y-2">
            <LoadingSkeleton className="h-8 w-48" />
            <LoadingSkeleton className="h-4 w-72" />
          </div>
          <LoadingSkeleton className="h-44 rounded-xl w-full" />
        </div>
      </PageContainer>
    );
  }

  // ─── Error State ─────────────────────────────────────────────────

  if (error && !status) {
    return (
      <PageContainer>
        <EmptyState
          icon={<XCircle className="h-6 w-6" />}
          title="Unable to load GitHub integration"
          description={error}
          action={
            <SecondaryButton onClick={fetchStatus}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </SecondaryButton>
          }
        />
      </PageContainer>
    );
  }

  // ─── Configuration Missing State ───────────────────────────────────

  if (status && !status.configured) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">GitHub Repositories</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your account to analyze public and private repositories.
            </p>
          </div>

          <GlassCard className="p-6 max-w-xl mx-auto space-y-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-amber/10 mx-auto">
              <Settings className="h-6 w-6 text-brand-amber" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">OAuth Credentials Not Configured</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              GitHub OAuth application credentials are not set in the workspace environment. To enable repository connection:
            </p>
            <div className="text-xs text-left bg-background/50 border border-border rounded-lg p-4 font-mono space-y-1">
              <p># Configure these in your .env.local file:</p>
              <p>GITHUB_CLIENT_ID=your_client_id</p>
              <p>GITHUB_CLIENT_SECRET=your_client_secret</p>
              <p>GITHUB_OAUTH_REDIRECT_URI=http://localhost:3000/api/github/callback</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Note: You can still analyze public repositories by pasting their URLs directly in the AI Analyze section.
            </p>
            <div className="pt-2">
              <GradientButton onClick={() => router.push("/analyze")}>
                Go to Analyze Url
              </GradientButton>
            </div>
          </GlassCard>
        </div>
      </PageContainer>
    );
  }

  // ─── Disconnected State ───────────────────────────────────────────

  if (status && !status.connected) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">GitHub Repositories</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Connect your account to analyze public and private repositories.
            </p>
          </div>

          <GlassCard className="p-6 max-w-lg mx-auto space-y-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-cyan/10 mx-auto">
              <GitBranch className="h-6 w-6 text-brand-cyan" />
            </div>
            <h2 className="text-lg font-semibold text-foreground">Connect GitHub Account</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Link your GitHub account to access your repositories directly, view metadata, and check their documentation intelligence statuses in real-time.
            </p>
            <div className="pt-2">
              <GradientButton onClick={() => window.location.href = "/api/github/connect"}>
                Connect GitHub
              </GradientButton>
            </div>
          </GlassCard>
        </div>
      </PageContainer>
    );
  }

  // ─── Connected State ──────────────────────────────────────────────

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">GitHub Repositories</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Select and manage your connected repository documentation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {status?.user && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card/25 text-xs text-muted-foreground">
                {status.user.avatarUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element -- Dynamic GitHub user avatar */
                  <img
                    src={status.user.avatarUrl}
                    alt={status.user.name}
                    className="h-5 w-5 rounded-full object-cover"
                  />
                )}
                <span>Connected as <b>@{status.user.login}</b></span>
              </div>
            )}
            <SecondaryButton onClick={() => window.location.href = "/api/github/disconnect"} className="text-xs px-3 py-1.5 h-auto">
              Disconnect
            </SecondaryButton>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 rounded-xl border border-border bg-card/20 backdrop-blur-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-brand-cyan/50 transition-colors"
            />
          </div>
        </div>

        {/* Repositories List */}
        {isRepoLoading && repositories.length === 0 ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <LoadingSkeleton key={i} className="h-16 rounded-xl w-full" />
            ))}
          </div>
        ) : repositories.length === 0 ? (
          <EmptyState
            icon={<GitBranch className="h-6 w-6" />}
            title="No repositories found"
            description={search ? "Try adjusting your search criteria." : "GitHub returned 0 accessible repositories."}
            action={
              <GradientButton onClick={() => fetchRepos(search)}>
                <RefreshCw className="h-4 w-4 mr-2" /> Reload
              </GradientButton>
            }
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden rounded-xl border border-border bg-card/10 backdrop-blur-sm">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="px-6 py-4">Repository</th>
                    <th className="px-6 py-4">Visibility</th>
                    <th className="px-6 py-4">Language</th>
                    <th className="px-6 py-4">Default Branch</th>
                    <th className="px-6 py-4">Last Updated</th>
                    <th className="px-6 py-4">GitDoc AI</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-sm">
                  {repositories.map((repo) => (
                    <tr key={repo.fullName} className="hover:bg-secondary/20 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="font-semibold text-foreground">{repo.fullName}</span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge variant={repo.private ? "warning" : "success"}>
                          {repo.private ? "Private" : "Public"}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {repo.language || "Unknown"}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                        {repo.defaultBranch}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {formatRelativeTime(repo.updatedAt)}
                      </td>
                      <td className="px-6 py-4">
                        {repo.analysisStatus === "COMPLETED" ? (
                          <StatusBadge variant="success">Analyzed</StatusBadge>
                        ) : (
                          <StatusBadge variant="default">Not Analyzed</StatusBadge>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        {repo.analysisStatus === "COMPLETED" && repo.analysisId ? (
                          <button
                            onClick={() => router.push(`/repository/${repo.analysisId}/intelligence`)}
                            className="p-1.5 rounded-lg border border-border bg-background/50 hover:bg-secondary/80 text-foreground transition-colors inline-flex items-center gap-1 text-xs"
                            title="View Intelligence"
                          >
                            <Eye className="h-4 w-4" /> View Analysis
                          </button>
                        ) : (
                          <button
                            onClick={() => router.push(`/analyze?url=${encodeURIComponent(`https://github.com/${repo.fullName}`)}`)}
                            className="p-1.5 rounded-lg border border-brand-cyan/20 bg-brand-cyan/5 hover:bg-brand-cyan/15 text-brand-cyan transition-colors inline-flex items-center gap-1 text-xs"
                            title="Analyze Repo"
                          >
                            <Sparkles className="h-4 w-4" /> Analyze
                          </button>
                        )}
                        <a
                          href={`https://github.com/${repo.fullName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg border border-border bg-background/50 hover:bg-secondary/80 text-foreground transition-colors inline-flex"
                          title="Open on GitHub"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:hidden gap-4">
              {repositories.map((repo) => (
                <GlassCard key={repo.fullName} className="p-4 space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-foreground line-clamp-1">{repo.fullName}</span>
                      <StatusBadge variant={repo.private ? "warning" : "success"}>
                        {repo.private ? "Private" : "Public"}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Updated {formatRelativeTime(repo.updatedAt)}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-border/40 py-2.5">
                    <div>
                      <span className="text-muted-foreground">Language:</span>{" "}
                      <span className="font-semibold">{repo.language || "Unknown"}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Branch:</span>{" "}
                      <span className="font-semibold font-mono">{repo.defaultBranch}</span>
                    </div>
                    <div className="col-span-2 flex justify-between items-center mt-1">
                      <span className="text-muted-foreground">Status:</span>
                      {repo.analysisStatus === "COMPLETED" ? (
                        <StatusBadge variant="success">Analyzed</StatusBadge>
                      ) : (
                        <StatusBadge variant="default">Not Analyzed</StatusBadge>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {repo.analysisStatus === "COMPLETED" && repo.analysisId ? (
                      <SecondaryButton
                        onClick={() => router.push(`/repository/${repo.analysisId}/intelligence`)}
                        className="flex-1 text-xs py-2 h-auto"
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" /> View Analysis
                      </SecondaryButton>
                    ) : (
                      <GradientButton
                        onClick={() => router.push(`/analyze?url=${encodeURIComponent(`https://github.com/${repo.fullName}`)}`)}
                        className="flex-1 text-xs py-2 h-auto"
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1" /> Analyze
                      </GradientButton>
                    )}
                    <a
                      href={`https://github.com/${repo.fullName}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg border border-border bg-background/50 hover:bg-secondary/80 text-foreground transition-colors inline-flex shrink-0"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                </GlassCard>
              ))}
            </div>
          </>
        )}
      </div>
    </PageContainer>
  );
}
