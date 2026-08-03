import React, { useState, useEffect, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Globe, AlertTriangle, Check, Loader2, Copy, ExternalLink, RefreshCw, History } from 'lucide-react';
import { DocumentationPublishStatus } from '@/lib/documentation-site/site-types';

interface PublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repositoryAnalysisId?: string;
  qualityScore?: number;
  freshnessStatus?: string;
}

export function PublishModal({
  open,
  onOpenChange,
  repositoryAnalysisId,
  qualityScore,
  freshnessStatus,
}: PublishModalProps) {
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<any | null>(null);
  const [publishHistory, setPublishHistory] = useState<any[]>([]);
  const [publishChanges, setPublishChanges] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!repositoryAnalysisId) return;
    try {
      const res = await fetch(`/api/repository-analysis/${repositoryAnalysisId}/site/publishes`);
      const data = await res.json();
      if (data.success) {
        setPublishHistory(data.data.history || []);
        setPublishChanges(data.data.changes || null);
      }
    } catch (e) {
      console.error('Failed to load publish history:', e);
    }
  }, [repositoryAnalysisId]);

  useEffect(() => {
    if (open && repositoryAnalysisId) {
      loadHistory();
    }
  }, [open, repositoryAnalysisId, loadHistory]);

  const handlePublish = async () => {
    if (!repositoryAnalysisId) return;

    setIsPublishing(true);
    setError(null);

    try {
      const res = await fetch(`/api/repository-analysis/${repositoryAnalysisId}/site/publish`, {
        method: 'POST',
      });

      const data = await res.json();
      if (data.success) {
        setPublishResult(data.data);
        await loadHistory();
      } else {
        setError(data.error?.message || 'Publishing failed.');
      }
    } catch (e) {
      setError('An error occurred during site deployment.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasLowQualityWarning = (qualityScore ?? 100) < 60;
  const hasFreshnessWarning = freshnessStatus === 'REVIEW_RECOMMENDED' || freshnessStatus === 'OUTDATED';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] border border-border bg-card p-6 shadow-2xl rounded-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          
          <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <Dialog.Title className="text-lg font-semibold tracking-tight text-foreground">
                {publishResult ? 'Documentation Published' : 'Publish documentation site?'}
              </Dialog.Title>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {!publishResult ? (
            <div>
              <Dialog.Description className="text-xs text-muted-foreground mb-4 leading-relaxed">
                GitDoc AI will publish your generated documentation as a static documentation site.
              </Dialog.Description>

              {/* Warnings Section (Non-blocking) */}
              {hasLowQualityWarning && (
                <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Low Quality Warning ({qualityScore}/100)</span>
                    <span className="opacity-90">Some documentation sections may be incomplete. You can publish anyway.</span>
                  </div>
                </div>
              )}

              {hasFreshnessWarning && (
                <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Repository Changes Detected</span>
                    <span className="opacity-90">Documentation may not reflect the latest code changes. You can publish anyway.</span>
                  </div>
                </div>
              )}

              {publishChanges?.isBehind && (
                <div className="mb-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs flex items-start gap-2">
                  <RefreshCw className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold block">Documentation changes ready to republish</span>
                    <span className="opacity-90">{publishChanges.changedDocuments.join(', ')}</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2 border-t border-border mt-4">
                <button
                  onClick={() => onOpenChange(false)}
                  className="px-4 py-2 border border-border bg-transparent hover:bg-secondary text-foreground font-medium rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="px-4 py-2 bg-emerald-500 text-background hover:bg-emerald-400 font-medium rounded-lg transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isPublishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deploying site...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" />
                      <span>{publishChanges?.isBehind ? 'Republish site' : 'Publish site'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* Success View */}
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 mb-4 flex items-start gap-3">
                <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-sm mb-0.5">Documentation site published</h4>
                  <p className="text-xs opacity-90">Your documentation site is live and ready to share.</p>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-border bg-background/50 mb-4">
                <span className="text-xs text-muted-foreground block mb-1">Deployment URL</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={publishResult.deploymentUrl}
                    className="w-full text-xs font-mono bg-background text-foreground border border-border rounded px-2.5 py-1.5 focus:outline-none"
                  />
                  <button
                    onClick={() => handleCopyUrl(publishResult.deploymentUrl)}
                    className="p-1.5 rounded border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors shrink-0"
                    title="Copy URL"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <a
                  href={publishResult.deploymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2 px-4 text-sm font-medium text-background bg-foreground hover:bg-foreground/90 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open published site
                </a>

                <button
                  onClick={handlePublish}
                  disabled={isPublishing}
                  className="w-full py-2 px-4 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Republish site
                </button>
              </div>
            </div>
          )}

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
