import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Sparkles, Loader2, AlertTriangle } from 'lucide-react';

interface SectionRegenerationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  affectedSections: any[];
  onRegenerateSuccess: (newMarkdown: string, newQuality: any) => void;
}

export function SectionRegenerationModal({
  open,
  onOpenChange,
  documentId,
  affectedSections,
  onRegenerateSuccess,
}: SectionRegenerationModalProps) {
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (affectedSections && affectedSections.length > 0) {
      setSelectedSections(affectedSections.map(s => s.heading));
    }
  }, [affectedSections]);

  const toggleSection = (heading: string) => {
    setSelectedSections(prev =>
      prev.includes(heading) ? prev.filter(h => h !== heading) : [...prev, heading]
    );
  };

  const handleConfirmRegenerate = async () => {
    if (selectedSections.length === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/documentation/${documentId}/freshness/regenerate-sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: selectedSections }),
      });

      const data = await res.json();
      if (data.success) {
        onRegenerateSuccess(data.data.document.markdown, data.data.quality);
        onOpenChange(false);
      } else {
        setError(data.error?.message || 'Failed to regenerate sections.');
      }
    } catch {
      setError('An unexpected error occurred during section regeneration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border border-border bg-card p-6 shadow-2xl rounded-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          
          <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 text-brand-cyan flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <Dialog.Title className="text-lg font-semibold tracking-tight text-foreground">
                Regenerate affected sections?
              </Dialog.Title>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <Dialog.Description className="text-xs text-muted-foreground mb-4 leading-relaxed">
            GitDoc AI will generate updated content only for the selected documentation sections. Your current content will be safely preserved in version history.
          </Dialog.Description>

          {/* Section Selection List */}
          <div className="space-y-2 mb-6 max-h-56 overflow-y-auto pr-1">
            {affectedSections.map((sec, idx) => {
              const isChecked = selectedSections.includes(sec.heading);
              return (
                <label
                  key={idx}
                  onClick={() => toggleSection(sec.heading)}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-brand-cyan/40 bg-brand-cyan/5 text-foreground'
                      : 'border-border bg-background/30 text-muted-foreground hover:bg-secondary/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} // Controlled by label click
                    className="mt-0.5 rounded border-border text-brand-cyan focus:ring-brand-cyan"
                  />
                  <div>
                    <span className="text-sm font-medium block text-foreground">{sec.heading}</span>
                    <span className="text-xs text-muted-foreground block">{sec.reason}</span>
                  </div>
                </label>
              );
            })}
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-border">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 border border-border bg-transparent hover:bg-secondary text-foreground font-medium rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmRegenerate}
              disabled={isSubmitting || selectedSections.length === 0}
              className="px-4 py-2 bg-foreground text-background hover:bg-foreground/90 font-medium rounded-lg transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Regenerating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-brand-cyan" />
                  <span>Regenerate selected sections ({selectedSections.length})</span>
                </>
              )}
            </button>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
