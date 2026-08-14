"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, FileCode2, SearchCode, FolderGit2 } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const STEPS = [
  "Connecting to GitHub",
  "Reading repository metadata",
  "Inspecting project structure",
  "Detecting languages and frameworks",
  "Analyzing dependencies and scripts",
  "Identifying documentation requirements",
  "Preparing your documentation workspace"
];

export function AnalysisProgressState() {
  const [currentStep, setCurrentStep] = React.useState(0);

  React.useEffect(() => {
    // 5500ms total analysis time in store, 7 steps
    // Approximately 750ms per step
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < STEPS.length - 1) return prev + 1;
        clearInterval(interval);
        return prev;
      });
    }, 750);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 md:py-24 h-full flex flex-col justify-center min-h-[calc(100vh-140px)]">

      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">
          Analyzing repository…
        </h2>
        <p className="text-lg text-muted-foreground">
          GitDoc AI is understanding your project structure and documentation needs.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

        {/* Left Column: Progress List */}
        <GlassCard className="p-8 border-brand-cyan/20 bg-card/60 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-cyan/5 to-brand-violet/5 pointer-events-none" />
          <div className="space-y-6 relative z-10">
            {STEPS.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const isPending = index > currentStep;

              return (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={cn(
                    "flex items-center gap-4 transition-colors duration-300",
                    isPending ? "opacity-40" : "opacity-100"
                  )}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center shrink-0",
                    isActive ? "bg-brand-cyan/20 text-brand-cyan shadow-[0_0_10px_rgba(6,182,212,0.5)]" :
                      isCompleted ? "bg-brand-teal/20 text-brand-teal" :
                        "bg-secondary text-muted-foreground"
                  )}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isActive ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-current" />
                    )}
                  </div>
                  <span className={cn(
                    "font-medium text-sm md:text-base",
                    isActive ? "text-foreground" :
                      isCompleted ? "text-muted-foreground" :
                        "text-muted-foreground"
                  )}>
                    {step}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </GlassCard>

        {/* Right Column: Dynamic Visual */}
        <div className="hidden md:flex flex-col items-center justify-center h-full relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-brand-violet/10 blur-[60px] rounded-full pointer-events-none" />

          <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">

            <motion.div
              animate={{
                scale: [1, 1.05, 1],
                boxShadow: ["0 0 20px rgba(139,92,246,0.2)", "0 0 40px rgba(139,92,246,0.4)", "0 0 20px rgba(139,92,246,0.2)"]
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="w-20 h-20 bg-card rounded-2xl border border-brand-violet/30 flex items-center justify-center z-20 backdrop-blur-xl"
            >
              <SearchCode className="w-10 h-10 text-brand-violet" />
            </motion.div>

            {/* Orbiting files */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 z-10"
            >
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card border border-brand-cyan/20 p-2 rounded-lg text-brand-cyan shadow-lg">
                <FileCode2 className="w-5 h-5" />
              </div>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card border border-brand-blue/20 p-2 rounded-lg text-brand-blue shadow-lg">
                <FolderGit2 className="w-5 h-5" />
              </div>
            </motion.div>

          </div>
        </div>
      </div>
    </div>
  );
}
