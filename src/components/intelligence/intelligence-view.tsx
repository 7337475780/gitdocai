"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  CircleAlert,
  HelpCircle,
  Sparkles,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  FileText,
  ShieldCheck,
  Globe,
  ArrowRight,
  Loader2,
  X,
  Layers,
  Clock,
  Eye,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import { GlassCard, StatusBadge } from "@/components/ui/card";
import { GradientButton, SecondaryButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DocumentationHealthStatus,
  DocumentationIntelligenceData,
  NextActionType,
  RecommendedDocumentInfo,
} from "@/lib/documentation-intelligence/intelligence-types";

interface IntelligenceViewProps {
  analysisId: string;
}

export function IntelligenceView({ analysisId }: IntelligenceViewProps) {
  const router = useRouter();
  const [data, setData] = React.useState<DocumentationIntelligenceData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isScanningFreshness, setIsScanningFreshness] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Generate All Recommended Modal state
  const [generateModalOpen, setGenerateModalOpen] = React.useState(false);
  const [selectedDocTypes, setSelectedDocTypes] = React.useState<string[]>([]);
  const [isGeneratingBatch, setIsGeneratingBatch] = React.useState(false);
  const [batchResult, setBatchResult] = React.useState<{
    generated: any[];
    failed: any[];
  } | null>(null);

  // Issues Modal state
  const [issuesModalOpen, setIssuesModalOpen] = React.useState(false);
  const [activityModalOpen, setActivityModalOpen] = React.useState(false);

  const fetchIntelligence = React.useCallback(
    async (forceRefresh = false) => {
      try {
        if (forceRefresh) setIsRefreshing(true);
        else setIsLoading(true);
        setError(null);

        const res = await fetch(
          `/api/repository-analysis/${analysisId}/intelligence${forceRefresh ? "?refresh=true" : ""}`
        );
        const json = await res.json();

        if (json.success) {
          setData(json.data);
        } else {
          setError(json.error?.message || "Failed to load documentation intelligence.");
        }
      } catch (err: any) {
        setError("Network error while loading documentation intelligence.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [analysisId]
  );

  React.useEffect(() => {
    fetchIntelligence();
  }, [fetchIntelligence]);

  // Pre-select missing docs when modal opens
  const handleOpenGenerateModal = () => {
    if (data?.coverage.missingDocuments) {
      setSelectedDocTypes(data.coverage.missingDocuments.map((d) => d.documentType));
    }
    setBatchResult(null);
    setGenerateModalOpen(true);
  };

  const handleToggleDocType = (docType: string) => {
    setSelectedDocTypes((prev) =>
      prev.includes(docType) ? prev.filter((t) => t !== docType) : [...prev, docType]
    );
  };

  const handleExecuteBatchGenerate = async () => {
    if (selectedDocTypes.length === 0) return;
    setIsGeneratingBatch(true);
    setBatchResult(null);

    try {
      const res = await fetch(
        `/api/repository-analysis/${analysisId}/intelligence/generate-recommended`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentTypes: selectedDocTypes }),
        }
      );
      const json = await res.json();
      if (json.success) {
        setBatchResult(json.data);
        fetchIntelligence(true);
      } else {
        setBatchResult({
          generated: [],
          failed: [{ type: "BATCH", fileName: "All", error: json.error?.message || "Generation failed" }],
        });
      }
    } catch (err: any) {
      setBatchResult({
        generated: [],
        failed: [{ type: "BATCH", fileName: "All", error: "Network error during generation." }],
      });
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  const handleRunFreshnessScan = async () => {
    if (!data?.documents || data.documents.length === 0) return;
    setIsScanningFreshness(true);
    try {
      const firstDocId = data.documents[0].id;
      const res = await fetch(`/api/documentation/${firstDocId}/freshness/scan`, {
        method: "POST",
      });
      await res.json();
      await fetchIntelligence(true);
    } catch (e) {
      // Ignore
    } finally {
      setIsScanningFreshness(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex h-96 w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-brand-cyan" />
          <p className="text-sm text-muted-foreground font-medium">
            Analyzing repository documentation state...
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12">
        <GlassCard className="p-8 border-destructive/20 bg-destructive/5 text-center">
          <CircleAlert className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">Intelligence Unavailable</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">{error}</p>
          <SecondaryButton onClick={() => fetchIntelligence(true)}>Try Again</SecondaryButton>
        </GlassCard>
      </div>
    );
  }

  const { repository, health, coverage, quality, freshness, publishing, nextAction, documents, attentionItems, recentActivity } = data;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12 space-y-8">
      {/* 1. REPOSITORY HEADER */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border"
      >
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground mb-1">
            <span className="text-brand-cyan font-semibold">{repository.owner}</span>
            <span>/</span>
            <span className="text-foreground font-semibold">{repository.name}</span>
            <span className="ml-2 px-2 py-0.5 rounded-full bg-secondary border border-border text-[11px]">
              {repository.branch}
            </span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-foreground">
            Documentation Intelligence
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Understand your documentation coverage, quality, freshness, and publishing status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <SecondaryButton
            onClick={() => fetchIntelligence(true)}
            disabled={isRefreshing}
            className="h-9 text-xs gap-1.5"
            aria-label="Refresh repository analysis overview"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
            Refresh Overview
          </SecondaryButton>

          <SecondaryButton
            onClick={handleRunFreshnessScan}
            disabled={isScanningFreshness || documents.length === 0}
            className="h-9 text-xs gap-1.5"
            aria-label="Run freshness scan"
          >
            <ShieldCheck className={cn("h-3.5 w-3.5 text-brand-teal", isScanningFreshness && "animate-spin")} />
            Run Freshness Scan
          </SecondaryButton>

          {documents.length > 0 && (
            <GradientButton
              onClick={() => router.push(`/studio/${documents[0].id}`)}
              className="h-9 text-xs gap-1.5"
            >
              <FileText className="h-3.5 w-3.5" />
              Open Studio
            </GradientButton>
          )}
        </div>
      </motion.div>

      {/* 2. HEALTH STATUS & BROWSER HEADER */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <HealthBadgeBanner health={health} />
      </motion.div>

      {/* 3. PRIMARY RECOMMENDED ACTION */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <PrimaryNextActionPanel
          nextAction={nextAction}
          onGenerateMissing={handleOpenGenerateModal}
          onRunScan={handleRunFreshnessScan}
          isScanning={isScanningFreshness}
        />
      </motion.div>

      {/* MAIN TWO-COLUMN / SINGLE-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT / MAIN COLUMN (2 cols on Desktop) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* 5. DOCUMENT STATUS LIST */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Documentation Files ({documents.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Generated documents ordered by attention priority and importance.
                </p>
              </div>
            </div>

            {documents.length === 0 ? (
              <GlassCard className="p-8 text-center border-dashed border-border">
                <FileText className="mx-auto h-8 w-8 text-muted-foreground mb-3 opacity-60" />
                <p className="text-sm text-muted-foreground font-medium mb-4">
                  No generated documentation files exist for this repository yet.
                </p>
                <GradientButton onClick={handleOpenGenerateModal} className="h-9 text-xs mx-auto">
                  Generate Documentation
                </GradientButton>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <DocumentStatusRow key={doc.id} doc={doc} />
                ))}
              </div>
            )}
          </section>

          {/* 6. ATTENTION ITEMS */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  Attention Items ({attentionItems.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Actionable documentation issues requiring review or improvement.
                </p>
              </div>

              {attentionItems.length > 5 && (
                <button
                  onClick={() => setIssuesModalOpen(true)}
                  className="text-xs font-semibold text-brand-cyan hover:underline"
                >
                  View all issues →
                </button>
              )}
            </div>

            {attentionItems.length === 0 ? (
              <GlassCard className="p-6 text-center border-brand-teal/20 bg-brand-teal/5">
                <CheckCircle2 className="mx-auto h-6 w-6 text-brand-teal mb-2" />
                <p className="text-sm font-semibold text-foreground">No critical issues detected</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your documentation is in good health and up to date.
                </p>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {attentionItems.slice(0, 5).map((item) => (
                  <AttentionItemCard
                    key={item.id}
                    item={item}
                    onAction={
                      item.action.href === "#generate-recommended"
                        ? handleOpenGenerateModal
                        : item.action.href === "#run-freshness-scan"
                        ? handleRunFreshnessScan
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </section>

        </div>

        {/* RIGHT / SECONDARY COLUMN (1 col on Desktop, collapsed below on Mobile) */}
        <div className="space-y-8">
          
          {/* 4. DOCUMENTATION COVERAGE */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">Documentation Coverage</h2>
              <StatusBadge
                variant={
                  coverage.status === "COMPLETE"
                    ? "success"
                    : coverage.status === "PARTIAL"
                    ? "info"
                    : "warning"
                }
              >
                {coverage.status}
              </StatusBadge>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-baseline justify-between">
                <span className="text-3xl font-extrabold text-foreground tracking-tight">
                  {coverage.percentage}%
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {coverage.generatedRecommendedCount} of {coverage.recommendedCount} recommended
                </span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-blue to-brand-cyan transition-all duration-500"
                  style={{ width: `${coverage.percentage}%` }}
                />
              </div>
            </div>

            {/* Recommended List */}
            <div className="space-y-2 mb-6">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recommended Documents
              </span>
              <div className="space-y-1.5 pt-1">
                {coverage.recommendedDocuments.map((rec) => {
                  const isGenerated = coverage.generatedDocuments.some(
                    (g) => g.type === rec.documentType
                  );
                  return (
                    <div
                      key={rec.documentType}
                      className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-background/50 border border-border/50"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium text-foreground">{rec.fileName}</span>
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded",
                          isGenerated
                            ? "bg-brand-teal/10 text-brand-teal border border-brand-teal/20"
                            : "bg-brand-amber/10 text-brand-amber border border-brand-amber/20"
                        )}
                      >
                        {isGenerated ? "Generated" : "Missing"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {coverage.missingDocuments.length > 0 && (
              <GradientButton
                onClick={handleOpenGenerateModal}
                className="w-full text-xs py-2.5 h-auto justify-center gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate All Recommended
              </GradientButton>
            )}
          </GlassCard>

          {/* 7. PUBLISHING STATUS */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-foreground">Publishing Status</h2>
              <StatusBadge
                variant={
                  publishing.status === "PUBLISHED"
                    ? "success"
                    : publishing.status === "NEEDS_REPUBLISHING"
                    ? "warning"
                    : publishing.status === "PUBLISH_FAILED"
                    ? "error"
                    : "default"
                }
              >
                {publishing.userFacingLabel}
              </StatusBadge>
            </div>

            <div className="space-y-3 text-xs text-muted-foreground">
              {publishing.lastPublishedAt ? (
                <div className="flex items-center justify-between">
                  <span>Last Published</span>
                  <span className="font-medium text-foreground">
                    {new Date(publishing.lastPublishedAt).toLocaleDateString()}
                  </span>
                </div>
              ) : (
                <p>Documentation site has not been published yet.</p>
              )}

              {publishing.siteUrl && (
                <a
                  href={publishing.siteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-brand-cyan hover:underline font-semibold mt-2"
                >
                  <Globe className="h-3.5 w-3.5" />
                  View Published Site
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </GlassCard>

          {/* 8. RECENT ACTIVITY */}
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Recent Activity</h2>
              {recentActivity.length >= 5 && (
                <button
                  onClick={() => setActivityModalOpen(true)}
                  className="text-xs text-brand-cyan font-semibold hover:underline"
                >
                  View all →
                </button>
              )}
            </div>

            {recentActivity.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recent activity recorded.</p>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 5).map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5 text-xs">
                    <div className="h-2 w-2 rounded-full bg-brand-cyan mt-1.5 shrink-0" />
                    <div className="overflow-hidden">
                      <p className="font-medium text-foreground line-clamp-1">{act.summary}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(act.createdAt).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

        </div>

      </div>

      {/* MODAL: GENERATE ALL RECOMMENDED */}
      <AnimatePresence>
        {generateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Generate Recommended Documentation
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Select missing recommended files to generate sequentially with AI.
                  </p>
                </div>
                <button
                  onClick={() => setGenerateModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {batchResult ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-background border border-border space-y-2">
                    <p className="text-xs font-semibold text-foreground">Batch Generation Results</p>
                    {batchResult.generated.length > 0 && (
                      <div className="text-xs text-brand-teal">
                        ✓ Successfully generated: {batchResult.generated.map((g) => g.fileName).join(", ")}
                      </div>
                    )}
                    {batchResult.failed.length > 0 && (
                      <div className="text-xs text-destructive">
                        ✗ Failed: {batchResult.failed.map((f) => `${f.fileName} (${f.error})`).join(", ")}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3">
                    {batchResult.failed.length > 0 && (
                      <SecondaryButton
                        onClick={() => {
                          setSelectedDocTypes(batchResult.failed.map((f) => f.type));
                          setBatchResult(null);
                        }}
                      >
                        Retry Failed
                      </SecondaryButton>
                    )}
                    <GradientButton onClick={() => setGenerateModalOpen(false)}>Done</GradientButton>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {coverage.recommendedDocuments.map((rec) => {
                      const isAlreadyGenerated = coverage.generatedDocuments.some(
                        (g) => g.type === rec.documentType
                      );
                      const isSelected = selectedDocTypes.includes(rec.documentType);

                      return (
                        <label
                          key={rec.documentType}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-colors",
                            isAlreadyGenerated
                              ? "bg-secondary/30 border-border/40 opacity-60 cursor-not-allowed"
                              : isSelected
                              ? "bg-brand-cyan/5 border-brand-cyan/40"
                              : "bg-background border-border hover:border-border/80"
                          )}
                        >
                          <input
                            type="checkbox"
                            disabled={isAlreadyGenerated}
                            checked={isSelected || isAlreadyGenerated}
                            onChange={() => handleToggleDocType(rec.documentType)}
                            className="mt-0.5 rounded border-border text-brand-cyan focus:ring-brand-cyan"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-foreground">{rec.fileName}</span>
                              {isAlreadyGenerated && (
                                <span className="text-[10px] text-brand-teal font-medium">Already exists</span>
                              )}
                            </div>
                            <p className="text-muted-foreground mt-0.5">{rec.reason}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Generation runs sequentially using AI orchestrators. Existing documents will not be overwritten.
                  </p>

                  <div className="flex justify-end gap-3 pt-2">
                    <SecondaryButton onClick={() => setGenerateModalOpen(false)}>Cancel</SecondaryButton>
                    <GradientButton
                      onClick={handleExecuteBatchGenerate}
                      disabled={isGeneratingBatch || selectedDocTypes.length === 0}
                      className="gap-2"
                    >
                      {isGeneratingBatch ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Generate Selected ({selectedDocTypes.length})
                        </>
                      )}
                    </GradientButton>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ----------------------------------------------------------------------
// HELPER COMPONENTS
// ----------------------------------------------------------------------

function HealthBadgeBanner({ health }: { health: any }) {
  const statusVariants: Record<string, "success" | "warning" | "error" | "info" | "default"> = {
    HEALTHY: "success",
    NEEDS_ATTENTION: "warning",
    NEEDS_REVIEW: "warning",
    GETTING_STARTED: "info",
    UNKNOWN: "default",
  };

  const statusIcons: Record<string, React.ReactNode> = {
    HEALTHY: <CheckCircle2 className="h-4 w-4 text-brand-teal" />,
    NEEDS_ATTENTION: <AlertTriangle className="h-4 w-4 text-brand-amber" />,
    NEEDS_REVIEW: <CircleAlert className="h-4 w-4 text-brand-amber" />,
    GETTING_STARTED: <Sparkles className="h-4 w-4 text-brand-cyan" />,
    UNKNOWN: <HelpCircle className="h-4 w-4 text-muted-foreground" />,
  };

  return (
    <GlassCard className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-brand-cyan/20">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-background border border-border">
          {statusIcons[health.status] || statusIcons.UNKNOWN}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Documentation Health
            </span>
            <StatusBadge variant={statusVariants[health.status] || "default"}>
              {health.label}
            </StatusBadge>
          </div>
          <p className="text-sm font-medium text-foreground mt-0.5">{health.summary}</p>
        </div>
      </div>
    </GlassCard>
  );
}

function PrimaryNextActionPanel({
  nextAction,
  onGenerateMissing,
  onRunScan,
  isScanning,
}: {
  nextAction: any;
  onGenerateMissing: () => void;
  onRunScan: () => void;
  isScanning: boolean;
}) {
  const router = useRouter();

  const handleActionClick = () => {
    if (nextAction.href === "#generate-recommended") {
      onGenerateMissing();
    } else if (nextAction.href === "#run-freshness-scan") {
      onRunScan();
    } else {
      router.push(nextAction.href);
    }
  };

  return (
    <GlassCard className="p-6 border-brand-cyan/30 bg-gradient-to-r from-brand-cyan/5 via-card to-card">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-cyan">
            <Sparkles className="h-3.5 w-3.5" />
            RECOMMENDED ACTION
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">{nextAction.title}</h2>
          <p className="text-sm text-muted-foreground">{nextAction.description}</p>
          {nextAction.reasons && nextAction.reasons.length > 0 && (
            <div className="pt-2 flex flex-wrap gap-2">
              {nextAction.reasons.map((reason: string, i: number) => (
                <span
                  key={i}
                  className="text-[11px] px-2.5 py-0.5 rounded-full bg-background border border-border text-muted-foreground"
                >
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="shrink-0">
          <GradientButton
            onClick={handleActionClick}
            disabled={isScanning}
            className="h-11 px-6 text-sm gap-2"
          >
            {isScanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                {nextAction.title}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </GradientButton>
        </div>
      </div>
    </GlassCard>
  );
}

function DocumentStatusRow({ doc }: { doc: any }) {
  return (
    <GlassCard className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-start sm:items-center gap-3">
        <div className="p-2 rounded-lg bg-background border border-border text-brand-cyan shrink-0">
          <FileText className="h-4 w-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-foreground">{doc.title}</span>
            <span className="text-xs text-muted-foreground font-mono">({doc.fileName})</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
            <span>Quality: <strong className="text-foreground">{doc.qualityScore ?? "N/A"}</strong></span>
            <span>•</span>
            <span
              className={cn(
                "font-medium",
                doc.freshnessStatus === "OUTDATED" || doc.freshnessStatus === "REVIEW_RECOMMENDED"
                  ? "text-brand-amber font-semibold"
                  : "text-muted-foreground"
              )}
            >
              Freshness: {doc.freshnessStatus}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-border">
        <span className="text-[11px] text-muted-foreground">
          {new Date(doc.lastUpdated).toLocaleDateString()}
        </span>
        <Link href={doc.primaryAction.href}>
          <SecondaryButton className="h-8 px-3 text-xs gap-1">
            {doc.primaryAction.label}
            <ChevronRight className="h-3 w-3" />
          </SecondaryButton>
        </Link>
      </div>
    </GlassCard>
  );
}

function AttentionItemCard({ item, onAction }: { item: any; onAction?: () => void }) {
  const severityVariants: Record<string, "error" | "warning" | "info"> = {
    High: "error",
    Medium: "warning",
    Low: "info",
  };

  return (
    <GlassCard className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-4 border-l-brand-amber">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <StatusBadge variant={severityVariants[item.severity] || "default"}>
            {item.severity}
          </StatusBadge>
          <span className="font-semibold text-sm text-foreground">{item.title}</span>
        </div>
        <p className="text-xs text-muted-foreground">{item.description}</p>
      </div>

      <div className="shrink-0">
        {onAction ? (
          <SecondaryButton onClick={onAction} className="h-8 px-3 text-xs gap-1">
            {item.action.label}
            <ChevronRight className="h-3 w-3" />
          </SecondaryButton>
        ) : (
          <Link href={item.action.href}>
            <SecondaryButton className="h-8 px-3 text-xs gap-1">
              {item.action.label}
              <ChevronRight className="h-3 w-3" />
            </SecondaryButton>
          </Link>
        )}
      </div>
    </GlassCard>
  );
}
