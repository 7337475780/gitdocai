"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, CheckCircle2, Code2, FileJson, FileText } from "lucide-react";
import { GradientButton, SecondaryButton } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";

export function HeroSection() {
  return (
    <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-cyan/20 blur-[120px] rounded-full pointer-events-none opacity-50" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center">
          
          {/* Left Column: Text & CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-start text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-amber/10 border border-brand-amber/20 text-brand-amber text-xs font-semibold mb-6">
              <SparklesIcon className="w-3.5 h-3.5" />
              AI-POWERED DOCUMENTATION
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6 leading-tight">
              From repository to <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cyan via-brand-blue to-brand-violet">
                remarkable documentation.
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground mb-8 max-w-xl">
              GitDoc AI understands your GitHub repository, generates polished documentation, and helps you publish it without leaving your workflow.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-8">
              <Link href="/analyze">
                <GradientButton className="w-full sm:w-auto h-12 text-base px-8">
                  Analyze a Repository
                </GradientButton>
              </Link>
              <Link href="#how-it-works">
                <SecondaryButton className="w-full sm:w-auto h-12 text-base px-8 group">
                  See How It Works
                  <ChevronRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </SecondaryButton>
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-teal" /> Free to use
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-teal" /> Public repositories supported
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-brand-teal" /> No credit card required
              </div>
            </div>
          </motion.div>
          
          {/* Right Column: Animated Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative lg:h-[500px] flex items-center justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-md aspect-square">
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
                  d="M 80 120 Q 150 200 200 200"
                  fill="none"
                  stroke="rgba(59,130,246,0.3)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.5, delay: 0.5 }}
                />
                <motion.path
                  d="M 320 200 Q 370 200 420 320"
                  fill="none"
                  stroke="rgba(139,92,246,0.3)"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.5, delay: 0.8 }}
                />
                <motion.circle cx="200" cy="200" r="3" fill="#3b82f6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} />
                <motion.circle cx="320" cy="200" r="3" fill="#8b5cf6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} />
              </svg>

              {/* Orbiting Output Card */}
              <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-[10%] right-[0%] z-30"
              >
                <GlassCard className="p-4 flex flex-col gap-3 min-w-[200px] border-brand-violet/20">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-violet" />
                    <span className="text-sm font-semibold text-foreground">README.md</span>
                  </div>
                  <div className="flex flex-col gap-2">
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
    </section>
  );
}

function SparklesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </svg>
  );
}
