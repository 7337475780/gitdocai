import * as React from "react";
import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";
import { Search, Sun, Moon, Menu, Loader2, AlertCircle, FileText, FolderGit } from "lucide-react";
import { IconButton } from "@/components/ui/button";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  name?: string;
  fullName?: string;
  title?: string;
  type?: string;
  repositoryName?: string;
  repositoryAnalysisId?: string;
  createdAt?: string;
}

export function AppHeader({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [user, setUser] = React.useState<{ name: string; avatarUrl?: string } | null>(null);

  // Search state
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<{ repositories: SearchResult[]; documents: SearchResult[] }>({
    repositories: [],
    documents: [],
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const [isMac, setIsMac] = React.useState(true);

  // Detect platform
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform));
    }
  }, []);

  // Listen to Cmd/Ctrl + K hotkeys
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  React.useEffect(() => {
    setMounted(true);
    fetch('/api/github/status')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data.connected && json.data.user) {
          setUser(json.data.user);
        }
      })
      .catch(() => { });
  }, []);

  // Reset search when modal closes
  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults({ repositories: [], documents: [] });
      setError(null);
    }
  }, [open]);

  // Debounced search queries
  React.useEffect(() => {
    if (query.trim().length < 2) {
      setResults({ repositories: [], documents: [] });
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const controller = new AbortController();
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.success) {
          setResults(data.data);
          setSelectedIndex(0);
        } else {
          setError(data.error || "Search failed");
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError("Search failed. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(delayDebounce);
      controller.abort();
    };
  }, [query]);

  // Compile flat items for list index calculations
  const flatItems = [
    ...results.repositories.map(r => ({ ...r, category: 'repositories' })),
    ...results.documents.map(d => ({ ...d, category: 'documents' })),
  ];

  // Command palette keyboard navigation handlers
  const handleDialogKeyDown = (e: React.KeyboardEvent) => {
    if (flatItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % flatItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selectedItem = flatItems[selectedIndex];
      if (selectedItem) {
        if (selectedItem.category === 'repositories') {
          router.push(`/repository/${selectedItem.id}/intelligence`);
        } else {
          router.push(`/studio/${selectedItem.id}`);
        }
        setOpen(false);
      }
    }
  };

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return "Overview";
    return segments.map(seg => seg.charAt(0).toUpperCase() + seg.slice(1)).join(" / ");
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <IconButton
            icon={<Menu className="h-5 w-5" />}
            onClick={onMenuClick}
            className="md:hidden"
            aria-label="Toggle menu"
          />
        )}
        
        <span className="hidden lg:inline text-[11px] font-semibold text-muted-foreground/80 tracking-wide uppercase">
          {getBreadcrumbs()}
        </span>
        
        {/* Mobile Search Button */}
        <IconButton
          icon={<Search className="h-4 w-4" />}
          onClick={() => setOpen(true)}
          className="sm:hidden text-muted-foreground hover:text-foreground"
          aria-label="Open search dialog"
        />

        {/* Desktop Search Button */}
        <div 
          onClick={() => setOpen(true)}
          className="relative hidden sm:block cursor-pointer group"
        >
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/80 group-hover:text-foreground transition-colors" />
          <div className="flex h-8 w-44 md:w-52 lg:w-64 items-center justify-between rounded-md border border-border bg-secondary/40 pl-8 pr-2.5 text-xs text-muted-foreground group-hover:border-brand-coral/40 transition-colors">
            <span className="truncate mr-1.5 whitespace-nowrap">Search...</span>
            <kbd className="inline-flex h-4 items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[9px] font-medium text-muted-foreground pointer-events-none shrink-0">
              {isMac ? "⌘K" : "Ctrl+K"}
            </kbd>
          </div>
        </div>
      </div>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border border-border bg-card shadow-2xl duration-200">
            <div className="flex items-center border-b border-border px-3">
              <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
              <input
                className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Type to search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleDialogKeyDown}
                autoFocus
              />
            </div>

            <div className="max-h-[300px] overflow-y-auto p-2">
              {loading && (
                <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-brand-cyan" />
                  Searching...
                </div>
              )}

              {error && (
                <div className="flex items-center justify-center gap-2 py-6 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {!loading && !error && query.trim().length >= 2 && results.repositories.length === 0 && results.documents.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No results found for &ldquo;{query}&rdquo;
                </div>
              )}

              {!loading && (results.repositories.length > 0 || results.documents.length > 0) && (
                <div className="space-y-4">
                  {results.repositories.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Repositories
                      </div>
                      <div className="space-y-0.5">
                        {results.repositories.map((repo, idx) => {
                          const flatIdx = idx;
                          const isSelected = flatIdx === selectedIndex;
                          return (
                            <button
                              key={repo.id}
                              onClick={() => {
                                router.push(`/repository/${repo.id}/intelligence`);
                                setOpen(false);
                              }}
                              className={cn(
                                "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                                isSelected ? "bg-brand-cyan/10 text-brand-cyan font-medium" : "text-foreground hover:bg-secondary/40"
                              )}
                            >
                              <FolderGit className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="truncate">
                                <div className="text-xs font-semibold">{repo.name}</div>
                                <div className="text-[10px] text-muted-foreground truncate">{repo.fullName}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {results.documents.length > 0 && (
                    <div>
                      <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        Documentation
                      </div>
                      <div className="space-y-0.5">
                        {results.documents.map((doc, idx) => {
                          const flatIdx = results.repositories.length + idx;
                          const isSelected = flatIdx === selectedIndex;
                          return (
                            <button
                              key={doc.id}
                              onClick={() => {
                                router.push(`/studio/${doc.id}`);
                                setOpen(false);
                              }}
                              className={cn(
                                "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                                isSelected ? "bg-brand-cyan/10 text-brand-cyan font-medium" : "text-foreground hover:bg-secondary/40"
                              )}
                            >
                              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="truncate">
                                <div className="text-xs font-semibold">{doc.title}</div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                                  <span>{doc.type}</span>
                                  <span>&bull;</span>
                                  <span>{doc.repositoryName}</span>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <div className="flex items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-1 sm:gap-2">
          <IconButton
            icon={mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
          />
          <div className="ml-2 hidden sm:flex h-8 w-8 overflow-hidden rounded-full border border-border bg-secondary items-center justify-center text-xs font-bold text-brand-cyan">
            {user?.avatarUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element -- Dynamic GitHub user avatar requires raw img tag to avoid domain configuration lock */
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <span>{user?.name ? user.name.charAt(0).toUpperCase() : "D"}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
