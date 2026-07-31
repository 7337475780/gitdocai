"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { GitBranch, GitCommit, GitPullRequest, ChevronDown, Check } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { GradientButton, SecondaryButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function GithubPublishing() {
  const [selectedMethod, setSelectedMethod] = React.useState<"pr" | "commit">("pr");

  return (
    <section id="github" className="py-24 bg-background overflow-hidden relative">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-brand-blue/5 to-transparent pointer-events-none" />
      
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-12 items-center">
          
          {/* Left Side: Text and Options */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-6">
              Documentation is better when it reaches your repository.
            </h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-lg">
              Review your generated README, then publish it directly to GitHub. Commit to a selected branch or create a Pull Request for safer review.
            </p>

            <div className="space-y-4">
              <button 
                onClick={() => setSelectedMethod("commit")}
                className="w-full text-left"
              >
                <GlassCard className={cn(
                  "p-5 transition-all duration-200 border",
                  selectedMethod === "commit" ? "border-brand-blue bg-brand-blue/5 shadow-[0_0_20px_rgba(59,130,246,0.1)]" : "border-border/50 opacity-70 hover:opacity-100"
                )}>
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-2 rounded-md",
                      selectedMethod === "commit" ? "bg-brand-blue/20 text-brand-blue" : "bg-secondary text-muted-foreground"
                    )}>
                      <GitCommit className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        Commit Directly
                        {selectedMethod === "commit" && <Check className="w-4 h-4 text-brand-blue" />}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Update README.md on the selected branch.
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </button>

              <button 
                onClick={() => setSelectedMethod("pr")}
                className="w-full text-left relative"
              >
                <div className="absolute -top-3 right-4 px-2 py-0.5 bg-brand-cyan/20 border border-brand-cyan/30 text-brand-cyan text-[10px] uppercase font-bold rounded shadow-sm z-10">
                  Recommended
                </div>
                <GlassCard className={cn(
                  "p-5 transition-all duration-200 border",
                  selectedMethod === "pr" ? "border-brand-cyan bg-brand-cyan/5 shadow-[0_0_20px_rgba(6,182,212,0.1)]" : "border-border/50 opacity-70 hover:opacity-100"
                )}>
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "p-2 rounded-md",
                      selectedMethod === "pr" ? "bg-brand-cyan/20 text-brand-cyan" : "bg-secondary text-muted-foreground"
                    )}>
                      <GitPullRequest className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        Create a Pull Request
                        {selectedMethod === "pr" && <Check className="w-4 h-4 text-brand-cyan" />}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Create a new branch and open a Pull Request.
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </button>
            </div>
          </motion.div>

          {/* Right Side: Publish Mock UI */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute -inset-1 bg-gradient-to-br from-brand-cyan/30 to-brand-blue/30 rounded-2xl blur-2xl opacity-50 pointer-events-none" />
            <GlassCard className="relative overflow-hidden border border-border/50 shadow-2xl p-0">
              
              <div className="p-4 border-b border-border bg-card/50">
                <h3 className="font-semibold text-foreground text-sm">Publish to GitHub</h3>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Repository</label>
                  <div className="h-10 px-3 bg-secondary/50 border border-border rounded-md flex items-center justify-between text-sm text-foreground">
                    <span className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-muted-foreground" />
                      username/nextjs-website
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Branch</label>
                    <div className="h-10 px-3 bg-secondary/50 border border-border rounded-md flex items-center justify-between text-sm text-foreground cursor-pointer hover:border-brand-blue/50 transition-colors">
                      <span className="flex items-center gap-2">
                        <GitBranch className="w-3.5 h-3.5 text-brand-blue" />
                        {selectedMethod === "pr" ? "docs/update-readme" : "main"}
                      </span>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">File Path</label>
                    <div className="h-10 px-3 bg-secondary/50 border border-border rounded-md flex items-center justify-between text-sm text-foreground">
                      README.md
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Commit Message</label>
                  <textarea 
                    className="w-full h-24 p-3 bg-background border border-border rounded-md text-sm text-foreground resize-none focus:outline-none focus:border-brand-cyan/50 focus:ring-1 focus:ring-brand-cyan/50 transition-all placeholder:text-muted-foreground/50"
                    defaultValue="docs: update README.md via GitDoc AI"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <SecondaryButton>Cancel</SecondaryButton>
                  <GradientButton className="flex items-center gap-2 px-6">
                    {selectedMethod === "pr" ? <GitPullRequest className="w-4 h-4" /> : <GitCommit className="w-4 h-4" />}
                    {selectedMethod === "pr" ? "Create Pull Request" : "Commit to main"}
                  </GradientButton>
                </div>
              </div>
            </GlassCard>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
}
