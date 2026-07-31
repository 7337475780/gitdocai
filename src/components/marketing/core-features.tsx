"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Code2, FileText, Settings, ShieldCheck, Sparkles, GitBranch } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const FEATURES = [
  {
    title: "AI Repository Analysis",
    description: "Understand frameworks, dependencies, scripts, configuration, and project structure.",
    icon: <Code2 className="w-6 h-6" />,
    colorClass: "text-brand-cyan",
    glowClass: "group-hover:shadow-[0_8px_30px_rgba(6,182,212,0.15)] group-hover:border-brand-cyan/40",
  },
  {
    title: "Professional README Generation",
    description: "Generate clear documentation based on the actual repository.",
    icon: <FileText className="w-6 h-6" />,
    colorClass: "text-brand-blue",
    glowClass: "group-hover:shadow-[0_8px_30px_rgba(59,130,246,0.15)] group-hover:border-brand-blue/40",
  },
  {
    title: "Documentation Studio",
    description: "Edit Markdown and preview the result in real time.",
    icon: <Settings className="w-6 h-6" />,
    colorClass: "text-brand-violet",
    glowClass: "group-hover:shadow-[0_8px_30px_rgba(139,92,246,0.15)] group-hover:border-brand-violet/40",
  },
  {
    title: "Documentation Quality",
    description: "Find missing sections and improve documentation completeness.",
    icon: <ShieldCheck className="w-6 h-6" />,
    colorClass: "text-brand-teal",
    glowClass: "group-hover:shadow-[0_8px_30px_rgba(20,184,166,0.15)] group-hover:border-brand-teal/40",
  },
  {
    title: "Smart Suggestions",
    description: "Get useful recommendations based on the repository.",
    icon: <Sparkles className="w-6 h-6" />,
    colorClass: "text-brand-amber",
    glowClass: "group-hover:shadow-[0_8px_30px_rgba(245,158,11,0.15)] group-hover:border-brand-amber/40",
  },
  {
    title: "Publish to GitHub",
    description: "Commit directly or create a Pull Request from GitDoc AI.",
    icon: <GitBranch className="w-6 h-6" />,
    colorClass: "text-pink-500", // Magenta-like
    glowClass: "group-hover:shadow-[0_8px_30px_rgba(236,72,153,0.15)] group-hover:border-pink-500/40",
  },
];

export function CoreFeatures() {
  return (
    <section id="features" className="py-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
            Everything you need to document a project well.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <GlassCard 
                className={cn(
                  "p-8 h-full flex flex-col gap-4 group transition-all duration-300 hover:-translate-y-1",
                  feature.glowClass
                )}
              >
                <div className={cn("mb-2", feature.colorClass)}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {feature.description}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
