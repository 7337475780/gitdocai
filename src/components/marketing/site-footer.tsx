"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { GitBranch, Sun, Moon } from "lucide-react";
import { IconButton } from "@/components/ui/button";

const FOOTER_LINKS = {
  Product: [
    { name: "Analyze Repository", href: "/analyze" },
    { name: "Documentation Studio", href: "/docs" },
    { name: "Templates", href: "/templates" },
    { name: "History", href: "/history" },
  ],
  Resources: [
    { name: "Documentation", href: "#" },
    { name: "GitHub Integration", href: "#" },
    { name: "Changelog", href: "#" },
  ],
  Company: [
    { name: "GitHub", href: "https://github.com" },
    { name: "Feedback", href: "#" },
  ],
};

export function SiteFooter() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <footer className="border-t border-border bg-background pt-16 pb-8">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <img 
                src="/logo.png" 
                alt="GitDoc AI Logo" 
                className="w-6 h-6 rounded"
              />
              <span className="text-lg font-bold tracking-tight text-foreground">
                GitDoc AI
              </span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-xs">
              Understand your repository. Generate documentation that developers love.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.Product.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-brand-cyan transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Resources</h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.Resources.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-brand-cyan transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-3">
              {FOOTER_LINKS.Company.map((link) => (
                <li key={link.name}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-brand-cyan transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 GitDoc AI. Built for developers.
          </p>
          
          <div className="flex items-center gap-4">
            <IconButton
              icon={mounted && theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              aria-label="Toggle theme"
            />
            <Link href="https://github.com" target="_blank" rel="noreferrer">
              <IconButton icon={<GitBranch className="h-4 w-4" />} aria-label="GitHub" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
