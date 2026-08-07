"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  FileText,
  RotateCcw,
  Shield,
  Search,
  RefreshCw,
  GitBranch,
  Download,
  Eye,
  Globe,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ListFilter,
  Trash2,
} from "lucide-react";

interface Activity {
  id: string;
  type: string;
  summary: string;
  createdAt: string;
  metadata: Record<string, any>;
  repository: {
    id: string;
    name: string;
    fullName: string;
  } | null;
  document: {
    id: string;
    title: string;
    isDeleted: boolean;
  } | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const EVENT_TYPES = [
  { value: "", label: "All Events" },
  { value: "DOCUMENT_GENERATED", label: "Documentation Generated" },
  { value: "DOCUMENT_UPDATED", label: "Documentation Edited" },
  { value: "DOCUMENT_RESTORED", label: "Document Restored" },
  { value: "QUALITY_EVALUATED", label: "Quality Improvement Applied" },
  { value: "FRESHNESS_SCANNED", label: "Freshness Scan Completed" },
  { value: "SECTION_REGENERATED", label: "Section Regenerated" },
  { value: "DOCUMENT_COMMITTED", label: "Committed to GitHub" },
  { value: "DOCUMENT_EXPORTED", label: "Documentation Exported" },
  { value: "SITE_PUBLISHED", label: "Site Published" },
  { value: "SITE_REPUBLISHED", label: "Site Republished" },
];

export function HistoryView() {
  const router = useRouter();

  // State for data
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [pagination, setPagination] = React.useState<PaginationInfo | null>(null);
  const [repositories, setRepositories] = React.useState<Array<{ id: string; name: string }>>([]);
  const [documents, setDocuments] = React.useState<Array<{ id: string; title: string }>>([]);

  // Filter States
  const [searchQuery, setSearchQuery] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [selectedType, setSelectedType] = React.useState("");
  const [selectedRepo, setSelectedRepo] = React.useState("");
  const [selectedDoc, setSelectedDoc] = React.useState("");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [selectedStatus, setSelectedStatus] = React.useState("");
  const [sortBy, setSortBy] = React.useState("newest");
  const [currentPage, setCurrentPage] = React.useState(1);

  // Status States
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Debounce search query
  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load repositories and documents for filtering dropdowns
  React.useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [dashRes, docsRes] = await Promise.all([
          fetch("/api/dashboard"),
          fetch("/api/documentation"),
        ]);
        const dashJson = await dashRes.json();
        const docsJson = await docsRes.json();

        if (dashJson.success && dashJson.data?.repositories) {
          setRepositories(
            dashJson.data.repositories.map((r: any) => ({
              id: r.id,
              name: r.repositoryName,
            }))
          );
        }
        if (docsJson.success && docsJson.data) {
          setDocuments(
            docsJson.data.map((d: any) => ({
              id: d.documentId,
              title: d.metadata?.title || d.metadata?.fileName || d.documentId,
            }))
          );
        }
      } catch (err) {
        console.error("Failed to load filter dropdown metadata", err);
      }
    };

    loadDropdownData();
  }, []);

  // Fetch activities on change
  const fetchActivities = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        sortBy,
      });

      if (debouncedSearch) params.append("query", debouncedSearch);
      if (selectedType) params.append("type", selectedType);
      if (selectedRepo) params.append("repositoryAnalysisId", selectedRepo);
      if (selectedDoc) params.append("documentId", selectedDoc);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (selectedStatus) params.append("status", selectedStatus);

      const res = await fetch(`/api/history?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setActivities(json.data.activities);
        setPagination(json.data.pagination);
      } else {
        setError(json.error?.message || "Failed to load activity history.");
      }
    } catch {
      setError("A network error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, debouncedSearch, selectedType, selectedRepo, selectedDoc, startDate, endDate, selectedStatus, sortBy]);

  React.useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedType("");
    setSelectedRepo("");
    setSelectedDoc("");
    setStartDate("");
    setEndDate("");
    setSelectedStatus("");
    setSortBy("newest");
    setCurrentPage(1);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "DOCUMENT_GENERATED":
        return <Sparkles className="h-5 w-5 text-brand-cyan" />;
      case "DOCUMENT_UPDATED":
        return <FileText className="h-5 w-5 text-brand-blue" />;
      case "DOCUMENT_RESTORED":
        return <RotateCcw className="h-5 w-5 text-brand-violet" />;
      case "QUALITY_EVALUATED":
        return <Shield className="h-5 w-5 text-brand-teal" />;
      case "FRESHNESS_SCANNED":
        return <Search className="h-5 w-5 text-brand-amber" />;
      case "SECTION_REGENERATED":
        return <RefreshCw className="h-5 w-5 text-brand-cyan" />;
      case "DOCUMENT_COMMITTED":
        return <GitBranch className="h-5 w-5 text-brand-teal" />;
      case "DOCUMENT_EXPORTED":
        return <Download className="h-5 w-5 text-brand-blue" />;
      case "SITE_PREVIEWED":
        return <Eye className="h-5 w-5 text-brand-violet" />;
      case "SITE_PUBLISHED":
      case "SITE_REPUBLISHED":
        return <Globe className="h-5 w-5 text-brand-teal" />;
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const handleNavigation = (activity: Activity) => {
    const { type, document, repository } = activity;

    if (type === "DOCUMENT_GENERATED" || type === "DOCUMENT_UPDATED" || type === "DOCUMENT_EXPORTED") {
      if (document && !document.isDeleted) {
        router.push(`/studio/${document.id}`);
      }
    } else if (type === "DOCUMENT_RESTORED") {
      if (document && !document.isDeleted) {
        router.push(`/studio/${document.id}?tab=history`);
      }
    } else if (type === "QUALITY_EVALUATED") {
      if (document && !document.isDeleted) {
        router.push(`/studio/${document.id}?tab=quality`);
      }
    } else if (type === "FRESHNESS_SCANNED") {
      if (repository) {
        router.push(`/repository/${repository.id}/intelligence`);
      }
    } else if (type === "SITE_PUBLISHED" || type === "SITE_REPUBLISHED") {
      if (repository) {
        router.push(`/repository/${repository.id}/intelligence`);
      }
    } else {
      if (repository) {
        router.push(`/repository/${repository.id}/intelligence`);
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl font-bold leading-7 text-foreground sm:truncate sm:text-3xl tracking-tight">
            Activity History
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A comprehensive, real-time log of documentation updates, scans, and publishing events.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-card/40 border border-border rounded-xl p-5 mb-8 backdrop-blur-md">
        <div className="flex items-center gap-2 mb-4">
          <ListFilter className="h-4 w-4 text-brand-cyan" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Filter Activity Log
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search repository, document..."
              className="pl-9 h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus-ring placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Event Type Filter */}
          <select
            className="h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus-ring"
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setCurrentPage(1);
            }}
          >
            {EVENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          {/* Repository Filter */}
          <select
            className="h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus-ring"
            value={selectedRepo}
            onChange={(e) => {
              setSelectedRepo(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Repositories</option>
            {repositories.map((repo) => (
              <option key={repo.id} value={repo.id}>
                {repo.name}
              </option>
            ))}
          </select>

          {/* Document Filter */}
          <select
            className="h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus-ring"
            value={selectedDoc}
            onChange={(e) => {
              setSelectedDoc(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">All Documents</option>
            {documents.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.title}
              </option>
            ))}
          </select>

          {/* Start Date */}
          <div className="relative">
            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground pointer-events-none">Start</span>
            <input
              type="date"
              className="h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus-ring"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* End Date */}
          <div className="relative">
            <span className="absolute right-3 top-2.5 text-xs text-muted-foreground pointer-events-none">End</span>
            <input
              type="date"
              className="h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus-ring"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          {/* Sorting */}
          <select
            className="h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus-ring"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>

          {/* Reset Filters */}
          <button
            onClick={clearFilters}
            className="inline-flex items-center justify-center gap-1.5 h-10 w-full rounded-md border border-border bg-secondary/50 hover:bg-secondary text-sm font-medium transition-colors focus-ring"
          >
            <Trash2 className="h-4 w-4" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 mb-8">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Failed to Load History</h3>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="p-5 rounded-xl border border-border bg-card/10 animate-shimmer flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 w-full animate-pulse">
                <div className="h-10 w-10 rounded-lg bg-secondary/60 shrink-0" />
                <div className="space-y-2 w-full max-w-lg">
                  <div className="h-4 bg-secondary/60 rounded w-3/4" />
                  <div className="h-3 bg-secondary/40 rounded w-1/2" />
                </div>
              </div>
              <div className="h-8 w-16 bg-secondary/60 rounded-lg shrink-0 animate-pulse" />
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 bg-card/20 border border-dashed border-border rounded-2xl text-center">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No activity yet.</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            Get started by analyzing a GitHub repository to build documentation.
          </p>
          <button
            onClick={() => router.push("/analyze")}
            className="inline-flex h-10 items-center justify-center rounded-md bg-brand-cyan px-6 text-sm font-semibold text-black shadow-lg shadow-brand-cyan/20 hover:opacity-90 transition-opacity"
          >
            Analyze a Repository
          </button>
        </div>
      ) : (
        /* Event List / Timeline */
        <div className="space-y-6">
          <div className="bg-card/20 border border-border rounded-xl overflow-hidden">
            <div className="divide-y divide-border">
              {activities.map((activity) => {
                const hasDoc = !!activity.document;
                const isDocDeleted = activity.document?.isDeleted;

                return (
                  <div
                    key={activity.id}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-secondary/20 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-lg bg-secondary/50 border border-border flex items-center justify-center shrink-0">
                        {getActivityIcon(activity.type)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{activity.summary}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                          {activity.repository && (
                            <span className="font-semibold text-brand-cyan">
                              {activity.repository.name}
                            </span>
                          )}
                          {activity.repository && hasDoc && <span>•</span>}
                          {hasDoc && (
                            <span
                              className={
                                isDocDeleted
                                  ? "line-through text-muted-foreground/60"
                                  : "text-brand-blue"
                              }
                            >
                              {activity.document?.title}
                            </span>
                          )}
                          {isDocDeleted && (
                            <span className="px-1.5 py-0.5 rounded bg-destructive/10 text-destructive text-[10px] font-medium uppercase tracking-wider">
                              Unavailable
                            </span>
                          )}
                          <span>•</span>
                          <span>{new Date(activity.createdAt).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      <button
                        onClick={() => handleNavigation(activity)}
                        disabled={hasDoc && isDocDeleted}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                          hasDoc && isDocDeleted
                            ? "border-border bg-muted/20 text-muted-foreground/40 cursor-not-allowed"
                            : "border-border bg-background hover:bg-secondary hover:border-brand-cyan/40 text-foreground"
                        }`}
                      >
                        View
                        <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-6">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={!pagination.hasPrevPage}
                  className="relative inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={!pagination.hasNextPage}
                  className="relative ml-3 inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Showing{" "}
                    <span className="font-medium text-foreground">
                      {(pagination.page - 1) * pagination.limit + 1}
                    </span>{" "}
                    to{" "}
                    <span className="font-medium text-foreground">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{" "}
                    of <span className="font-medium text-foreground">{pagination.total}</span> results
                  </p>
                </div>
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={!pagination.hasPrevPage}
                      className="relative inline-flex items-center rounded-l-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border hover:bg-secondary focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </button>
                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        aria-current={p === pagination.page ? "page" : undefined}
                        className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 ${
                          p === pagination.page
                            ? "z-10 bg-brand-cyan text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
                            : "text-foreground ring-1 ring-inset ring-border hover:bg-secondary focus:outline-offset-0"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={!pagination.hasNextPage}
                      className="relative inline-flex items-center rounded-r-md px-2 py-2 text-muted-foreground ring-1 ring-inset ring-border hover:bg-secondary focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
