'use client';

import React, { useState, useEffect, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useDialog } from '@/components/ui/dialog-provider';
import { PageContainer } from '@/components/ui/layout';
import { SectionNav } from '@/components/studio/section-nav';
import { MarkdownEditor } from '@/components/studio/markdown-editor';
import { MarkdownPreview } from '@/components/studio/markdown-preview';
import { StudioToolbar, SaveStatus } from '@/components/studio/studio-toolbar';
import { GradientButton } from '@/components/ui/button';
import { FileText, Menu } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { DocumentationQualityResult } from '@/lib/documentation-quality/quality-types';
import { HistoryPanel } from '@/components/studio/history-panel';
import { VersionCompareModal } from '@/components/studio/version-compare-modal';

export default function DocumentStudioPage({ params }: { params: Promise<{ documentId: string }> }) {
  const router = useRouter();
  const dialog = useDialog();
  const { documentId } = use(params);
  const [doc, setDoc] = useState<any | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [quality, setQuality] = useState<DocumentationQualityResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareBaseVersion, setCompareBaseVersion] = useState<any | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetch(`/api/documentation/${documentId}`).then(res => res.json()),
      fetch(`/api/documentation/${documentId}/quality`).then(res => res.json())
    ])
      .then(([docData, qualData]) => {
        if (docData.success) {
          setDoc(docData.data);
          setMarkdown(docData.data.markdown);
        } else {
          setError(docData.error?.message || 'Failed to load document');
        }

        if (qualData.success) {
          setQuality(qualData.data);
        }
      })
      .catch(err => {
        console.error(err);
        setError('Failed to load document');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [documentId]);

  const handleMarkdownChange = useCallback((newMarkdown: string) => {
    setMarkdown(newMarkdown);
    setSaveStatus('editing');

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const res = await fetch(`/api/documentation/${documentId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markdown: newMarkdown })
        });
        const data = await res.json();
        if (data.success) {
          setDoc(data.data); 
          if (data.data.qualityData) {
            setQuality(data.data.qualityData);
          }
          setSaveStatus('saved');
        } else {
          setSaveStatus('error');
        }
      } catch (e) {
        setSaveStatus('error');
      }
    }, 2000); // 2 seconds debounce for quality updates
  }, [documentId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown).then(() => {});
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'README.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRegenerateFull = async () => {
    const confirmed = await dialog.confirm({
      title: "Regenerate Documentation?",
      description: "This will replace the current README with a newly generated version. Your current edits will be lost.",
      variant: "warning",
      confirmText: "Regenerate",
      cancelText: "Cancel",
    });
    if (!confirmed) return;
    
    setIsRegenerating(true);
    // Future integration point for full regeneration API
    setTimeout(() => {
      setIsRegenerating(false);
    }, 2000);
  };

  const handleRegenerateSection = async (sectionId: string) => {
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/documentation/${documentId}/sections/${sectionId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instruction: '' })
      });
      const data = await res.json();
      if (data.success) {
        setDoc(data.data);
        setMarkdown(data.data.markdown);
        if (data.data.qualityData) {
          setQuality(data.data.qualityData);
        }
        setSaveStatus('saved');
      } else {
        setSaveStatus('error');
      }
    } catch (e) {
      setSaveStatus('error');
    }
  };

  const handleForceSave = async (): Promise<boolean> => {
    if (saveStatus === 'saved') return true;
    
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/documentation/${documentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markdown })
      });
      const data = await res.json();
      if (data.success) {
        setDoc(data.data);
        if (data.data.qualityData) {
          setQuality(data.data.qualityData);
        }
        setSaveStatus('saved');
        return true;
      }
      setSaveStatus('error');
      return false;
    } catch (e) {
      setSaveStatus('error');
      return false;
    }
  };

  const handleRestoreFromId = async (versionId: string, versionNumber: number) => {
    const confirmed = await dialog.confirm({
      title: `Restore Version ${versionNumber}?`,
      description: "The current state will be preserved in version history.",
      variant: "info",
      confirmText: "Restore Version",
      cancelText: "Cancel"
    });
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/documentation/${documentId}/versions/${versionId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expectedUpdatedAt: doc.updatedAt
        })
      });
      const data = await res.json();
      if (data.success) {
        setMarkdown(data.data.document.markdown);
        setQuality(data.data.document.qualityData);
        setDoc((prev: any) => prev ? { 
          ...prev, 
          markdown: data.data.document.markdown, 
          updatedAt: data.data.document.updatedAt 
        } : null);
        setCompareModalOpen(false);
        setHistoryOpen(false);
      } else {
        await dialog.alert({
          title: "Restore Failed",
          description: data.error?.message || "Failed to restore version.",
          variant: "destructive"
        });
      }
    } catch (e) {
      await dialog.alert({
        title: "Restore Failed",
        description: "An unexpected error occurred while restoring the version.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex h-[70vh] flex-col items-center justify-center text-center">
          <p className="text-muted-foreground">Loading documentation...</p>
        </div>
      </PageContainer>
    );
  }

  if (error || !doc) {
    return (
      <PageContainer>
        <div className="flex h-[70vh] flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-4">
            <FileText className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Document not found</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            {error || 'This documentation is no longer available.'}
          </p>
          <GradientButton onClick={() => router.push('/analyze')}>
            Analyze a Repository
          </GradientButton>
        </div>
      </PageContainer>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <StudioToolbar 
        documentId={documentId}
        repositoryName={doc.title || "Repository"}
        saveStatus={saveStatus}
        quality={quality}
        onRegenerate={handleRegenerateFull}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onForceSave={handleForceSave}
        onMarkdownUpdate={(newMarkdown, newQuality) => {
          setMarkdown(newMarkdown);
          setQuality(newQuality);
        }}
        onToggleHistory={() => setHistoryOpen(true)}
        isRegenerating={isRegenerating}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sections */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <SectionNav 
            sections={doc.sections}
            activeSectionId={activeSectionId}
            onSectionClick={setActiveSectionId}
            onRegenerateSection={handleRegenerateSection}
            metadata={{ wordCount: doc.metadata?.wordCount || 0, characterCount: doc.metadata?.characterCount || 0 }}
          />
        </div>

        {/* Mobile Tabs */}
        <div className="lg:hidden absolute bottom-4 left-1/2 -translate-x-1/2 flex bg-background/80 backdrop-blur border border-border p-1 rounded-full z-10">
          <button 
            className={`px-4 py-1 text-sm rounded-full ${mobileTab === 'editor' ? 'bg-white/10 text-white' : 'text-muted-foreground'}`}
            onClick={() => setMobileTab('editor')}
          >
            Editor
          </button>
          <button 
            className={`px-4 py-1 text-sm rounded-full ${mobileTab === 'preview' ? 'bg-white/10 text-white' : 'text-muted-foreground'}`}
            onClick={() => setMobileTab('preview')}
          >
            Preview
          </button>
        </div>

        {/* Mobile Drawer Toggle */}
        <button 
          className="lg:hidden absolute top-16 left-4 z-10 p-2 bg-background/80 backdrop-blur border border-border rounded-md text-foreground"
          onClick={() => setIsDrawerOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Editor Pane */}
        <div className={`flex-1 border-r border-border overflow-hidden ${mobileTab !== 'editor' ? 'hidden lg:block' : ''}`}>
          <MarkdownEditor value={markdown} onChange={handleMarkdownChange} />
        </div>

        {/* Preview Pane */}
        <div className={`flex-1 overflow-hidden ${mobileTab !== 'preview' ? 'hidden lg:block' : ''}`}>
          <MarkdownPreview markdown={markdown} />
        </div>
      </div>

      <HistoryPanel
        documentId={documentId}
        currentUpdatedAt={doc.updatedAt}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        onCompareWithCurrent={(version) => {
          setCompareBaseVersion(version);
          setCompareModalOpen(true);
        }}
        onRestoreSuccess={(newMarkdown, newQuality) => {
          setMarkdown(newMarkdown);
          setQuality(newQuality);
          setDoc((prev: any) => prev ? { 
            ...prev, 
            markdown: newMarkdown, 
            updatedAt: new Date().toISOString() 
          } : null);
        }}
      />

      {compareBaseVersion && (
        <VersionCompareModal
          documentId={documentId}
          baseVersionId={compareBaseVersion.versionId}
          baseVersionNumber={compareBaseVersion.versionNumber}
          compareVersionId="current"
          compareVersionNumber={(quality?.overallScore || 0) > 0 ? 0 : 0} // Standard dynamic title handles it
          baseQualityScore={compareBaseVersion.qualityScore}
          compareQualityScore={quality?.overallScore}
          open={compareModalOpen}
          onOpenChange={setCompareModalOpen}
          onRestore={() => handleRestoreFromId(compareBaseVersion.versionId, compareBaseVersion.versionNumber)}
        />
      )}
    </div>
  );
}
