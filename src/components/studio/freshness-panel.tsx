import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, RefreshCw, CheckCircle2, AlertTriangle, AlertCircle, HelpCircle, ChevronDown, ChevronRight, Sparkles, Check, FileText } from 'lucide-react';
import { DocumentationFreshnessStatus } from '@/lib/documentation-freshness/freshness-types';

interface FreshnessPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  freshnessDetail: any;
  onRunScan: () => void;
  isScanning: boolean;
  onReviewAffectedSections: () => void;
  onOpenSectionRegenModal: () => void;
  onOpenFullRegenModal: () => void;
  onOpenMarkReviewedModal: () => void;
}

export function FreshnessPanel({
  open,
  onOpenChange,
  documentId: _documentId,
  freshnessDetail,
  onRunScan,
  isScanning,
  onReviewAffectedSections,
  onOpenSectionRegenModal,
  onOpenFullRegenModal,
  onOpenMarkReviewedModal,
}: FreshnessPanelProps) {
  const [showAllChanges, setShowAllChanges] = useState(false);

  if (!freshnessDetail) return null;

  const status: DocumentationFreshnessStatus = freshnessDetail.status || DocumentationFreshnessStatus.UNKNOWN;
  const impactScore = freshnessDetail.impactScore ?? 0;
  const confidence = freshnessDetail.confidence ?? 0;
  const summary = freshnessDetail.summary || '';
  const reasons = freshnessDetail.reasons || [];
  const affectedSections = freshnessDetail.affectedSections || [];
  const lastScannedAt = freshnessDetail.latest?.createdAt ? new Date(freshnessDetail.latest.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently';

  const getStatusDisplay = () => {
    switch (status) {
      case DocumentationFreshnessStatus.UP_TO_DATE:
        return {
          label: 'Up to date',
          color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
          supportingText: 'No relevant repository changes were detected since this document was last reviewed.',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
        };
      case DocumentationFreshnessStatus.CHANGES_DETECTED:
        return {
          label: 'Changes detected',
          color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
          supportingText: 'Repository changes were found. Impact analysis is available.',
          icon: <CheckCircle2 className="w-5 h-5 text-cyan-400" />,
        };
      case DocumentationFreshnessStatus.REVIEW_RECOMMENDED:
        return {
          label: 'Review recommended',
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          supportingText: 'Repository changes may affect this documentation.',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
        };
      case DocumentationFreshnessStatus.OUTDATED:
        return {
          label: 'Potentially outdated',
          color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
          supportingText: 'Repository changes directly conflict with documented repository information.',
          icon: <AlertCircle className="w-5 h-5 text-rose-400" />,
        };
      case DocumentationFreshnessStatus.UNKNOWN:
      default:
        return {
          label: 'Freshness unknown',
          color: 'text-muted-foreground bg-secondary border-border',
          supportingText: 'GitDoc AI could not compare this document with the latest repository state.',
          icon: <HelpCircle className="w-5 h-5 text-muted-foreground" />,
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg border-l border-border bg-card p-6 shadow-2xl overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-200 flex flex-col justify-between">
          
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <div>
                <Dialog.Title className="text-lg font-semibold tracking-tight text-foreground">
                  Documentation Freshness
                </Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground">
                  Last evaluated: {lastScannedAt}
                </Dialog.Description>
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                aria-label="Close panel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status Card */}
            <div className={`p-4 rounded-xl border mb-6 ${statusDisplay.color}`}>
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">{statusDisplay.icon}</div>
                <div>
                  <h3 className="font-semibold text-sm mb-1">{statusDisplay.label}</h3>
                  <p className="text-xs opacity-90 leading-relaxed">{statusDisplay.supportingText}</p>
                </div>
              </div>
            </div>

            {/* Score & Confidence Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3.5 rounded-xl border border-border bg-background/50">
                <span className="text-xs text-muted-foreground block mb-1">Impact Score</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-foreground">{impactScore}</span>
                  <span className="text-xs text-muted-foreground">/ 100</span>
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-border bg-background/50">
                <span className="text-xs text-muted-foreground block mb-1">Confidence</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-foreground">{confidence}%</span>
                </div>
              </div>
            </div>

            {/* Detailed Explanation */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Why this needs review
              </h4>
              <p className="text-sm text-foreground bg-secondary/50 p-3 rounded-lg border border-border/50 leading-relaxed">
                {summary}
              </p>
            </div>

            {/* Affected Documentation Sections */}
            {affectedSections.length > 0 && (
              <div className="mb-6">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Affected Sections ({affectedSections.length})
                </h4>
                <div className="space-y-2">
                  {affectedSections.map((sec: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg border border-border bg-background/40 flex items-start gap-2.5">
                      <FileText className="w-4 h-4 text-brand-cyan shrink-0 mt-0.5" />
                      <div>
                        <span className="text-sm font-medium text-foreground block">{sec.heading}</span>
                        <span className="text-xs text-muted-foreground block mt-0.5">{sec.reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detected Repository Changes */}
            {reasons.length > 0 && (
              <div className="mb-6">
                <button
                  onClick={() => setShowAllChanges(!showAllChanges)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase tracking-wider py-1 hover:text-foreground transition-colors"
                >
                  <span>Detected Repository Changes ({reasons.length})</span>
                  {showAllChanges ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {showAllChanges && (
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto pr-1">
                    {reasons.map((change: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded border border-border bg-background/30 text-xs">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-mono text-muted-foreground truncate">{change.path}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            change.importance === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400' :
                            change.importance === 'HIGH' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            {change.importance}
                          </span>
                        </div>
                        <p className="text-foreground">{change.summary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-border space-y-2 mt-6">
            {affectedSections.length > 0 && (
              <button
                onClick={() => {
                  onReviewAffectedSections();
                  onOpenChange(false);
                }}
                className="w-full py-2.5 px-4 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 border border-border rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4 text-brand-cyan" />
                Review affected sections in editor
              </button>
            )}

            {affectedSections.length > 0 && (
              <button
                onClick={() => {
                  onOpenChange(false);
                  onOpenSectionRegenModal();
                }}
                className="w-full py-2.5 px-4 text-sm font-medium text-background bg-foreground hover:bg-foreground/90 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-brand-cyan" />
                Regenerate affected sections
              </button>
            )}

            <button
              onClick={() => {
                onOpenChange(false);
                onOpenFullRegenModal();
              }}
              className="w-full py-2 px-3 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate full document
            </button>

            <button
              onClick={() => {
                onOpenChange(false);
                onOpenMarkReviewedModal();
              }}
              className="w-full py-2 px-3 text-xs font-medium text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-3.5 h-3.5" />
              Mark document as reviewed
            </button>

            <button
              onClick={onRunScan}
              disabled={isScanning}
              className="w-full py-2 px-3 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning repository...' : 'Run scan again'}
            </button>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
