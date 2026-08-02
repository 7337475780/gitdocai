import React, { useState, useEffect } from 'react';
import { useDialog } from '@/components/ui/dialog-provider';
import { Download, Copy, RefreshCw, CheckCircle2, Loader2, CircleAlert, GitCommitHorizontal, ExternalLink, History } from 'lucide-react';
import { GradientButton } from '@/components/ui/button';
import { DocumentSection } from '@/lib/documentation/section-parser';
import { DocumentationQualityResult } from '@/lib/documentation-quality/quality-types';
import { QualityPanel } from './quality-panel';
import { GitHubCommitModal } from './github-commit-modal';
import * as Popover from '@radix-ui/react-popover';
import { GithubIcon } from '@/components/ui/icons';
import * as Dialog from '@radix-ui/react-dialog';
import { X, AlertTriangle } from 'lucide-react';

import { DocumentationFreshnessStatus } from '@/lib/documentation-freshness/freshness-types';
import { FreshnessBadge } from './freshness-badge';
import { ExportMenu } from './export-menu';

export type SaveStatus = 'saved' | 'editing' | 'saving' | 'error';

interface StudioToolbarProps {
  documentId: string;
  documentType?: string;
  repositoryAnalysisId?: string;
  repositoryName: string;
  saveStatus: SaveStatus;
  quality: DocumentationQualityResult | null;
  freshnessStatus?: DocumentationFreshnessStatus | null;
  freshnessImpactScore?: number;
  onToggleFreshness?: () => void;
  isFreshnessLoading?: boolean;
  onOpenSitePreview?: () => void;
  onOpenPublishModal?: () => void;
  onRegenerate: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onForceSave: () => Promise<boolean>;
  onMarkdownUpdate?: (markdown: string, quality: any) => void;
  onToggleHistory: () => void;
  isRegenerating: boolean;
}

export function StudioToolbar({
  documentId,
  documentType = 'README',
  repositoryAnalysisId,
  repositoryName,
  saveStatus,
  quality,
  freshnessStatus,
  freshnessImpactScore,
  onToggleFreshness,
  isFreshnessLoading,
  onOpenSitePreview,
  onOpenPublishModal,
  onRegenerate,
  onCopy,
  onDownload,
  onForceSave,
  onMarkdownUpdate,
  onToggleHistory,
  isRegenerating
}: StudioToolbarProps) {
  const dialog = useDialog();
  const [githubConnected, setGithubConnected] = useState(false);
  const [checkingGithub, setCheckingGithub] = useState(true);
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [qualityPanelOpen, setQualityPanelOpen] = useState(false);
  const [showLowQualityWarning, setShowLowQualityWarning] = useState(false);

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
        await dialog.alert({
          title: "Save Issue",
          description: "Your latest changes could not be saved. Fix the save issue before committing.",
          variant: "destructive"
        });
        return;
      }
    }
    
    // Recalculate quality checks: warning if score is below 60
    if (quality && quality.overallScore < 60) {
      setShowLowQualityWarning(true);
    } else {
      setCommitModalOpen(true);
    }
  };

  return (
    <div className="flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      
      {/* Left */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground">GitDoc AI</span>
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

      {/* Center (Freshness & Quality) */}
      <div className="hidden md:flex items-center justify-center gap-3 flex-1">
        {onToggleFreshness && (
          <FreshnessBadge
            status={freshnessStatus || null}
            impactScore={freshnessImpactScore}
            onClick={onToggleFreshness}
            isLoading={isFreshnessLoading}
          />
        )}

        {quality && (
          <QualityPanel 
            quality={quality} 
            documentId={documentId}
            onMarkdownUpdate={onMarkdownUpdate}
            open={qualityPanelOpen}
            onOpenChange={setQualityPanelOpen}
          />
        )}
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
              className="hidden lg:flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-background bg-foreground hover:bg-foreground/90 rounded-md transition-colors"
            >
              <GithubIcon className="h-4 w-4" />
              Commit to GitHub
            </button>
            
            <Popover.Root>
              <Popover.Trigger asChild>
                <button className="hidden lg:flex items-center justify-center h-8 w-8 rounded-md bg-secondary hover:bg-secondary/85 text-muted-foreground transition-colors" title="GitHub Connected">
                  <CheckCircle2 className="h-4 w-4 text-[#2da44e]" />
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content className="z-50 w-56 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xl animate-in fade-in-0 zoom-in-95" sideOffset={8} align="end">
                  <h4 className="font-semibold text-foreground mb-1 flex items-center gap-2">
                    <GithubIcon className="h-4 w-4" /> GitHub connected
                  </h4>
                  <p className="text-xs text-muted-foreground mb-4">You can commit documentation directly to your repositories.</p>
                  
                  <div className="flex flex-col gap-2">
                    <button onClick={handleConnectGithub} className="text-sm text-left px-2 py-1.5 rounded bg-secondary hover:bg-secondary/80 text-foreground transition-colors">
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
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-foreground bg-secondary hover:bg-secondary/80 rounded-md transition-colors disabled:opacity-50"
        >
          {isRegenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="hidden sm:inline">{isRegenerating ? 'Regenerating...' : 'Regenerate'}</span>
        </button>

        <button 
          onClick={onToggleHistory} 
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
          title="Version History"
        >
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">History</span>
        </button>

        <ExportMenu
          documentId={documentId}
          documentType={documentType}
          repositoryAnalysisId={repositoryAnalysisId}
          onOpenSitePreview={onOpenSitePreview || (() => {})}
          onOpenPublishModal={onOpenPublishModal || (() => {})}
        />

        <button 
          onClick={onCopy} 
          className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
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

      {/* Low Quality Commit Warning Modal */}
      <Dialog.Root open={showLowQualityWarning} onOpenChange={setShowLowQualityWarning}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] border border-border bg-card p-6 shadow-2xl rounded-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-brand-amber/15 text-brand-amber flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <Dialog.Title className="text-lg font-semibold tracking-tight text-foreground mb-2">
                  Low Quality Score
                </Dialog.Title>
                <Dialog.Description className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  This README may be missing important documentation details. The current documentation quality score is <span className="text-brand-amber font-semibold">{quality?.overallScore}/100</span>.
                </Dialog.Description>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowLowQualityWarning(false);
                  setQualityPanelOpen(true);
                }}
                className="px-4 py-2 border border-border bg-transparent hover:bg-secondary text-foreground font-medium rounded-lg transition-colors text-sm"
              >
                Review Suggestions
              </button>
              <button
                onClick={() => {
                  setShowLowQualityWarning(false);
                  setCommitModalOpen(true);
                }}
                className="px-4 py-2 bg-foreground text-background hover:bg-foreground/90 font-medium rounded-lg transition-colors text-sm"
              >
                Commit Anyway
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
