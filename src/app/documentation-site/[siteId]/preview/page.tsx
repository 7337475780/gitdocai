'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, AlertTriangle, Loader2, Search } from 'lucide-react';
import { DocumentationSitePayload } from '@/lib/documentation-site/site-types';
import { siteSearchIndex } from '@/lib/documentation-site/site-search-index';

export default function PrivateSitePreviewPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = use(params);
  const router = useRouter();

  const [siteData, setSiteData] = useState<DocumentationSitePayload | null>(null);
  const [activeSlug, setActiveSlug] = useState<string>('readme');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/documentation-site/${siteId}/preview-data`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setSiteData(data.data);
          if (data.data.navigation && data.data.navigation.length > 0) {
            setActiveSlug(data.data.navigation[0].slug);
          }
        } else {
          setError(data.error?.message || 'Failed to load preview data.');
        }
      })
      .catch(() => {
        setError('Failed to load documentation site preview.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [siteId]);

  const activePage = siteData?.pages ? siteData.pages[activeSlug] : null;
  const searchResults = siteData ? siteSearchIndex.search(siteData.searchIndex, searchQuery) : [];

  if (isLoading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground text-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-brand-cyan mb-3" />
        <p className="text-sm text-muted-foreground">Loading documentation reader preview...</p>
      </div>
    );
  }

  if (error || !siteData) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background text-foreground text-center p-6">
        <AlertTriangle className="w-10 h-10 text-rose-400 mb-3" />
        <h2 className="text-xl font-bold mb-2">Preview Unavailable</h2>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">{error || 'Could not load site preview.'}</p>
        <button onClick={() => router.back()} className="px-4 py-2 bg-secondary text-foreground rounded-lg text-sm">
          Return to Studio
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>

      {/* Top Bar */}
      <header className="flex h-14 items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-brand-cyan/10 text-brand-cyan flex items-center justify-center font-bold text-xs">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-semibold text-sm text-foreground flex items-center gap-2">
              <span>{siteData.siteName}</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-secondary text-muted-foreground border border-border">
                PREVIEW MODE (NOINDEX)
              </span>
            </h1>
          </div>
        </div>

        <button
          onClick={() => router.back()}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-border bg-secondary hover:bg-secondary/80 text-foreground transition-colors"
        >
          Back to Studio
        </button>
      </header>

      {/* Main Reader View */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <div className="w-64 border-r border-border bg-background/40 p-4 flex flex-col justify-between shrink-0">
          <div>
            {/* Search Input */}
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

            {/* Search Results */}
            {searchQuery.trim().length > 0 && (
              <div className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-border bg-card p-2 space-y-1 text-xs">
                {searchResults.length === 0 ? (
                  <p className="text-muted-foreground p-1 text-[11px]">No matching sections found.</p>
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
            GitDoc AI Documentation Reader
          </div>
        </div>

        {/* Content Pane */}
        <main className="flex-1 p-8 overflow-y-auto bg-background">
          {activePage ? (
            <article className="max-w-3xl mx-auto">
              <header className="border-b border-border pb-4 mb-6">
                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">{activePage.title}</h1>
                <p className="text-xs text-muted-foreground">Last updated {new Date(activePage.updatedAt).toLocaleDateString()}</p>
              </header>

              <div 
                className="prose prose-invert max-w-none text-foreground/90 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: activePage.htmlContent }} 
              />
            </article>
          ) : (
            <p className="text-muted-foreground text-sm">Select a document from the navigation bar.</p>
          )}
        </main>

        {/* Table of Contents */}
        {activePage?.headings && activePage.headings.length > 0 && (
          <aside className="w-56 border-l border-border bg-background/30 p-4 shrink-0 hidden xl:block overflow-y-auto">
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
          </aside>
        )}
      </div>
    </div>
  );
}
