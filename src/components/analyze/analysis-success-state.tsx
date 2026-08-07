"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  CheckCircle2, ChevronRight, FolderGit2, FileCode2, Globe, Library, Palette, 
  Server, Package, FileJson, FileText, Settings, PlayCircle
} from "lucide-react";
import { useAnalysisStore } from "@/store/useAnalysisStore";
import { GradientButton, SecondaryButton } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { GenerationPanel } from "./generation-panel";

const IconMap: Record<string, React.FC<any>> = {
  FileCode2,
  Globe,
  Library,
  Palette,
  Server,
  Package,
  FolderGit2,
  FileJson,
  FileText,
  Settings,
  PlayCircle
};

export function AnalysisSuccessState() {
  const { result, reset } = useAnalysisStore();
  const [isConfiguring, setIsConfiguring] = React.useState(false);

  if (!result) return null;

  if (isConfiguring) {
    return (
      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-24">
        <GenerationPanel onCancel={() => setIsConfiguring(false)} />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-24">
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
      >
        <div className="flex-1">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-teal/10 border border-brand-teal/20 text-brand-teal text-xs font-semibold mb-6">
            <CheckCircle2 className="w-3.5 h-3.5" />
            ANALYSIS COMPLETE
            <span className="ml-2 px-1.5 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan text-[10px] uppercase border border-brand-cyan/30">Live repository analysis</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">
            Repository understood.
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            GitDoc AI found the technologies, structure, and documentation signals needed to generate a strong README.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 shrink-0">
          <SecondaryButton onClick={reset} className="h-12 px-6">
            Analyze Another
          </SecondaryButton>
          {result.analysisId && (
            <Link href={`/repository/${result.analysisId}/intelligence`}>
              <SecondaryButton className="h-12 px-6 border-brand-cyan/30 text-brand-cyan hover:bg-brand-cyan/10">
                Documentation Overview
              </SecondaryButton>
            </Link>
          )}
          <GradientButton onClick={() => setIsConfiguring(true)} className="h-12 px-8 flex items-center gap-2 text-base sm:text-lg whitespace-nowrap">
            Generate Documentation
            <ChevronRight className="w-4 h-4" />
          </GradientButton>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (Overview & Signals & Score) */}
        <div className="space-y-6 lg:col-span-1">
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <GlassCard className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Repository Overview</h3>
              <div className="space-y-4">
                <OverviewRow label="Repository" value={`${result.owner}/${result.repositoryName}`} />
                <OverviewRow label="Description" value={result.description || "No description provided"} className="line-clamp-2" />
                <OverviewRow label="Main Branch" value={result.mainBranch} />
                <OverviewRow label="Status" value={result.status} />
              </div>
            </GlassCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <GlassCard className="p-6 border-brand-cyan/20">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-foreground">Documentation Readiness</h3>
                <div className="text-2xl font-bold text-brand-cyan">{result.readinessScore}<span className="text-sm text-muted-foreground font-normal">/100</span></div>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {result.readinessDetails.label}
              </p>
              
              <div className="space-y-4">
                {result.readinessDetails.present.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground uppercase mb-2">Present</h4>
                    <ul className="space-y-2">
                      {result.readinessDetails.present.map((item, i) => (
                        <ReadinessItem key={i} status="present" text={item} />
                      ))}
                    </ul>
                  </div>
                )}
                {result.readinessDetails.recommended.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-foreground uppercase mb-2">Recommended</h4>
                    <ul className="space-y-2">
                      {result.readinessDetails.recommended.map((item, i) => (
                        <ReadinessItem key={i} status="missing" text={item} />
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </GlassCard>
          </motion.div>

        </div>

        {/* Right Column (Stack, Structure, Scripts) */}
        <div className="space-y-6 lg:col-span-2">
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <GlassCard className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Detected Stack</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {result.technologies.length > 0 ? (
                  result.technologies.map(tech => {
                    const Icon = tech.iconName && IconMap[tech.iconName] ? IconMap[tech.iconName] : Code2;
                    return (
                      <div key={tech.name} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30">
                        <div className="p-2 bg-background rounded-md text-brand-cyan">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">{tech.name}</div>
                          <div className="text-xs text-muted-foreground">{tech.category}</div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground col-span-full">No primary technologies detected.</p>
                )}
              </div>
            </GlassCard>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <GlassCard className="p-6 h-full">
                <h3 className="font-semibold text-foreground mb-4">Project Signals</h3>
                <div className="space-y-3">
                  {result.signals.length > 0 ? (
                    result.signals.map((signal, i) => (
                      <div key={i} className="flex flex-col gap-1 py-2 border-b border-border/50 last:border-0">
                        <span className="text-xs text-muted-foreground">{signal.type}</span>
                        <span className="text-sm font-medium text-foreground">{signal.value}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No significant project signals detected.</p>
                  )}
                </div>
              </GlassCard>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <GlassCard className="p-6 h-full">
                <h3 className="font-semibold text-foreground mb-4">Detected Scripts</h3>
                <div className="space-y-2">
                  {result.scripts.length > 0 ? (
                    result.scripts.map(script => (
                      <div key={script.name} className="flex items-center justify-between p-2 rounded-md bg-secondary/50 border border-border">
                        <div className="flex items-center gap-2">
                          <PlayCircle className="w-3.5 h-3.5 text-brand-teal shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate max-w-[100px]">{script.name}</span>
                        </div>
                        <code className="text-[10px] text-muted-foreground font-mono bg-background px-1.5 py-0.5 rounded border border-border truncate max-w-[120px]">
                          {script.command}
                        </code>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No scripts detected.</p>
                  )}
                </div>
              </GlassCard>
            </motion.div>
            
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <GlassCard className="p-6">
              <h3 className="font-semibold text-foreground mb-4">Repository Structure</h3>
              <div className="bg-background rounded-lg border border-border p-4 font-mono text-sm overflow-x-auto max-h-80 overflow-y-auto">
                <div className="flex items-center gap-2 text-foreground mb-2">
                  <FolderGit2 className="w-4 h-4 text-brand-blue" />
                  <span>/</span>
                </div>
                <div className="pl-6 space-y-1.5 border-l border-border ml-2">
                  {result.tree.files.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 text-muted-foreground whitespace-nowrap">
                      {file.type === 'tree' ? (
                        <FolderGit2 className="w-4 h-4 text-brand-blue shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 shrink-0" />
                      )}
                      <span className={file.type === 'tree' ? "text-foreground" : ""}>{file.path}</span>
                    </div>
                  ))}
                  {result.tree.truncated && (
                    <div className="text-xs italic mt-2 opacity-50">... (tree truncated for performance)</div>
                  )}
                </div>
              </div>
            </GlassCard>
          </motion.div>

        </div>
      </div>
    </div>
  );
}

function OverviewRow({ label, value, className }: { label: string, value: string, className?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted-foreground uppercase">{label}</span>
      <span className={cn("text-sm font-medium text-foreground", className)}>{value}</span>
    </div>
  );
}

function ReadinessItem({ status, text }: { status: "present" | "missing", text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm">
      {status === "present" ? (
        <CheckCircle2 className="w-4 h-4 text-brand-teal shrink-0 mt-0.5" />
      ) : (
        <div className="w-4 h-4 rounded-full border border-dashed border-muted-foreground shrink-0 mt-0.5" />
      )}
      <span className={status === "present" ? "text-foreground" : "text-muted-foreground"}>{text}</span>
    </li>
  );
}

function Code2(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}
