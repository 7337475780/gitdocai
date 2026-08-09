"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Search,
  Sparkles,
  Download,
  Eye,
  RefreshCw,
  XCircle,
  History,
  GitBranch,
} from "lucide-react";
import { GlassCard, StatusBadge } from "@/components/ui/card";
import { Button, GradientButton, SecondaryButton } from "@/components/ui/button";
import { PageContainer, EmptyState, LoadingSkeleton } from "@/components/ui/layout";
import { CustomSelect } from "@/components/ui/custom-select";

// ─── Helpers ──────────────────────────────────────────────────────────

function formatRelativeTime(dateString: string): string {
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

function getQualityVariant(status: string): "success" | "warning" | "error" | "default" {
  switch (status.toUpperCase()) {
    case "EXCELLENT":
    case "GOOD":
      return "success";
    case "NEEDS_IMPROVEMENT":
      return "warning";
    case "POOR":
      return "error";
    default:
      return "default";
  }
}

function getFreshnessVariant(status: string): "success" | "warning" | "error" | "default" {
  switch (status.toUpperCase()) {
    case "UP_TO_DATE":
      return "success";
    case "CHANGES_DETECTED":
    case "REVIEW_RECOMMENDED":
      return "warning";
    case "OUTDATED":
      return "error";
    default:
      return "default";
  }
}

function formatStatusText(status: string): string {
  return status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

interface DocumentItem {
  id: string;
  repositoryAnalysisId: string;
  repositoryName: string;
  repositoryOwner: string;
  title: string;
  type: string;
  qualityScore: number | null;
  qualityStatus: string;
  freshnessStatus: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export function DocumentationLibraryView() {
  const router = useRouter();
  const [documents, setDocuments] = React.useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filter and Search States
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [qualityFilter, setQualityFilter] = React.useState("");
  const [freshnessFilter, setFreshnessFilter] = React.useState("");
  const [sortBy, setSortBy] = React.useState("updatedAt");
  const [sortOrder, setSortOrder] = React.useState("desc");

  const fetchDocuments = React.useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter) params.set("type", typeFilter);
      if (qualityFilter) params.set("quality", qualityFilter);
      if (freshnessFilter) params.set("freshness", freshnessFilter);
      params.set("sort", sortBy);
      params.set("order", sortOrder);

      const res = await fetch(`/api/documentation?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setDocuments(json.data);
      } else {
        setError(json.error?.message || "Failed to load documentation library.");
      }
    } catch {
      setError("Network error while loading documents.");
    } finally {
      setIsLoading(false);
    }
  }, [search, typeFilter, qualityFilter, freshnessFilter, sortBy, sortOrder]);

  React.useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchDocuments();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchDocuments]);

  const handleExport = async (documentId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/documentation/${documentId}/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName.endsWith(".md") ? fileName : `${fileName}.md`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch {
      alert("Failed to export document.");
    }
  };

  // ─── Loading Skeletons ───────────────────────────────────────────

  if (isLoading && documents.length === 0) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <LoadingSkeleton className="h-8 w-48" />
              <LoadingSkeleton className="h-4 w-72" />
            </div>
            <LoadingSkeleton className="h-10 w-44 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <LoadingSkeleton className="h-10 rounded-lg" />
            <LoadingSkeleton className="h-10 rounded-lg" />
            <LoadingSkeleton className="h-10 rounded-lg" />
            <LoadingSkeleton className="h-10 rounded-lg" />
          </div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <LoadingSkeleton key={i} className="h-16 rounded-xl w-full" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  // ─── Error State ─────────────────────────────────────────────────

  if (error && documents.length === 0) {
    return (
      <PageContainer>
        <EmptyState
          icon={<XCircle className="h-6 w-6" />}
          title="Unable to load documentation library"
          description={error}
          action={
            <SecondaryButton onClick={fetchDocuments}>
              <RefreshCw className="h-4 w-4" /> Retry
            </SecondaryButton>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Documentation Library</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Search, filter, and manage your generated repository files.
            </p>
          </div>
          <div>
            <GradientButton onClick={() => router.push("/analyze")} className="text-sm px-4 py-2 h-auto">
              <Sparkles className="h-4 w-4" /> Analyze Repository
            </GradientButton>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-4 rounded-xl border border-border bg-card/20 backdrop-blur-sm">
          {/* Search */}
          <div className="relative col-span-1 lg:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by title, repo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-brand-cyan/50 transition-colors"
            />
          </div>

          {/* Type Filter */}
          <CustomSelect
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: "", label: "All Document Types" },
              { value: "README", label: "README" },
              { value: "SETUP", label: "Setup Guide" },
              { value: "ARCHITECTURE", label: "Architecture" },
              { value: "API", label: "API Docs" },
              { value: "CONTRIBUTING", label: "Contributing" },
            ]}
            placeholder="Document Type"
          />

          {/* Quality Filter */}
          <CustomSelect
            value={qualityFilter}
            onChange={setQualityFilter}
            options={[
              { value: "", label: "All Quality Statuses" },
              { value: "EXCELLENT", label: "Excellent (≥90)" },
              { value: "GOOD", label: "Good (≥75)" },
              { value: "NEEDS_IMPROVEMENT", label: "Needs Improvement" },
              { value: "POOR", label: "Poor (<60)" },
              { value: "UNKNOWN", label: "Unassessed" },
            ]}
            placeholder="Quality Status"
          />

          {/* Freshness Filter */}
          <CustomSelect
            value={freshnessFilter}
            onChange={setFreshnessFilter}
            options={[
              { value: "", label: "All Freshness Statuses" },
              { value: "UP_TO_DATE", label: "Up to date" },
              { value: "CHANGES_DETECTED", label: "Changes detected" },
              { value: "REVIEW_RECOMMENDED", label: "Review recommended" },
              { value: "OUTDATED", label: "Stale / Outdated" },
              { value: "UNKNOWN", label: "Unscanned" },
            ]}
            placeholder="Freshness Status"
          />

          {/* Sorting */}
          <div className="flex gap-2">
            <CustomSelect
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: "updatedAt", label: "Last Updated" },
                { value: "createdAt", label: "Date Created" },
                { value: "title", label: "Document Title" },
                { value: "qualityScore", label: "Quality Score" },
              ]}
              placeholder="Sort By"
              className="flex-1"
            />
            <button
              onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              className="bg-background/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground hover:bg-secondary/50 transition-colors"
            >
              {sortOrder === "desc" ? "↓" : "↑"}
            </button>
          </div>
        </div>

        {/* Empty State */}
        {documents.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="No documentation has been generated yet"
            description={
              search || typeFilter || qualityFilter
                ? "No documents match the active filters."
                : "Analyze a GitHub repository to generate documentation and see your files here."
            }
            action={
              <GradientButton onClick={() => router.push("/analyze")}>
                <Sparkles className="h-4 w-4" /> Analyze Repository
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
                    <th className="px-6 py-4">Title & Type</th>
                    <th className="px-6 py-4">Repository</th>
                    <th className="px-6 py-4 text-center">Version</th>
                    <th className="px-6 py-4">Quality Score</th>
                    <th className="px-6 py-4">Freshness</th>
                    <th className="px-6 py-4">Last Updated</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50 text-sm">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-secondary/20 transition-colors group">
                      <td className="px-6 py-4">
                        <div>
                          <Link
                            href={`/studio/${doc.id}`}
                            className="font-medium text-foreground hover:text-brand-cyan transition-colors"
                          >
                            {doc.title}
                          </Link>
                          <span className="ml-2 inline-flex items-center rounded bg-brand-blue/10 px-1.5 py-0.5 text-xxs font-medium text-brand-blue border border-brand-blue/20">
                            {doc.type}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <GitBranch className="h-3.5 w-3.5" />
                          <span>{doc.repositoryOwner}/{doc.repositoryName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center font-medium text-muted-foreground">
                        v{doc.revision}
                      </td>
                      <td className="px-6 py-4">
                        {doc.qualityScore !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{doc.qualityScore}</span>
                            <StatusBadge variant={getQualityVariant(doc.qualityStatus)}>
                              {formatStatusText(doc.qualityStatus)}
                            </StatusBadge>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge variant={getFreshnessVariant(doc.freshnessStatus)}>
                          {formatStatusText(doc.freshnessStatus)}
                        </StatusBadge>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {formatRelativeTime(doc.updatedAt)}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => router.push(`/studio/${doc.id}`)}
                          className="h-8 w-8"
                          title="Open in Studio"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => router.push(`/studio/${doc.id}?tab=versions`)}
                          className="h-8 w-8"
                          title="Version History"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleExport(doc.id, doc.title)}
                          className="h-8 w-8"
                          title="Export Markdown"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:hidden gap-4">
              {documents.map((doc) => (
                <GlassCard key={doc.id} className="p-4 space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/studio/${doc.id}`}
                        className="font-semibold text-foreground hover:text-brand-cyan transition-colors line-clamp-1"
                      >
                        {doc.title}
                      </Link>
                      <span className="inline-flex items-center rounded bg-brand-blue/10 px-1.5 py-0.5 text-xxs font-medium text-brand-blue border border-brand-blue/20">
                        {doc.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <GitBranch className="h-3.5 w-3.5" />
                      <span>{doc.repositoryOwner}/{doc.repositoryName}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-b border-border/40 py-2.5">
                    <div>
                      <span className="text-muted-foreground">Version:</span>{" "}
                      <span className="font-semibold">v{doc.revision}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Updated:</span>{" "}
                      <span className="font-semibold">{formatRelativeTime(doc.updatedAt)}</span>
                    </div>
                    <div className="col-span-2 flex flex-col gap-1.5 mt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Quality Score:</span>
                        {doc.qualityScore !== null ? (
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{doc.qualityScore}</span>
                            <StatusBadge variant={getQualityVariant(doc.qualityStatus)}>
                              {formatStatusText(doc.qualityStatus)}
                            </StatusBadge>
                          </div>
                        ) : (
                          <span className="font-medium">—</span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Freshness:</span>
                        <StatusBadge variant={getFreshnessVariant(doc.freshnessStatus)}>
                          {formatStatusText(doc.freshnessStatus)}
                        </StatusBadge>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <SecondaryButton
                      onClick={() => router.push(`/studio/${doc.id}`)}
                      className="flex-1 text-xs py-2 h-auto"
                    >
                      <Eye className="h-3.5 w-3.5" /> Open
                    </SecondaryButton>
                    <SecondaryButton
                      onClick={() => handleExport(doc.id, doc.title)}
                      className="text-xs p-2 h-auto shrink-0"
                      title="Export Markdown"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </SecondaryButton>
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
