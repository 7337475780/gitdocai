"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Briefcase, Globe, FileJson, User, Package, Circle } from "lucide-react";
import { GlassCard } from "@/components/ui/card";
import { SecondaryButton } from "@/components/ui/button";

const TEMPLATES = [
  {
    name: "Professional",
    description: "Clean, structured layout for enterprise projects.",
    icon: <Briefcase className="w-5 h-5 text-brand-blue" />,
  },
  {
    name: "Open Source",
    description: "Community-focused with contribution guidelines.",
    icon: <Globe className="w-5 h-5 text-brand-teal" />,
  },
  {
    name: "API Project",
    description: "Endpoint documentation and authentication details.",
    icon: <FileJson className="w-5 h-5 text-brand-amber" />,
  },
  {
    name: "Portfolio",
    description: "Highlight personal projects with screenshots.",
    icon: <User className="w-5 h-5 text-brand-violet" />,
  },
  {
    name: "Library / Package",
    description: "Installation, usage, and API reference.",
    icon: <Package className="w-5 h-5 text-brand-cyan" />,
  },
  {
    name: "Minimal",
    description: "Just the essentials to get started quickly.",
    icon: <Circle className="w-5 h-5 text-muted-foreground" />,
  },
];

export function TemplatesSection() {
  return (
    <section className="py-24 bg-background border-t border-border/50">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-4">
              Documentation that fits your project.
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl">
              Start with a beautifully crafted layout and customize it to match your project&apos;s needs.
            </p>
          </div>
          <Link href="/templates">
            <SecondaryButton className="group h-10 px-6 hidden md:flex items-center">
              Explore All Templates
              <ChevronRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </SecondaryButton>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {TEMPLATES.map((template, i) => (
            <motion.div
              key={template.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <GlassCard className="p-6 h-full flex flex-col group hover:-translate-y-1 transition-all duration-300 hover:border-border hover:shadow-lg">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-secondary/50 border border-border group-hover:bg-secondary transition-colors">
                    {template.icon}
                  </div>
                  <h3 className="font-semibold text-foreground text-lg">
                    {template.name}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mb-6 flex-1">
                  {template.description}
                </p>
                <div className="pt-4 border-t border-border/50 mt-auto">
                  <button className="text-sm font-medium text-brand-cyan hover:text-brand-blue transition-colors flex items-center gap-1 group/btn">
                    Preview <ChevronRight className="w-3 h-3 transition-transform group-hover/btn:translate-x-1" />
                  </button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
        
        {/* Mobile CTA */}
        <Link href="/templates" className="md:hidden block">
          <SecondaryButton className="w-full group h-12 flex items-center justify-center">
            Explore All Templates
            <ChevronRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
          </SecondaryButton>
        </Link>
      </div>
    </section>
  );
}
