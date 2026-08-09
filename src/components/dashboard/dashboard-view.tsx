"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  Heart,
  Shield,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  GitBranch,
  Globe,
  Eye,
  RotateCcw,
  Download,
  Search,
  Zap,
  HelpCircle,
  XCircle,
} from "lucide-react";
import { GlassCard, MetricCard, StatusBadge } from "@/components/ui/card";
import { GradientButton, SecondaryButton } from "@/components/ui/button";
import { PageContainer, EmptyState, LoadingSkeleton } from "@/components/ui/layout";
import { cn } from "@/lib/utils";
import type { DashboardData } from "@/app/api/dashboard/route";

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

function getHealthVariant(score: number | null): "success" | "warning" | "error" | "default" {
  if (score === null) return "default";
  if (score >= 75) return "success";
  if (score >= 50) return "warning";
  return "error";
}

function getQualityVariant(
  status: string | undefined
): "success" | "warning" | "error" | "default" {
  switch (status) {
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

function getFreshnessVariant(
  status: string | undefined
): "success" | "warning" | "error" | "default" {
  switch (status) {
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

function getActivityIcon(type: string) {
  switch (type) {
    case "DOCUMENT_GENERATED":
      return <Sparkles className="h-4 w-4 text-brand-cyan" />;
    case "DOCUMENT_UPDATED":
      return <FileText className="h-4 w-4 text-brand-blue" />;
    case "DOCUMENT_RESTORED":
      return <RotateCcw className="h-4 w-4 text-brand-violet" />;
    case "QUALITY_EVALUATED":
      return <Shield className="h-4 w-4 text-brand-teal" />;
    case "FRESHNESS_SCANNED":
      return <Search className="h-4 w-4 text-brand-amber" />;
    case "SECTION_REGENERATED":
      return <RefreshCw className="h-4 w-4 text-brand-cyan" />;
    case "DOCUMENT_COMMITTED":
      return <GitBranch className="h-4 w-4 text-brand-teal" />;
    case "DOCUMENT_EXPORTED":
      return <Download className="h-4 w-4 text-brand-blue" />;
    case "SITE_PREVIEWED":
      return <Eye className="h-4 w-4 text-brand-violet" />;
    case "SITE_PUBLISHED":
    case "SITE_REPUBLISHED":
      return <Globe className="h-4 w-4 text-brand-teal" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
}

function getActivityHref(
  type: string,
  documentId: string | null,
  analysisId: string
): string {
  if (documentId) {
    if (type === "QUALITY_EVALUATED") return `/studio/${documentId}?tab=quality`;
    if (type === "FRESHNESS_SCANNED") return `/studio/${documentId}?tab=freshness`;
    return `/studio/${documentId}`;
  }
  if (type === "SITE_PUBLISHED" || type === "SITE_REPUBLISHED" || type === "SITE_PREVIEWED") {
    return `/repository/${analysisId}/intelligence`;
  }
  return `/repository/${analysisId}/intelligence`;
}

function getSeverityVariant(severity: string): "error" | "warning" | "info" {
  switch (severity) {
    case "High":
      return "error";
    case "Medium":
      return "warning";
    default:
      return "info";
  }
}

// ─── Component ────────────────────────────────────────────────────────

export function DashboardView() {
  const router = useRouter();
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [user, setUser] = React.useState<{
    name: string;
    email: string;
    avatarUrl?: string;
  } | null>(null);

  const fetchDashboard = React.useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      const res = await fetch("/api/dashboard");
      const json = await res.json();

      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error?.message || "Failed to load dashboard.");
      }
    } catch {
      setError("Network error while loading dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Fetch user info (same pattern as sidebar)
  React.useEffect(() => {
    fetch("/api/github/status")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data.connected && json.data.user) {
          setUser(json.data.user);
        }
      })
      .catch(() => {});
  }, []);

  // ─── Loading State ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <PageContainer>
        <div className="space-y-8">
          {/* Welcome skeleton */}
          <div className="space-y-3">
            <LoadingSkeleton className="h-8 w-64" />
            <LoadingSkeleton className="h-5 w-96" />
          </div>

          {/* Metrics skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <LoadingSkeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>

          {/* Cards skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <LoadingSkeleton className="h-40 rounded-xl" />
            <LoadingSkeleton className="h-40 rounded-xl" />
            <LoadingSkeleton className="h-40 rounded-xl" />
          </div>

          {/* Activity + Attention skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <LoadingSkeleton className="h-64 rounded-xl" />
            <LoadingSkeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </PageContainer>
    );
  }

  // ─── Error State ─────────────────────────────────────────────────

  if (error) {
    return (
      <PageContainer>
        <EmptyState
          icon={<XCircle className="h-6 w-6" />}
          title="Unable to load dashboard"
          description={error}
          action={
            <SecondaryButton onClick={fetchDashboard}>
              <RefreshCw className="h-4 w-4" /> Retry
            </SecondaryButton>
          }
        />
      </PageContainer>
    );
  }

  // ─── Empty State (no analyses) ───────────────────────────────────

  if (!data || data.overview.totalRepositories === 0) {
    return (
      <PageContainer>
        <div className="space-y-8">
          <WelcomeSection user={user} />
          <EmptyState
            icon={<LayoutDashboard className="h-6 w-6" />}
            title="No repository analyses yet"
            description="Analyze a GitHub repository to generate documentation and see your dashboard come to life."
            action={
              <GradientButton onClick={() => router.push("/analyze")}>
                <Sparkles className="h-4 w-4" /> Analyze Repository
              </GradientButton>
            }
          />
        </div>
      </PageContainer>
    );
  }

  // ─── Populated Dashboard ─────────────────────────────────────────

  const { overview, latestAnalysis, recentActivity } = data;
  const intelligence = latestAnalysis?.intelligence;
  const attentionItems = intelligence?.attentionItems || [];
  const nextAction = intelligence?.nextAction;
  const latestDocId = intelligence?.documents?.[0]?.id;

  return (
    <PageContainer>
      <div className="space-y-8">
        {/* 1. Welcome Section */}
        <WelcomeSection user={user} latestDocId={latestDocId} />

        {/* 2. Overview Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <MetricCard
            title="Repositories Analyzed"
            value={String(overview.totalRepositories)}
            icon={<GitBranch className="h-5 w-5 text-brand-cyan" />}
          />
          <MetricCard
            title="Documents Generated"
            value={String(overview.totalDocuments)}
            icon={<FileText className="h-5 w-5 text-brand-blue" />}
          />
          <MetricCard
            title="Health Score"
            value={overview.averageHealthScore !== null ? `${overview.averageHealthScore}%` : "—"}
            icon={<Heart className="h-5 w-5 text-brand-teal" />}
          />
          <MetricCard
            title="Coverage"
            value={overview.averageCoverage !== null ? `${overview.averageCoverage}%` : "—"}
            icon={<Shield className="h-5 w-5 text-brand-violet" />}
          />
          <MetricCard
            title="Avg Quality"
            value={overview.averageQualityScore !== null ? `${overview.averageQualityScore}/100` : "—"}
            icon={<Zap className="h-5 w-5 text-brand-amber" />}
          />
          <MetricCard
            title="Needing Review"
            value={String(overview.documentsNeedingReview)}
            icon={<AlertTriangle className="h-5 w-5 text-brand-amber" />}
          />
        </motion.div>

        {/* 3. Health / Quality / Freshness Cards */}
        {intelligence && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-4"
          >
            {/* Health Card */}
            <GlassCard className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Documentation Health</h3>
                <StatusBadge variant={getHealthVariant(overview.averageHealthScore)}>
                  {intelligence.health.label}
                </StatusBadge>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {overview.averageHealthScore !== null ? `${overview.averageHealthScore}%` : "—"}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {intelligence.health.summary}
              </p>
              {latestAnalysis && (
                <Link
                  href={`/repository/${latestAnalysis.id}/intelligence`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-brand-cyan hover:underline"
                >
                  View Intelligence Center <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </GlassCard>

            {/* Quality Card */}
            <GlassCard className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Documentation Quality</h3>
                <StatusBadge variant={getQualityVariant(intelligence.quality.status)}>
                  {intelligence.quality.userFacingLabel}
                </StatusBadge>
              </div>
              <div className="text-3xl font-bold text-foreground">
                {intelligence.quality.averageScore !== null
                  ? `${intelligence.quality.averageScore}/100`
                  : "—"}
              </div>
              <p className="text-xs text-muted-foreground">
                {intelligence.documents.length} document{intelligence.documents.length !== 1 ? "s" : ""} evaluated
              </p>
            </GlassCard>

            {/* Freshness Card */}
            <GlassCard className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Documentation Freshness</h3>
                <StatusBadge variant={getFreshnessVariant(intelligence.freshness.status)}>
                  {intelligence.freshness.status === "UP_TO_DATE"
                    ? "Up to date"
                    : intelligence.freshness.status === "UNKNOWN"
                      ? "Not scanned"
                      : intelligence.freshness.status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase())}
                </StatusBadge>
              </div>
              <div className="space-y-1.5 text-sm">
                <FreshnessRow
                  label="Current"
                  value={intelligence.freshness.upToDateCount}
                  variant="success"
                />
                <FreshnessRow
                  label="Needs review"
                  value={
                    intelligence.freshness.reviewRecommendedCount +
                    intelligence.freshness.changesDetectedCount
                  }
                  variant="warning"
                />
                <FreshnessRow
                  label="Stale"
                  value={intelligence.freshness.outdatedCount}
                  variant="error"
                />
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* 4. Next-Best Action */}
        {nextAction && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <GlassCard glow className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-cyan/10 border border-brand-cyan/20">
                  <Zap className="h-5 w-5 text-brand-cyan" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">
                    Recommended Next Step
                  </h3>
                  <p className="text-sm font-medium text-foreground mt-0.5">
                    {nextAction.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {nextAction.description}
                  </p>
                </div>
                <div className="shrink-0">
                  <GradientButton
                    onClick={() => {
                      const href = nextAction.href;
                      if (href.startsWith("#")) {
                        // Hash-based actions: route to intelligence center
                        if (latestAnalysis) {
                          router.push(
                            `/repository/${latestAnalysis.id}/intelligence`
                          );
                        }
                      } else {
                        router.push(href);
                      }
                    }}
                    className="text-xs px-4 py-2 h-auto"
                  >
                    {nextAction.title.split(" ").slice(0, 2).join(" ")}{" "}
                    <ArrowRight className="h-3.5 w-3.5 ml-1" />
                  </GradientButton>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* 5. Activity + Attention */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4"
        >
          {/* Recent Activity */}
          <GlassCard className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
            {recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">
                No recent activity yet.
              </p>
            ) : (
              <div className="space-y-1">
                {recentActivity.map((activity) => (
                  <Link
                    key={activity.id}
                    href={getActivityHref(
                      activity.type,
                      activity.documentId,
                      activity.repositoryAnalysisId
                    )}
                    className="flex items-start gap-3 rounded-lg px-2 py-2 -mx-2 hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="mt-0.5 shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground truncate group-hover:text-brand-cyan transition-colors">
                        {activity.summary}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activity.repositoryName} · {formatRelativeTime(activity.createdAt)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Attention Items */}
          <GlassCard className="p-5 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Attention Required</h3>
            {attentionItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CheckCircle2 className="h-8 w-8 text-brand-teal mb-2" />
                <p className="text-sm text-foreground font-medium">All clear</p>
                <p className="text-xs text-muted-foreground mt-1">
                  No issues require your attention right now.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {attentionItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg border border-border/50 p-3 bg-background/30"
                  >
                    <div className="mt-0.5 shrink-0">
                      {item.severity === "High" ? (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      ) : item.severity === "Medium" ? (
                        <AlertTriangle className="h-4 w-4 text-brand-amber" />
                      ) : (
                        <HelpCircle className="h-4 w-4 text-brand-blue" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <StatusBadge variant={getSeverityVariant(item.severity)}>
                          {item.severity}
                        </StatusBadge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.description}
                      </p>
                      {item.action && (
                        <button
                          onClick={() => {
                            const href = item.action.href;
                            if (href.startsWith("#") && latestAnalysis) {
                              router.push(
                                `/repository/${latestAnalysis.id}/intelligence`
                              );
                            } else if (!href.startsWith("#")) {
                              router.push(href);
                            }
                          }}
                          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-cyan hover:underline"
                        >
                          {item.action.label} <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      </div>
    </PageContainer>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

function WelcomeSection({
  user,
  latestDocId,
}: {
  user: { name: string; email: string; avatarUrl?: string } | null;
  latestDocId?: string;
}) {
  const router = useRouter();
  const greeting = user?.name ? `Welcome back, ${user.name}` : "Welcome to GitDoc AI";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{greeting}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your documentation overview at a glance.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <GradientButton
          onClick={() => router.push("/analyze")}
          className="text-sm px-4 py-2 h-auto whitespace-nowrap"
        >
          <Sparkles className="h-4 w-4" /> Analyze Repository
        </GradientButton>
        <SecondaryButton
          onClick={() => {
            if (latestDocId) {
              router.push(`/studio/${latestDocId}`);
            } else {
              router.push("/studio");
            }
          }}
          className="text-sm px-4 py-2 h-auto whitespace-nowrap"
        >
          <FileText className="h-4 w-4" />
          <span>View Documentation</span>
        </SecondaryButton>
      </div>
    </div>
  );
}

function FreshnessRow({
  label,
  value,
  variant,
}: {
  label: string;
  value: number;
  variant: "success" | "warning" | "error";
}) {
  const colors = {
    success: "text-brand-teal",
    warning: "text-brand-amber",
    error: "text-destructive",
  };
  const bgColors = {
    success: "bg-brand-teal",
    warning: "bg-brand-amber",
    error: "bg-destructive",
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={cn("h-2 w-2 rounded-full", bgColors[variant])} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className={cn("text-sm font-semibold", colors[variant])}>{value}</span>
    </div>
  );
}
