import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { 
  X, 
  Loader2, 
  Plus, 
  Minus, 
  FileText,
  Award,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { VersionComparisonResult, SectionDiff } from '@/lib/documentation-versions/version-types';

interface VersionCompareModalProps {
  documentId: string;
  baseVersionId: string;
  baseVersionNumber: number;
  compareVersionId: string;
  compareVersionNumber: number;
  baseQualityScore?: number | null;
  compareQualityScore?: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestore: () => void;
}

export function VersionCompareModal({
  documentId,
  baseVersionId,
  baseVersionNumber,
  compareVersionId,
  compareVersionNumber,
  baseQualityScore,
  compareQualityScore,
  open,
  onOpenChange,
  onRestore
}: VersionCompareModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VersionComparisonResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchComparison = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(
        `/api/documentation/${documentId}/versions/compare?baseVersionId=${baseVersionId}&compareVersionId=${compareVersionId}`
      );
      const data = await res.json();
      if (data.success) {
        setResult(data.data);
      } else {
        setErrorMsg(data.error?.message || 'Failed to compare versions.');
      }
    } catch (e) {
      setErrorMsg('Failed to fetch comparison details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchComparison();
    } else {
      setResult(null);
    }
  }, [open, baseVersionId, compareVersionId]);

  // Compute quality delta text
  let qualityDeltaText = '';
  let qualityDeltaColor = 'text-muted-foreground';
  if (baseQualityScore !== undefined && baseQualityScore !== null && 
      compareQualityScore !== undefined && compareQualityScore !== null) {
    const delta = compareQualityScore - baseQualityScore;
    if (delta > 0) {
      qualityDeltaText = `(Change: +${delta})`;
      qualityDeltaColor = 'text-brand-teal';
    } else if (delta < 0) {
      qualityDeltaText = `(Change: ${delta})`;
      qualityDeltaColor = 'text-red-400';
    } else {
      qualityDeltaText = `(No change)`;
    }
  }

  // Filter out unchanged sections to show only differences
  const changedSections = result?.changes.filter(c => c.type !== 'unchanged') || [];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm transition-opacity" />
        <Dialog.Content 
          className="fixed left-[50%] top-[50%] z-50 w-full max-w-4xl h-[90vh] translate-x-[-50%] translate-y-[-50%] border border-border bg-card p-6 shadow-2xl rounded-2xl flex flex-col focus:outline-none animate-in zoom-in-95 duration-200"
          aria-describedby="compare-modal-desc"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-4">
            <div>
              <Dialog.Title className="text-lg font-semibold text-foreground tracking-tight flex items-center gap-2">
                <span>Compare Version {baseVersionNumber}</span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                <span>Version {compareVersionNumber} (Current)</span>
              </Dialog.Title>
              <div id="compare-modal-desc" className="text-xs text-muted-foreground mt-0.5">
                Reviewing line modifications and section shifts.
              </div>
            </div>
            <Dialog.Close className="rounded-full p-1.5 opacity-70 hover:opacity-100 hover:bg-secondary transition-all outline-none">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Dialog.Close>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-brand-cyan animate-spin" />
            </div>
          ) : errorMsg ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <AlertTriangle className="w-10 h-10 text-red-400" />
              <p className="text-sm text-red-400 font-medium">{errorMsg}</p>
            </div>
          ) : result ? (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Summary Dashboard Card */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-secondary/40 border border-border/60 rounded-xl mb-6 shrink-0">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Lines Added</span>
                  <div className="text-xl font-bold text-brand-teal flex items-center gap-1">
                    <Plus className="w-4 h-4" /> {result.summary.addedLines}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Lines Removed</span>
                  <div className="text-xl font-bold text-red-400 flex items-center gap-1">
                    <Minus className="w-4 h-4" /> {result.summary.removedLines}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Changed Sections</span>
                  <div className="text-xl font-bold text-brand-amber flex items-center gap-1">
                    <FileText className="w-4 h-4" /> {result.summary.changedSections}
                  </div>
                </div>

                {baseQualityScore !== undefined && baseQualityScore !== null && 
                 compareQualityScore !== undefined && compareQualityScore !== null && (
                  <div className="space-y-0.5 col-span-2 sm:col-span-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Quality Comparison</span>
                    <div className="text-xs font-semibold text-foreground flex items-center gap-1.5 flex-wrap">
                      <Award className="w-3.5 h-3.5 text-brand-teal" />
                      <span>{baseQualityScore}% vs {compareQualityScore}%</span>
                      <span className={qualityDeltaColor}>{qualityDeltaText}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sections Diff scroll container */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[180px] custom-scrollbar mb-4">
                {changedSections.map((sec, idx) => (
                  <SectionDiffCard key={idx} sec={sec} />
                ))}

                {changedSections.length === 0 && (
                  <div className="text-center py-12 border border-dashed border-border/50 rounded-xl bg-secondary/40">
                    <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                    <h5 className="font-semibold text-foreground text-xs mb-1">No structural diffs</h5>
                    <p className="text-[11px] text-muted-foreground px-4">
                      The Markdown and sections are identical between these two versions.
                    </p>
                  </div>
                )}
              </div>

              {/* Footer action trigger */}
              <div className="flex justify-end gap-3 pt-3 border-t border-border/50 shrink-0">
                <button
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2 border border-border bg-transparent hover:bg-secondary text-foreground font-medium rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Close Compare
                </button>
                <button
                  onClick={onRestore}
                  className="px-4 py-2 bg-foreground text-background hover:bg-foreground/90 font-medium rounded-lg text-xs transition-colors cursor-pointer"
                >
                  Restore Version {baseVersionNumber}
                </button>
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SectionDiffCard({ sec }: { sec: SectionDiff }) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Set header color depending on action type
  let badgeColor = 'bg-brand-amber/10 text-brand-amber border-brand-amber/20';
  let badgeText = 'Changed';
  if (sec.type === 'added') {
    badgeColor = 'bg-brand-teal/10 text-brand-teal border-brand-teal/20';
    badgeText = 'Added';
  } else if (sec.type === 'removed') {
    badgeColor = 'bg-red-500/10 text-red-400 border-red-500/20';
    badgeText = 'Removed';
  }

  const isLarge = sec.before.length > 300 || sec.after.length > 300;

  return (
    <div className="p-4 rounded-xl border border-border/70 bg-card/60 space-y-3 flex flex-col">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 border rounded ${badgeColor}`}>
            {badgeText}
          </span>
          <h4 className="text-xs font-bold text-foreground">{sec.section}</h4>
        </div>
        
        {isLarge && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
          >
            {isCollapsed ? (
              <><ChevronDown className="w-3 h-3" /> Show diff</>
            ) : (
              <><ChevronUp className="w-3 h-3" /> Hide diff</>
            )}
          </button>
        )}
      </div>

      {(!isLarge || !isCollapsed) && (
        <div className="space-y-3 pt-1">
          {sec.type === 'added' && (
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold tracking-wider text-brand-teal">[Added Content]</span>
              <pre className="p-3 bg-brand-teal/5 border border-brand-teal/15 rounded-lg text-xs font-mono text-foreground whitespace-pre-wrap select-text">
                {sec.after}
              </pre>
            </div>
          )}

          {sec.type === 'removed' && (
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold tracking-wider text-red-400">[Removed Content]</span>
              <pre className="p-3 bg-red-500/5 border border-red-500/15 rounded-lg text-xs font-mono text-muted-foreground line-through whitespace-pre-wrap select-text">
                {sec.before}
              </pre>
            </div>
          )}

          {sec.type === 'modified' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground/80">[Previous Version Content]</span>
                <pre className="p-3 bg-background/50 border border-border/40 rounded-lg text-xs font-mono text-muted-foreground whitespace-pre-wrap select-text max-h-[250px] overflow-y-auto custom-scrollbar">
                  {sec.before}
                </pre>
              </div>
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold tracking-wider text-brand-cyan">[Current Version Content]</span>
                <pre className="p-3 bg-brand-cyan/5 border border-brand-cyan/15 rounded-lg text-xs font-mono text-foreground whitespace-pre-wrap select-text max-h-[250px] overflow-y-auto custom-scrollbar">
                  {sec.after}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
