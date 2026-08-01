'use client';

import React, { useState, useEffect, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/ui/layout';
import { SectionNav } from '@/components/studio/section-nav';
import { MarkdownEditor } from '@/components/studio/markdown-editor';
import { MarkdownPreview } from '@/components/studio/markdown-preview';
import { StudioToolbar, SaveStatus } from '@/components/studio/studio-toolbar';
import { GradientButton } from '@/components/ui/button';
import { FileText, Menu } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

export default function DocumentStudioPage({ params }: { params: Promise<{ documentId: string }> }) {
  const router = useRouter();
  const { documentId } = use(params);
  const [doc, setDoc] = useState<any | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/documentation/${documentId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setDoc(data.data);
          setMarkdown(data.data.markdown);
        } else {
          setError(data.error?.message || 'Failed to load document');
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
          setSaveStatus('saved');
        } else {
          setSaveStatus('error');
        }
      } catch (e) {
        setSaveStatus('error');
      }
    }, 1000);
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
    if (!confirm('Regenerate documentation? This will replace the current README with a newly generated version. Your current edits will be lost.')) return;
    
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
        quality={doc.qualityScore}
        onRegenerate={handleRegenerateFull}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onForceSave={handleForceSave}
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
    </div>
  );
}
