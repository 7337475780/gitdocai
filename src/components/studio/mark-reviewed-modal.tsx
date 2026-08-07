import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Check, Loader2, AlertTriangle } from 'lucide-react';

interface MarkReviewedModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  fileName: string;
  onSuccess: () => void;
}

export function MarkReviewedModal({
  open,
  onOpenChange,
  documentId,
  fileName,
  onSuccess,
}: MarkReviewedModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/documentation/${documentId}/freshness/review`, {
        method: 'POST',
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onOpenChange(false);
      } else {
        setError(data.error?.message || 'Failed to mark document as reviewed.');
      }
    } catch {
      setError('An error occurred marking document as reviewed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] border border-border bg-card p-6 shadow-2xl rounded-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          
          <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Check className="w-4 h-4" />
              </div>
              <Dialog.Title className="text-lg font-semibold tracking-tight text-foreground">
                Mark {fileName} as reviewed?
              </Dialog.Title>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <Dialog.Description className="text-sm text-muted-foreground mb-6 leading-relaxed">
            This confirms that you reviewed the current documentation against the latest repository state. No documentation content will be changed.
          </Dialog.Description>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 border border-border bg-transparent hover:bg-secondary text-foreground font-medium rounded-lg transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-500 text-background hover:bg-emerald-400 font-medium rounded-lg transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Mark as reviewed</span>
                </>
              )}
            </button>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
