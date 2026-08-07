import React, { useState, useEffect, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { 
  X, 
  History, 
  Loader2, 
  ArrowLeft, 
  RotateCcw, 
  Diff, 
  AlertTriangle,
  Award,
  ChevronRight
} from 'lucide-react';
import { VersionSummary, VersionDetail } from '@/lib/documentation-versions/version-types';

interface HistoryPanelProps {
  documentId: string;
  currentContentHash?: string;
  currentUpdatedAt: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCompareWithCurrent: (version: VersionSummary) => void;
  onRestoreSuccess: (markdown: string, quality: any) => void;
}

export function HistoryPanel({
  documentId,
  currentContentHash,
  currentUpdatedAt,
  open,
  onOpenChange,
  onCompareWithCurrent,
  onRestoreSuccess
}: HistoryPanelProps) {
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  
  // Selected version details for preview
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<VersionDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  
  // Restore flow
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [restoring, setRestoring] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch version history list
  const fetchHistory = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/documentation/${documentId}/versions?page=${pageNum}&perPage=10`);
      const data = await res.json();
      if (data.success) {
        setVersions(prev => append ? [...prev, ...data.data.versions] : data.data.versions);
        setHasNextPage(data.data.hasNextPage);
        setPage(pageNum);
      } else {
        setErrorMsg(data.error?.message || 'Failed to load version history.');
      }
    } catch {
      setErrorMsg('Failed to load version history.');
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  // Fetch full details for preview
  const fetchVersionDetail = async (versionId: string) => {
    setLoadingDetail(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/documentation/${documentId}/versions/${versionId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedVersion(data.data);
      } else {
        setErrorMsg(data.error?.message || 'Failed to load version details.');
      }
    } catch {
      setErrorMsg('Failed to load version details.');
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchHistory(1, false);
      setSelectedVersionId(null);
      setSelectedVersion(null);
      setErrorMsg(null);
    }
  }, [open, documentId, fetchHistory]);

  const handleSelectVersion = (versionId: string) => {
    setSelectedVersionId(versionId);
    fetchVersionDetail(versionId);
  };

  const handleBackToList = () => {
    setSelectedVersionId(null);
    setSelectedVersion(null);
    setErrorMsg(null);
  };

  const handleRestore = async () => {
    if (!selectedVersion) return;
    setRestoring(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/documentation/${documentId}/versions/${selectedVersion.versionId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedContentHash: currentContentHash,
          expectedUpdatedAt: currentUpdatedAt
        })
      });
      const data = await res.json();
      if (data.success) {
        onRestoreSuccess(data.data.document.markdown, data.data.document.qualityData);
        setShowRestoreConfirm(false);
        onOpenChange(false); // Close panel
      } else {
        setErrorMsg(data.error?.message || 'Failed to restore version.');
      }
    } catch {
      setErrorMsg('Failed to execute restore.');
    } finally {
      setRestoring(false);
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'Yesterday';
      return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          {/* Overlay */}
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity" />
          
          {/* Main content drawer */}
          <Dialog.Content 
            className="fixed top-0 right-0 z-50 h-full w-full max-w-md border-l border-border bg-card/98 backdrop-blur-md p-6 shadow-2xl flex flex-col focus:outline-none animate-in slide-in-from-right duration-300"
            aria-describedby="history-panel-desc"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-brand-cyan" />
                <Dialog.Title className="text-lg font-semibold text-foreground tracking-tight">
                  Version History
                </Dialog.Title>
              </div>
              <Dialog.Close className="rounded-full p-1.5 opacity-70 hover:opacity-100 hover:bg-secondary transition-all outline-none">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            </div>

            <div id="history-panel-desc" className="sr-only">
              Browse previous generated or edited versions of this README. Compare differences or revert to older backups.
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            {/* Main Content Body */}
            {selectedVersionId ? (
              /* Version Preview Mode */
              <div className="flex-1 flex flex-col min-h-0">
                <button
                  onClick={handleBackToList}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 self-start"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back to history list
                </button>

                {loadingDetail || !selectedVersion ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-brand-cyan animate-spin" />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* Version meta detail card */}
                    <div className="p-4 bg-secondary/40 border border-border/60 rounded-xl mb-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-foreground">Version {selectedVersion.versionNumber}</span>
                            {selectedVersion.qualityScore !== null && (
                              <span className="text-[10px] bg-brand-teal/15 border border-brand-teal/20 text-brand-teal px-1.5 py-0.5 rounded flex items-center gap-0.5 font-medium">
                                <Award className="w-3 h-3" />
                                {selectedVersion.qualityScore}% Quality
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{selectedVersion.sourceLabel}</p>
                        </div>
                        <span className="text-[10px] text-muted-foreground/80">
                          {formatRelativeTime(selectedVersion.createdAt)}
                        </span>
                      </div>

                      {/* Read only Preview details */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => onCompareWithCurrent(selectedVersion as any)}
                          className="flex-1 py-1.5 bg-brand-cyan/15 hover:bg-brand-cyan/25 border border-brand-cyan/30 text-brand-cyan text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Diff className="w-3.5 h-3.5" />
                          Compare with Current
                        </button>
                        <button
                          onClick={() => setShowRestoreConfirm(true)}
                          className="flex-1 py-1.5 bg-foreground text-background hover:bg-foreground/90 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore this Version
                        </button>
                      </div>
                    </div>

                    {/* Markdown contents container */}
                    <div className="flex-1 min-h-0 border border-border/40 rounded-xl bg-background/50 overflow-hidden flex flex-col">
                      <div className="px-4 py-2 border-b border-border/40 bg-card/60 flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        <span>Markdown Preview (Read-Only)</span>
                        <span>{selectedVersion.markdown.length} chars</span>
                      </div>
                      <pre className="flex-1 p-4 text-xs font-mono text-muted-foreground overflow-y-auto whitespace-pre-wrap select-text custom-scrollbar selection:bg-brand-cyan/30">
                        {selectedVersion.markdown}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Version List Mode */
              <div className="flex-1 flex flex-col min-h-0">
                {loading && page === 1 ? (
                  <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-brand-cyan animate-spin" />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                    {versions.map(v => (
                      <div 
                        key={v.versionId}
                        onClick={() => handleSelectVersion(v.versionId)}
                        className={`p-3.5 rounded-xl border border-border/60 hover:border-brand-cyan/40 hover:bg-secondary/40 transition-all flex items-center justify-between cursor-pointer group ${v.isCurrent ? 'bg-brand-cyan/5 border-brand-cyan/20' : 'bg-card/40'}`}
                      >
                        <div className="space-y-1 pr-4 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-foreground group-hover:text-brand-cyan transition-colors">
                              Version {v.versionNumber}
                            </span>
                            {v.isCurrent && (
                              <span className="text-[9px] bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan px-1.5 py-0.2 rounded font-semibold uppercase tracking-wide">
                                Current
                              </span>
                            )}
                            {v.qualityScore !== null && (
                              <span className="text-[9px] text-brand-teal/80 bg-brand-teal/15 px-1 py-0.2 rounded flex items-center gap-0.5 font-medium">
                                <Award className="w-2.5 h-2.5" />
                                {v.qualityScore}%
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{v.sourceLabel}</p>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-muted-foreground/75">
                            {formatRelativeTime(v.createdAt)}
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-foreground transition-colors" />
                        </div>
                      </div>
                    ))}

                    {versions.length === 0 && (
                      <div className="text-center py-12 border border-dashed border-border/60 rounded-xl bg-secondary/40">
                        <History className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                        <h5 className="font-semibold text-foreground text-xs mb-1">No history yet</h5>
                        <p className="text-[11px] text-muted-foreground px-4">
                          History snapshots are generated automatically on saves and generation changes.
                        </p>
                      </div>
                    )}

                    {hasNextPage && (
                      <button
                        onClick={() => fetchHistory(page + 1, true)}
                        disabled={loading}
                        className="w-full py-2 border border-border hover:bg-secondary text-xs text-foreground font-medium rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                        Load More Versions
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Restore Confirmation Modal */}
      <Dialog.Root open={showRestoreConfirm} onOpenChange={setShowRestoreConfirm}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] border border-border bg-card p-6 shadow-2xl rounded-2xl">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-cyan/15 text-brand-cyan flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <Dialog.Title className="text-base font-semibold text-foreground mb-2">
                  Restore Version {selectedVersion?.versionNumber}?
                </Dialog.Title>
                <Dialog.Description className="text-xs text-muted-foreground leading-relaxed mb-6">
                  The current documentation state will be preserved in version history, and a new version snapshot will be created from Version {selectedVersion?.versionNumber}.
                </Dialog.Description>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                disabled={restoring}
                onClick={() => setShowRestoreConfirm(false)}
                className="px-4 py-2 border border-border hover:bg-secondary text-foreground font-medium rounded-lg text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={restoring}
                onClick={handleRestore}
                className="px-4 py-2 bg-foreground text-background hover:bg-foreground/90 font-medium rounded-lg text-xs transition-colors flex items-center gap-1.5"
              >
                {restoring && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Restore Version
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
