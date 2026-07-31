'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageContainer } from '@/components/ui/layout';
import { SectionNav } from '@/components/studio/section-nav';
import { MarkdownEditor } from '@/components/studio/markdown-editor';
import { MarkdownPreview } from '@/components/studio/markdown-preview';
import { StudioToolbar, SaveStatus } from '@/components/studio/studio-toolbar';
import { GeneratedDocument } from '@/lib/documentation/readme-generator';
import { GradientButton } from '@/components/ui/button';
import { FileText, Menu } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';

export default function StudioPage() {
  const router = useRouter();
  const [doc, setDoc] = useState<GeneratedDocument | null>(null);
  const [markdown, setMarkdown] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Load document (in a real app, from context or API, here we mock for demo)
  // But wait, the API requires documentId. Since we don't have URL params for this route according to spec,
  // we could fetch a generic "current" document or mock it if none exists.
  // Actually, Phase 5 generated a document and saved it in memoryStore.
  // The user would navigate here from `/analyze`. The document ID should probably be in a global store (Zustand) or sessionStorage.
  // Let's assume we can fetch the latest document from an API if we don't know the ID, or we use localStorage.
  
  // Since we don't have a specific `documentId` passed to this page component (it's not `[documentId]/page.tsx`), 
  // we will try to fetch the most recent document from a new API or check localStorage.
  // Let's just create a `GET /api/documentation/latest` or similar, or we can use Zustand if it's set.
  // We have `zustand` installed! Let's check if there is a store.
  
  useEffect(() => {
    // For now, check if there's a documentId in sessionStorage
    const currentDocId = sessionStorage.getItem('currentDocumentId');
    if (currentDocId) {
      fetch(`/api/documentation/${currentDocId}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setDoc(data.data);
            setMarkdown(data.data.markdown);
          }
        })
        .catch(console.error);
    }
  }, []);

  const handleMarkdownChange = useCallback((newMarkdown: string) => {
    setMarkdown(newMarkdown);
    setSaveStatus('editing');

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    saveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        if (!doc) return;
        const res = await fetch(`/api/documentation/${doc.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ markdown: newMarkdown })
        });
        const data = await res.json();
        if (data.success) {
          setDoc(data.data); // Update metadata and sections
          setSaveStatus('saved');
        } else {
          setSaveStatus('error');
        }
      } catch (e) {
        setSaveStatus('error');
      }
    }, 1000);
  }, [doc]);

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown).then(() => {
      // Optional: show toast
    });
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
    if (!doc) return;
    if (!confirm('Regenerate documentation? This will replace the current README with a newly generated version. Your current edits will be lost.')) return;
    
    setIsRegenerating(true);
    // In a real app, call a regenerate endpoint
    // For now, simulate delay
    setTimeout(() => {
      setIsRegenerating(false);
    }, 2000);
  };

  const handleRegenerateSection = async (sectionId: string) => {
    if (!doc) return;
    // We would open a modal to ask for instructions here, but for now just call API
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/documentation/${doc.id}/sections/${sectionId}/regenerate`, {
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

  if (!doc) {
    return (
      <PageContainer>
        <div className="flex h-[70vh] flex-col items-center justify-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-cyan/10 mb-4">
            <FileText className="h-8 w-8 text-brand-cyan" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">No documentation is open</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
            Generate documentation from a GitHub repository to start editing.
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
        repositoryName={doc.title || "Repository"}
        saveStatus={saveStatus}
        quality={doc.quality}
        onRegenerate={handleRegenerateFull}
        onCopy={handleCopy}
        onDownload={handleDownload}
        isRegenerating={isRegenerating}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sections */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <SectionNav 
            sections={doc.sections}
            activeSectionId={activeSectionId}
            onSectionClick={setActiveSectionId} // in a real implementation, this would scroll
            onRegenerateSection={handleRegenerateSection}
            metadata={{ wordCount: doc.metadata.wordCount, characterCount: doc.metadata.characterCount }}
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
