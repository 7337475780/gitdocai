"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Sparkles,
  FileText,
  LayoutTemplate,
  History,
  GitBranch,
  Settings,
  Zap,
  Sun,
  Moon,
} from "lucide-react";
import { GradientButton } from "@/components/ui/button";

const GROUPS = [
  {
    title: "Workspace",
    items: [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { name: "Analyze", href: "/analyze", icon: Sparkles },
      { name: "Documentation", href: "/docs", icon: FileText },
    ],
  },
  {
    title: "Resources",
    items: [
      { name: "Templates", href: "/templates", icon: LayoutTemplate },
      { name: "History", href: "/history", icon: History },
      { name: "Repositories", href: "/repos", icon: GitBranch },
    ],
  },
  {
    title: "System",
    items: [
      { name: "Settings", href: "/settings", icon: Settings },
    ],
  },
];

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [user, setUser] = React.useState<{ name: string; email: string; avatarUrl?: string } | null>(null);

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

  return (
    <div
      className={cn(
        "flex h-full w-64 flex-col bg-card border-r border-border backdrop-blur-md",
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-5 border-b border-border/40">
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- Local branding logo asset */}
          <img
            src="/logo.png"
            alt="GitDoc AI Logo"
            width={24}
            height={24}
            className="w-6 h-6"
          />
          <span className="text-sm font-semibold tracking-tight text-foreground">
            GitDoc AI
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-5 scrollbar-hide">
        {GROUPS.map((group) => (
          <div key={group.title} className="space-y-1.5">
            <h5 className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
              {group.title}
            </h5>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="relative flex items-center rounded-md focus-ring"
                  >
                    <div
                      className={cn(
                        "group flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors relative z-10",
                        isActive
                          ? "text-brand-coral bg-brand-coral/5 dark:bg-brand-coral/10 font-semibold"
                          : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-brand-coral" : "text-muted-foreground/80")} />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile + Theme Toggle */}
      <div className="border-t border-border p-3.5 flex flex-col gap-2">
        <div className="flex w-full items-center justify-between gap-2.5 rounded-md p-1.5 text-left bg-secondary/30 border border-border/30">
          <div className="flex items-center gap-2 overflow-hidden flex-1">
            <div className="h-7 w-7 rounded-full border border-border bg-secondary flex items-center justify-center text-xs font-semibold text-brand-coral overflow-hidden shrink-0">
              {user?.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element -- Dynamic GitHub user avatar */
                <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <span>{user?.name ? user.name.charAt(0).toUpperCase() : "G"}</span>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-xs font-medium text-foreground">
                {user?.name || "Developer"}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {user?.email || (user ? "Connected" : "Local Session")}
              </p>
            </div>
          </div>

          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-1.5 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors shrink-0"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
