import React from 'react';
import { Download, Copy, RefreshCw, CheckCircle2, Loader2, CircleAlert } from 'lucide-react';
import { GradientButton } from '@/components/ui/button';
import { DocumentSection } from '@/lib/documentation/section-parser';
import { QualityResult } from '@/lib/documentation/quality-analyzer';
import { QualityPanel } from './quality-panel';

export type SaveStatus = 'saved' | 'editing' | 'saving' | 'error';

interface StudioToolbarProps {
  repositoryName: string;
  saveStatus: SaveStatus;
  quality: QualityResult | null;
  onRegenerate: () => void;
  onCopy: () => void;
  onDownload: () => void;
  isRegenerating: boolean;
}

export function StudioToolbar({
  repositoryName,
  saveStatus,
  quality,
  onRegenerate,
  onCopy,
  onDownload,
  isRegenerating
}: StudioToolbarProps) {
  return (
    <div className="flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      
      {/* Left */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">GitDoc AI</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-foreground">{repositoryName}</span>
        </div>

        <div className="hidden sm:flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-background/50 border border-border">
          {saveStatus === 'saved' && (
            <><CheckCircle2 className="h-3 w-3 text-brand-teal" /> <span className="text-muted-foreground">Saved</span></>
          )}
          {saveStatus === 'editing' && (
            <><span className="h-2 w-2 rounded-full bg-brand-cyan" /> <span className="text-muted-foreground">Editing</span></>
          )}
          {saveStatus === 'saving' && (
            <><Loader2 className="h-3 w-3 animate-spin text-brand-cyan" /> <span className="text-muted-foreground">Saving...</span></>
          )}
          {saveStatus === 'error' && (
            <><CircleAlert className="h-3 w-3 text-brand-amber" /> <span className="text-brand-amber">Not saved</span></>
          )}
        </div>
      </div>

      {/* Center (Quality) */}
      <div className="hidden md:flex items-center justify-center flex-1">
        {quality && <QualityPanel quality={quality} />}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        <button 
          onClick={onRegenerate} 
          disabled={isRegenerating}
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors disabled:opacity-50"
        >
          {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="hidden sm:inline">{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
        </button>

        <button 
          onClick={onCopy} 
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-white hover:bg-white/5 rounded-md transition-colors"
          title="Copy Markdown"
        >
          <Copy className="h-4 w-4" />
          <span className="sr-only">Copy</span>
        </button>

        <GradientButton onClick={onDownload} className="h-8 px-3 py-1 text-sm gap-2">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Download</span>
        </GradientButton>
      </div>

    </div>
  );
}
