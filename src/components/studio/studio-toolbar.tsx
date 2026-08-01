import React, { useState, useEffect } from 'react';
import { Download, Copy, RefreshCw, CheckCircle2, Loader2, CircleAlert, GitCommitHorizontal, ExternalLink } from 'lucide-react';
import { GradientButton } from '@/components/ui/button';
import { DocumentSection } from '@/lib/documentation/section-parser';
import { QualityResult } from '@/lib/documentation/quality-analyzer';
import { QualityPanel } from './quality-panel';
import { GitHubCommitModal } from './github-commit-modal';
import * as Popover from '@radix-ui/react-popover';
import { GithubIcon } from '@/components/ui/icons';

export type SaveStatus = 'saved' | 'editing' | 'saving' | 'error';

interface StudioToolbarProps {
  documentId: string;
  repositoryName: string;
  saveStatus: SaveStatus;
  quality: QualityResult | null;
  onRegenerate: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onForceSave: () => Promise<boolean>;
  isRegenerating: boolean;
}

export function StudioToolbar({
  documentId,
  repositoryName,
  saveStatus,
  quality,
  onRegenerate,
  onCopy,
  onDownload,
  onForceSave,
  isRegenerating
}: StudioToolbarProps) {
  const [githubConnected, setGithubConnected] = useState(false);
  const [checkingGithub, setCheckingGithub] = useState(true);
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    checkGithubStatus();
  }, []);

  const checkGithubStatus = async () => {
    try {
      const res = await fetch('/api/github/status');
      const data = await res.json();
      setGithubConnected(data.data.connected);
    } catch (e) {
      setGithubConnected(false);
    } finally {
      setCheckingGithub(false);
    }
  };

  const handleConnectGithub = () => {
    const returnTo = window.location.pathname;
    window.location.href = `/api/github/connect?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const handleDisconnectGithub = async () => {
    setDisconnecting(true);
    try {
      await fetch('/api/github/disconnect', { method: 'POST' });
      setGithubConnected(false);
    } catch (e) {
      // Ignore
    } finally {
      setDisconnecting(false);
    }
  };

  const handleOpenCommitModal = async () => {
    if (saveStatus === 'editing' || saveStatus === 'saving' || saveStatus === 'error') {
      const saved = await onForceSave();
      if (!saved) {
        alert('Your latest changes could not be saved. Fix the save issue before committing.');
        return;
      }
    }
    setCommitModalOpen(true);
  };

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
        {!checkingGithub && !githubConnected && (
          <button
            onClick={handleConnectGithub}
            className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-white bg-[#2da44e] hover:bg-[#2c974b] rounded-md transition-colors"
          >
            <GithubIcon className="h-4 w-4" />
            Connect GitHub
          </button>
        )}

        {!checkingGithub && githubConnected && (
          <>
            <button
              onClick={handleOpenCommitModal}
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-black bg-white hover:bg-white/90 rounded-md transition-colors"
            >
              <GithubIcon className="h-4 w-4" />
              Commit to GitHub
            </button>
            
            <Popover.Root>
              <Popover.Trigger asChild>
                <button className="hidden lg:flex items-center justify-center h-8 w-8 rounded-md bg-white/5 hover:bg-white/10 text-muted-foreground transition-colors" title="GitHub Connected">
                  <CheckCircle2 className="h-4 w-4 text-[#2da44e]" />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content className="z-50 w-56 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xl animate-in fade-in-0 zoom-in-95" sideOffset={8} align="end">
                  <h4 className="font-semibold text-white mb-1 flex items-center gap-2">
                    <GithubIcon className="h-4 w-4" /> GitHub connected
                  </h4>
                  <p className="text-xs text-muted-foreground mb-4">You can commit documentation directly to your repositories.</p>
                  
                  <div className="flex flex-col gap-2">
                    <button onClick={handleConnectGithub} className="text-sm text-left px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 text-white transition-colors">
                      Reconnect
                    </button>
                    <button onClick={handleDisconnectGithub} disabled={disconnecting} className="text-sm text-left px-2 py-1.5 rounded bg-brand-amber/10 hover:bg-brand-amber/20 text-brand-amber transition-colors">
                      {disconnecting ? 'Disconnecting...' : 'Disconnect'}
                    </button>
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </>
        )}

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

      <GitHubCommitModal 
        open={commitModalOpen} 
        onOpenChange={setCommitModalOpen} 
        documentId={documentId} 
      />
    </div>
  );
}
