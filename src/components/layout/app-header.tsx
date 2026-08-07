"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Search, Sun, Moon, Menu } from "lucide-react";
import { IconButton } from "@/components/ui/button";

export function AppHeader({
  onMenuClick,
}: {
  onMenuClick?: () => void;
}) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [user, setUser] = React.useState<{ name: string; avatarUrl?: string } | null>(null);

  React.useEffect(() => {
    setMounted(true);
    fetch('/api/github/status')
      .then(res => res.json())
      .then(json => {
        if (json.success && json.data.connected && json.data.user) {
          setUser(json.data.user);
        }
      })
      .catch(() => {});
  }, []);

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
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search repositories, docs..."
            className="h-9 w-64 md:w-80 rounded-md border border-input bg-card/50 pl-9 pr-12 text-sm text-foreground shadow-sm transition-colors focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <kbd className="inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

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
