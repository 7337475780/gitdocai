"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  ChevronDown,
} from "lucide-react";
import { GradientButton } from "@/components/ui/button";

const NAV_ITEMS = [
  { name: "Dashboard", href: "/studio", icon: LayoutDashboard },
  { name: "AI Analyze", href: "/analyze", icon: Sparkles },
  { name: "Documentation", href: "/docs", icon: FileText },
  { name: "Templates", href: "/templates", icon: LayoutTemplate },
  { name: "History", href: "/history", icon: History },
  { name: "GitHub Repos", href: "/repos", icon: GitBranch },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [user, setUser] = React.useState<{ name: string; email: string; avatarUrl?: string } | null>(null);

  React.useEffect(() => {
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
    <div
      className={cn(
        "flex h-full w-64 flex-col bg-card/40 border-r border-border backdrop-blur-md",
        className
      )}
    >
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center px-6">
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="GitDoc AI Logo"
            className="w-8 h-8 "
          />
          <span className="text-lg font-bold tracking-tight text-foreground">
            GitDoc AI
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className="relative flex items-center"
            >
              <div
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "text-brand-cyan"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 rounded-lg bg-brand-cyan/10 border border-brand-cyan/20"
                    initial={false}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <Icon className={cn("h-4 w-4 relative z-10", isActive ? "text-brand-cyan" : "")} />
                <span className="relative z-10">{item.name}</span>
                {isActive && (
                  <div className="relative z-10 ml-auto h-1.5 w-1.5 rounded-full bg-brand-cyan shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Upgrade Card */}
      <div className="px-4 py-4">
        <div className="relative overflow-hidden rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4 shadow-[0_0_30px_-10px_rgba(59,130,246,0.15)]">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-brand-blue/10 blur-xl" />
          <h4 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Zap className="h-3.5 w-3.5 text-brand-blue" /> Upgrade to Pro
          </h4>
          <p className="mb-3 text-xs text-muted-foreground">
            Unlock all features and supercharge your docs.
          </p>
          <GradientButton className="w-full text-xs py-2 h-auto">
            Upgrade Now →
          </GradientButton>
        </div>
      </div>

      {/* User Profile */}
      <div className="border-t border-border p-4">
        <div className="flex w-full items-center gap-3 rounded-lg p-2 text-left">
          <div className="h-9 w-9 rounded-full border border-border bg-secondary flex items-center justify-center text-xs font-bold text-brand-cyan overflow-hidden shrink-0">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="h-full w-full object-cover" />
            ) : (
              <span>{user?.name ? user.name.charAt(0).toUpperCase() : "G"}</span>
            )}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-foreground">
              {user?.name || "Developer Session"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email || (user ? "Connected" : "Local Workspace")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
