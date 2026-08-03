"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { FileText, LayoutDashboard, Sparkles, FolderGit2, CheckCircle2, ChevronDown } from "lucide-react";
import { GlassCard, MetricCard, StatusBadge } from "@/components/ui/card";
import { GradientButton, SecondaryButton } from "@/components/ui/button";

export function ProductPreview() {
  return (
    <section className="py-20 overflow-hidden relative">
      <div className="container mx-auto px-6 mb-12 text-center">
        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
          One workspace. From repository to published documentation.
        </h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Analyze your project, create documentation, improve quality, and publish your README from one focused workspace.
        </p>
      </div>

      <div className="container mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="relative rounded-2xl border border-white/10 bg-background/50 backdrop-blur-xl shadow-2xl overflow-hidden max-w-[1200px] mx-auto"
        >
          {/* Subtle border glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-cyan/20 via-transparent to-brand-violet/20 opacity-20 pointer-events-none" />
          
          {/* Mac window controls */}
          <div className="h-10 border-b border-border bg-card/80 flex items-center px-4 gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
            <div className="ml-4 flex-1 text-center text-xs text-muted-foreground font-medium">
              GitDoc AI Studio
            </div>
          </div>

          <div className="flex h-[600px]">
            {/* Sidebar Mock */}
            <div className="hidden md:flex w-56 flex-col bg-card/40 border-r border-border p-4">
              <div className="flex items-center gap-2 mb-8 px-2">
                <div className="w-6 h-6 rounded bg-gradient-to-br from-brand-cyan to-brand-blue flex items-center justify-center text-[10px] font-bold text-white">
                  G
                </div>
                <span className="font-bold text-sm">GitDoc AI</span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-3 py-2 rounded-md text-muted-foreground text-sm">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-brand-cyan/10 text-brand-cyan text-sm font-medium border border-brand-cyan/20">
                  <FileText className="w-4 h-4" /> Documentation
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md text-muted-foreground text-sm">
                  <Sparkles className="w-4 h-4" /> AI Analyze
                </div>
              </div>
            </div>

            {/* Main Editor Area Mock */}
            <div className="flex-1 flex flex-col bg-background/30 relative">
              {/* Toolbar */}
              <div className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/40">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">nextjs-website / README.md</span>
                  <StatusBadge variant="success">Auto-saved</StatusBadge>
                </div>
                <div className="flex items-center gap-2">
                  <SecondaryButton className="h-8 px-3 text-xs">Download</SecondaryButton>
                  <GradientButton className="h-8 px-3 text-xs flex items-center gap-1">
                    Publish to GitHub <ChevronDown className="w-3 h-3" />
                  </GradientButton>
                </div>
              </div>

              {/* Editor Split View */}
              <div className="flex-1 flex overflow-hidden">
                <div className="w-1/2 border-r border-border p-6 overflow-y-hidden text-sm font-mono text-muted-foreground/80 relative">
                  <div className="absolute top-2 right-4 text-[10px] font-sans px-2 py-1 bg-card rounded text-muted-foreground">Editor</div>
                  <div className="text-brand-cyan"># Next.js - The React Framework</div>
                  <br/>
                  <div className="flex gap-2 mb-4">
                    <span className="text-brand-amber">![Version]</span><span className="text-foreground">(https://img.shields.io/badge/Next.js-v14.2-blue)</span>
                    <span className="text-brand-amber">![License]</span><span className="text-foreground">(https://img.shields.io/badge/License-MIT-green)</span>
                  </div>
                  <div>Next.js is a React framework for building full-stack web applications.</div>
                  <div>It supports Server Components, Static and Dynamic Rendering, API</div>
                  <div>Routes, and more. Built for performance and developer experience.</div>
                  <br/>
                  <div className="text-brand-blue">## ✨ Features</div>
                  <br/>
                  <div>- Server Components</div>
                  <div>- Static & Dynamic Rendering</div>
                  <div>- Built-in API Routes</div>
                  <div>- Image Optimization</div>
                  <div>- Zero-configuration</div>
                </div>
                
                <div className="w-1/2 bg-card/20 p-8 overflow-y-hidden relative">
                  <div className="absolute top-2 right-4 text-[10px] font-sans px-2 py-1 bg-card rounded text-muted-foreground border border-border">Preview</div>
                  <h1 className="text-3xl font-bold mb-4 border-b border-border pb-2 text-foreground">Next.js - The React Framework</h1>
                  <div className="flex gap-2 mb-6">
                    <StatusBadge variant="info">Next.js v14.2</StatusBadge>
                    <StatusBadge variant="success">License: MIT</StatusBadge>
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    Next.js is a React framework for building full-stack web applications. It supports Server Components, Static and Dynamic Rendering, API Routes, and more. Built for performance and developer experience.
                  </p>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-foreground">
                    <Sparkles className="w-5 h-5 text-brand-cyan" /> Features
                  </h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
                    <li>Server Components</li>
                    <li>Static & Dynamic Rendering</li>
                    <li>Built-in API Routes</li>
                    <li>Image Optimization</li>
                    <li>Zero-configuration</li>
                  </ul>
                </div>
              </div>
            </div>
            
            {/* Right Panel: Analysis & Quality */}
            <div className="hidden lg:flex w-72 flex-col bg-card/40 border-l border-border p-4 gap-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Repository Analysis</h3>
              
              <MetricCard
                title="Files Analyzed"
                value="248"
                icon={<FolderGit2 className="w-5 h-5 text-brand-blue" />}
                iconColorClass="bg-brand-blue/10 border-brand-blue/20"
                className="p-4"
              />
              
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Documentation Quality</h3>
                <GlassCard className="p-4 flex flex-col items-center justify-center border-brand-cyan/20">
                  <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-[6px] border-brand-cyan/20 mb-3">
                    <div className="absolute inset-0 rounded-full border-[6px] border-brand-cyan border-l-transparent border-b-transparent transform rotate-45" />
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-white">92</span>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-brand-teal">Excellent</span>
                </GlassCard>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Smart Suggestions</h3>
                <div className="space-y-2">
                  <div className="p-3 bg-secondary/50 rounded-lg border border-border text-xs text-muted-foreground flex gap-2 items-start">
                    <Sparkles className="w-3.5 h-3.5 text-brand-amber shrink-0 mt-0.5" />
                    <span>Add &quot;Environment Variables&quot; section found in <code className="text-foreground">.env.example</code>.</span>
                  </div>
                  <div className="p-3 bg-secondary/50 rounded-lg border border-border text-xs text-muted-foreground flex gap-2 items-start">
                    <Sparkles className="w-3.5 h-3.5 text-brand-cyan shrink-0 mt-0.5" />
                    <span>Expand &quot;Deployment&quot; section with Docker config details.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
