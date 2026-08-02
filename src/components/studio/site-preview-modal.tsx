import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Globe, AlertTriangle, ExternalLink, Loader2, Search, Copy, Check } from 'lucide-react';
import { DocumentationSitePayload } from '@/lib/documentation-site/site-types';
import { siteSearchIndex } from '@/lib/documentation-site/site-search-index';

interface SitePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repositoryAnalysisId?: string;
  isSavePending?: boolean;
}

export function SitePreviewModal({
  open,
  onOpenChange,
  repositoryAnalysisId,
  isSavePending,
}: SitePreviewModalProps) {
  const [siteData, setSiteData] = useState<DocumentationSitePayload | null>(null);
  const [activeSlug, setActiveSlug] = useState<string>('readme');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (open && repositoryAnalysisId) {
      setIsLoading(true);
      setError(null);
      fetch(`/api/repository-analysis/${repositoryAnalysisId}/site`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setSiteData(data.data);
            if (data.data.navigation && data.data.navigation.length > 0) {
              setActiveSlug(data.data.navigation[0].slug);
            }
          } else {
            setError(data.error?.message || 'Failed to load site preview');
          }
        })
        .catch(err => {
          setError('Failed to generate documentation site preview.');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [open, repositoryAnalysisId]);

  const activePage = siteData?.pages ? siteData.pages[activeSlug] : null;
  const searchResults = siteData ? siteSearchIndex.search(siteData.searchIndex, searchQuery) : [];

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-6xl h-[90vh] translate-x-[-50%] translate-y-[-50%] border border-border bg-card shadow-2xl rounded-2xl overflow-hidden flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          <head>
            <meta name="robots" content="noindex, nofollow" />
          </head>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-background/80 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 text-brand-cyan flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                  <span>{siteData?.siteName || 'Documentation Reader Preview'}</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-secondary text-muted-foreground border border-border">
                    PRIVATE PREVIEW (NOINDEX)
                  </span>
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {isSavePending && (
                <span className="text-xs text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Save editor changes to update preview
                </span>
              )}
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Reader View */}
          {isLoading ? (
            <div className="flex flex-1 items-center justify-center text-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand-cyan mb-3" />
              <p className="text-sm text-muted-foreground">Building static documentation site preview...</p>
            </div>
          ) : error || !siteData ? (
            <div className="flex flex-1 flex-col items-center justify-center text-center p-12">
              <AlertTriangle className="w-10 h-10 text-rose-400 mb-3" />
              <h4 className="text-base font-semibold text-foreground mb-1">Preview Generation Issue</h4>
              <p className="text-xs text-muted-foreground mb-4 max-w-sm">{error || 'Could not load site preview.'}</p>
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              {/* Left Sidebar Navigation */}
              <div className="w-64 border-r border-border bg-background/50 p-4 flex flex-col justify-between shrink-0">
                <div>
                  {/* Search Box */}
                  <div className="relative mb-4">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search documentation..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-brand-cyan"
                    />
                  </div>

                  {/* Search Results Dropdown */}
                  {searchQuery.trim().length > 0 && (
                    <div className="mb-4 max-h-40 overflow-y-auto rounded-lg border border-border bg-card p-2 space-y-1 text-xs">
                      {searchResults.length === 0 ? (
                        <p className="text-muted-foreground p-1 text-[11px]">No results found.</p>
                      ) : (
                        searchResults.map((res, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setActiveSlug(res.slug);
                              setSearchQuery('');
                            }}
                            className="w-full text-left p-1.5 rounded hover:bg-secondary block truncate"
                          >
                            <span className="font-semibold text-foreground">{res.title}</span>
                            {res.heading && <span className="text-muted-foreground block text-[10px]"> &gt; {res.heading}</span>}
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  {/* Doc Nav Links */}
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-2 px-2">
                    Documentation
                  </span>
                  <nav className="space-y-1">
                    {siteData.navigation.map(nav => (
                      <button
                        key={nav.id}
                        onClick={() => setActiveSlug(nav.slug)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                          activeSlug === nav.slug
                            ? 'bg-brand-cyan/15 text-brand-cyan font-semibold border border-brand-cyan/20'
                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                        }`}
                      >
                        {nav.title}
                      </button>
                    ))}
                  </nav>
                </div>

                <div className="pt-3 border-t border-border text-[11px] text-muted-foreground">
                  GitDoc AI Reader v1.0
                </div>
              </div>

              {/* Main Reader Content */}
              <div className="flex-1 p-8 overflow-y-auto bg-background">
                {activePage ? (
                  <div className="max-w-3xl mx-auto">
                    <div className="border-b border-border pb-4 mb-6">
                      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">{activePage.title}</h1>
                      <p className="text-xs text-muted-foreground">Updated {new Date(activePage.updatedAt).toLocaleDateString()}</p>
                    </div>

                    <div 
                      className="prose prose-invert max-w-none text-foreground/90 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: activePage.htmlContent }} 
                    />
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Select a document from the navigation sidebar.</p>
                )}
              </div>

              {/* Right Table of Contents */}
              {activePage?.headings && activePage.headings.length > 0 && (
                <div className="w-56 border-l border-border bg-background/30 p-4 shrink-0 hidden xl:block overflow-y-auto">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-3">
                    On This Page
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {activePage.headings.map(h => (
                      <a
                        key={h.id}
                        href={`#${h.id}`}
                        className={`block text-muted-foreground hover:text-foreground truncate transition-colors ${
                          h.level === 3 ? 'pl-3' : ''
                        }`}
                      >
                        {h.text}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
