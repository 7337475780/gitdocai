import React, { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { Download, FileText, Archive, Globe, ChevronDown, Loader2 } from 'lucide-react';

interface ExportMenuProps {
  documentId: string;
  documentType: string;
  repositoryAnalysisId?: string;
  onOpenSitePreview: () => void;
  onOpenPublishModal: () => void;
}

export function ExportMenu({
  documentId,
  documentType,
  repositoryAnalysisId,
  onOpenSitePreview,
  onOpenPublishModal,
}: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);

  const handleDownloadActiveDoc = () => {
    setOpen(false);
    window.location.href = `/api/documentation/${documentId}/export`;
  };

  const handleDownloadAllZip = async () => {
    if (!repositoryAnalysisId) return;
    setOpen(false);
    setIsExportingZip(true);

    try {
      const res = await fetch(`/api/repository-analysis/${repositoryAnalysisId}/export`, {
        method: 'POST',
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `documentation-export.zip`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('ZIP export error:', e);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-md transition-colors"
          title="Export documentation"
        >
          {isExportingZip ? <Loader2 className="h-4 w-4 animate-spin text-brand-cyan" /> : <Download className="h-4 w-4" />}
          <span>Export</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          sideOffset={8}
          align="end"
          className="z-50 w-64 rounded-xl border border-border bg-card p-2 text-card-foreground shadow-xl animate-in fade-in-0 zoom-in-95"
        >
          <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b border-border mb-1">
            Export & Share Options
          </div>

          <div className="space-y-1">
            <button
              onClick={handleDownloadActiveDoc}
              className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-secondary transition-colors"
            >
              <FileText className="h-4 w-4 text-brand-cyan" />
              <div>
                <span className="block font-medium">Download {documentType}.md</span>
                <span className="text-[10px] text-muted-foreground">Markdown file attachment</span>
              </div>
            </button>

            {repositoryAnalysisId && (
              <button
                onClick={handleDownloadAllZip}
                disabled={isExportingZip}
                className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
              >
                <Archive className="h-4 w-4 text-brand-purple" />
                <div>
                  <span className="block font-medium">Download all documentation</span>
                  <span className="text-[10px] text-muted-foreground">Sanitized ZIP archive</span>
                </div>
              </button>
            )}

            <button
              onClick={() => {
                setOpen(false);
                onOpenSitePreview();
              }}
              className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-medium rounded-lg text-foreground hover:bg-secondary transition-colors"
            >
              <Globe className="h-4 w-4 text-emerald-400" />
              <div>
                <span className="block font-medium">Preview documentation site</span>
                <span className="text-[10px] text-muted-foreground">Private reader preview</span>
              </div>
            </button>

            <button
              onClick={() => {
                setOpen(false);
                onOpenPublishModal();
              }}
              className="flex items-center gap-2.5 w-full text-left px-3 py-2 text-xs font-medium rounded-lg text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors mt-1"
            >
              <Globe className="h-4 w-4 text-emerald-400" />
              <div>
                <span className="block font-medium">Publish documentation site</span>
                <span className="text-[10px] text-emerald-400/80">Shareable deployment URL</span>
              </div>
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
