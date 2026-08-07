"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { GitBranch, Sparkles, CheckCircle2, XCircle, SearchCode, FolderGit2, FileText, ChevronRight } from "lucide-react";
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
    <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-12 md:py-24 h-full flex flex-col justify-center min-h-[calc(100vh-140px)]">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-12 items-center h-full">
        
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
              className="w-full flex items-center justify-center gap-2 py-6 text-base shadow-[0_0_20px_rgba(6,182,212,0.2)]"
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
          className="relative h-[400px] lg:h-[500px] hidden md:flex items-center justify-center lg:justify-end"
        >
          <div className="relative w-full max-w-md aspect-square">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-brand-blue/10 blur-[80px] rounded-full pointer-events-none" />
            
            {/* Repository Node */}
            <motion.div
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[20%] left-[10%] z-20"
            >
              <GlassCard className="p-3 pr-8 flex flex-col gap-2 border-brand-cyan/20">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FolderGit2 className="w-4 h-4 text-brand-cyan" /> Repository
                </div>
                <div className="h-1.5 w-16 bg-secondary rounded-full" />
                <div className="h-1.5 w-12 bg-secondary rounded-full" />
              </GlassCard>
            </motion.div>

            {/* Structure Node */}
            <motion.div
              animate={{ y: [5, -5, 5] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute top-[50%] left-[40%] -translate-x-1/2 -translate-y-1/2 z-30"
            >
              <GlassCard className="p-4 flex flex-col gap-3 min-w-[140px] border-brand-blue/20 shadow-xl">
                <div className="flex items-center justify-between text-sm font-semibold text-foreground">
                  Structure
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    <div className="h-1.5 w-16 bg-brand-blue/40 rounded-full" />
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <div className="h-1.5 w-12 bg-brand-cyan/40 rounded-full" />
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <div className="h-1.5 w-14 bg-brand-violet/40 rounded-full" />
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Documentation Node */}
            <motion.div
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
              className="absolute bottom-[20%] right-[10%] z-20"
            >
              <GlassCard className="p-3 pr-8 flex flex-col gap-2 border-brand-violet/20">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <FileText className="w-4 h-4 text-brand-violet" /> Documentation
                </div>
                <div className="h-1.5 w-20 bg-secondary rounded-full mt-1" />
                <div className="h-1.5 w-16 bg-secondary rounded-full" />
                <div className="h-1.5 w-10 bg-secondary rounded-full" />
              </GlassCard>
            </motion.div>

            {/* Connecting Lines */}
            <svg className="absolute inset-0 w-full h-full z-10 pointer-events-none">
              <motion.path
                d="M 120 120 Q 150 200 200 220"
                fill="none"
                stroke="rgba(6,182,212,0.3)"
                strokeWidth="2"
                strokeDasharray="4 4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.5 }}
              />
              <motion.path
                d="M 280 250 Q 330 300 350 350"
                fill="none"
                stroke="rgba(139,92,246,0.3)"
                strokeWidth="2"
                strokeDasharray="4 4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.8 }}
              />
            </svg>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
