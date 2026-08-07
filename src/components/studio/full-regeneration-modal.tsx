import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, RefreshCw, Loader2, AlertTriangle, Eye, Check } from 'lucide-react';

interface FullRegenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  currentMarkdown: string;
  onRegenerateSuccess: (newMarkdown: string, newQuality: any) => void;
}

export function FullRegenerationModal({
  open,
  onOpenChange,
  documentId,
  currentMarkdown,
  onRegenerateSuccess,
}: FullRegenerationModalProps) {
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [proposedMarkdown, setProposedMarkdown] = useState<string | null>(null);
  const [proposedSections, setProposedSections] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetchPreview = async () => {
    setIsPreviewLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/documentation/${documentId}/freshness/regenerate-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview' }),
      });

      const data = await res.json();
      if (data.success) {
        setProposedMarkdown(data.data.proposedMarkdown);
        setProposedSections(data.data.proposedSections);
      } else {
        setError(data.error?.message || 'Failed to generate document preview.');
      }
    } catch {
      setError('An unexpected error occurred generating preview.');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleApplyFullRegeneration = async () => {
    if (!proposedMarkdown) return;

    setIsApplying(true);
    setError(null);

    try {
      const res = await fetch(`/api/documentation/${documentId}/freshness/regenerate-document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'apply',
          markdown: proposedMarkdown,
          sections: proposedSections,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onRegenerateSuccess(data.data.document.markdown, data.data.quality);
        onOpenChange(false);
        setProposedMarkdown(null);
      } else {
        setError(data.error?.message || 'Failed to apply new document version.');
      }
    } catch {
      setError('An error occurred while applying new version.');
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className={`fixed left-[50%] top-[50%] z-50 w-full translate-x-[-50%] translate-y-[-50%] border border-border bg-card p-6 shadow-2xl rounded-2xl transition-all ${
          proposedMarkdown ? 'max-w-5xl h-[85vh]' : 'max-w-md'
        } flex flex-col justify-between`}>
          
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <Dialog.Title className="text-lg font-semibold tracking-tight text-foreground">
                  Regenerate complete document?
                </Dialog.Title>
              </div>
              <button
                onClick={() => {
                  onOpenChange(false);
                  setProposedMarkdown(null);
                }}
                className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {!proposedMarkdown ? (
              <Dialog.Description className="text-sm text-muted-foreground mb-6 leading-relaxed">
                GitDoc AI will generate a new version using the latest repository state. Your current document will remain available in version history.
              </Dialog.Description>
            ) : (
              <div className="grid grid-cols-2 gap-4 flex-1 my-4 h-[55vh] overflow-hidden">
                <div className="flex flex-col border border-border rounded-xl bg-background/50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-border bg-secondary/30 text-xs font-semibold text-muted-foreground">
                    Current Document
                  </div>
                  <pre className="p-4 text-xs font-mono text-foreground/80 overflow-y-auto whitespace-pre-wrap flex-1">
                    {currentMarkdown}
                  </pre>
                </div>
                <div className="flex flex-col border border-brand-cyan/30 rounded-xl bg-background/50 overflow-hidden">
                  <div className="px-3 py-2 border-b border-border bg-brand-cyan/10 text-xs font-semibold text-brand-cyan">
                    Proposed Regeneration
                  </div>
                  <pre className="p-4 text-xs font-mono text-foreground overflow-y-auto whitespace-pre-wrap flex-1">
                    {proposedMarkdown}
                  </pre>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border mt-auto">
            <button
              onClick={() => {
                onOpenChange(false);
                setProposedMarkdown(null);
              }}
              className="px-4 py-2 border border-border bg-transparent hover:bg-secondary text-foreground font-medium rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>

            {!proposedMarkdown ? (
              <button
                onClick={handleFetchPreview}
                disabled={isPreviewLoading}
                className="px-4 py-2 bg-foreground text-background hover:bg-foreground/90 font-medium rounded-lg transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isPreviewLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Preview...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 text-brand-cyan" />
                    <span>Preview Regenerated Document</span>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleApplyFullRegeneration}
                disabled={isApplying}
                className="px-4 py-2 bg-brand-cyan text-background hover:bg-brand-cyan/90 font-medium rounded-lg transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {isApplying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Applying New Version...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Apply New Version</span>
                  </>
                )}
              </button>
            )}
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
