"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { GitBranch, Sparkles, CheckCircle2, XCircle, SearchCode, FolderGit2, FileText, ChevronRight, Code2 } from "lucide-react";
import { GradientButton } from "@/components/ui/button";
import { useAnalysisStore } from "@/store/useAnalysisStore";
import { GlassCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function RepositoryInputState() {
  const { url, setUrl, status, startAnalysis } = useAnalysisStore();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const isValidUrl = React.useMemo(() => {
    if (!url) return null;
    const githubUrlRegex = /^https?:\/\/(www\.)?github\.com\/[\w.-]+\/[\w.-]+(\.git|\/)?$/i;
    return githubUrlRegex.test(url.trim());
  }, [url]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && isValidUrl && status !== "validating") {
      startAnalysis();
    }
  };

  const handleExampleClick = () => {
    setUrl("https://github.com/vercel/next.js");
    inputRef.current?.focus();
  };

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 md:py-12 flex flex-col">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-12 items-center">

        {/* Left Column: Input and Content */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-start"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-cyan/10 border border-brand-cyan/20 text-brand-cyan text-xs font-semibold mb-6">
            <SearchCode className="w-3.5 h-3.5" />
            REPOSITORY ANALYSIS
          </div>

          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Understand your repository before documenting it.
          </h1>

          <p className="text-lg text-muted-foreground mb-8">
            Paste a public GitHub repository URL. GitDoc AI will inspect the project structure, technologies, dependencies, scripts, and configuration.
          </p>

          <GlassCard className="w-full p-6 border-brand-blue/20 bg-card/60 backdrop-blur-xl mb-6 shadow-xl">
            <label className="text-sm font-semibold text-foreground mb-3 block">
              GitHub Repository URL
            </label>
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <GitBranch className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="https://github.com/owner/project"
                className={cn(
                  "block w-full pl-11 pr-4 py-3.5 bg-background border rounded-lg text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-colors",
                  isValidUrl === true ? "border-brand-teal/50 focus:border-brand-teal focus:ring-1 focus:ring-brand-teal" :
                    isValidUrl === false && url.length > 0 ? "border-red-500/50 focus:border-red-500 focus:ring-1 focus:ring-red-500" :
                      "border-border focus:border-brand-cyan focus:ring-1 focus:ring-brand-cyan"
                )}
                disabled={status === 'validating'}
              />
            </div>

            <div className="h-6 mb-6">
              {url.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center text-sm"
                >
                  {isValidUrl ? (
                    <span className="flex items-center gap-1.5 text-brand-teal">
                      <CheckCircle2 className="w-4 h-4" /> Valid GitHub repository URL
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-red-500">
                      <XCircle className="w-4 h-4" /> Enter a valid GitHub repository URL.
                    </span>
                  )}
                </motion.div>
              )}
            </div>

            <GradientButton
              className="w-full flex items-center justify-center gap-2 py-4 text-base shadow-[0_0_20px_rgba(6,182,212,0.2)] rounded-full "
              disabled={!isValidUrl || status === 'validating'}
              onClick={startAnalysis}
            >
              Analyze Repository
              <Sparkles className="w-4 h-4" />
            </GradientButton>

            <div className="mt-4 text-center">
              <button
                onClick={handleExampleClick}
                className="text-xs font-medium text-muted-foreground hover:text-brand-cyan transition-colors underline underline-offset-4"
              >
                Try an example repository
              </button>
            </div>
          </GlassCard>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal" /> Public repositories supported
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal" /> No GitHub login required
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-brand-teal" /> Your repository is analyzed securely
            </div>
          </div>
        </motion.div>

        {/* Right Column: Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative h-[400px] lg:h-[500px] hidden md:flex items-center justify-center"
        >
          <div className="relative w-full max-w-sm aspect-square scale-90 lg:scale-100">
            {/* Central AI Node */}
            <motion.div
              animate={{ boxShadow: ["0 0 20px rgba(6,182,212,0.2)", "0 0 40px rgba(6,182,212,0.4)", "0 0 20px rgba(6,182,212,0.2)"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-2xl bg-card border border-brand-cyan/30 flex items-center justify-center z-20 backdrop-blur-xl shadow-2xl"
            >
              <div className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-brand-cyan to-brand-blue">
                AI
              </div>
            </motion.div>

            {/* Orbiting Repository Card */}
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[10%] left-[5%] z-30"
            >
              <GlassCard className="p-4 flex flex-col gap-3 min-w-[160px] border-brand-blue/20">
                <div className="flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-brand-blue" />
                  <span className="text-sm font-semibold text-foreground">Repository</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="h-1.5 w-full bg-secondary rounded-full" />
                  <div className="h-1.5 w-4/5 bg-secondary rounded-full" />
                  <div className="h-1.5 w-5/6 bg-secondary rounded-full" />
                </div>
              </GlassCard>
            </motion.div>

            {/* Connecting Lines */}
            <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
              <motion.path
                d="M 80 110 Q 100 200 200 200"
                fill="none"
                stroke="rgba(59,130,246,0.3)"
                strokeWidth="2"
                strokeDasharray="4 4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, delay: 0.5 }}
              />
              <motion.path
                d="M 180 200 Q 340 180 360 340"
                fill="none"
                stroke="rgba(139,92,246,0.3)"
                strokeWidth="2"
                strokeDasharray="4 4"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.5, delay: 0.8 }}
              />
              <motion.circle cx="200" cy="200" r="3" fill="#3b82f6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} />
              <motion.circle cx="230" cy="210" r="3" fill="#8b5cf6" initial={{ opacity: 1 }} transition={{ delay: 1 }} />
            </svg>

            {/* Orbiting Output Card */}
            <motion.div
              animate={{ y: [10, -10, 10] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-[-10%] right-[-10%] z-30"
            >
              <GlassCard className="p-4 flex flex-col gap-3 min-w-[200px] border-brand-violet/20">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-violet" />
                  <span className="text-sm font-semibold text-foreground">README.md</span>
                </div>
                <div className="flex flex-col gap-2 mt-1 ml-1">
                  <div className="h-3 w-1/2 bg-brand-violet/20 rounded" />
                  <div className="h-1.5 w-full bg-secondary rounded-full mt-1" />
                  <div className="h-1.5 w-full bg-secondary rounded-full" />
                  <div className="h-1.5 w-3/4 bg-secondary rounded-full" />
                  <div className="h-3 w-1/3 bg-brand-violet/20 rounded mt-1" />
                  <div className="h-1.5 w-full bg-secondary rounded-full mt-1" />
                  <div className="h-1.5 w-5/6 bg-secondary rounded-full" />
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
