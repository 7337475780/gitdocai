"use client";

import * as React from "react";
import { motion } from "framer-motion";

const STEPS = [
  {
    step: "1",
    title: "Connect Repository",
    description: "Paste a public GitHub repository URL.",
  },
  {
    step: "2",
    title: "Analyze Project",
    description: "GitDoc AI detects your stack, scripts, structure, and important files.",
  },
  {
    step: "3",
    title: "Generate Documentation",
    description: "Create a professional README tailored to your project.",
  },
  {
    step: "4",
    title: "Review and Publish",
    description: "Edit, preview, download, commit, or create a Pull Request.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-background border-y border-border/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">
            How It Works
          </h2>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-8 left-12 right-12 h-[1px] bg-border z-0" />

          {STEPS.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative z-10 flex flex-col items-center md:items-start text-center md:text-left"
            >
              <div className="w-16 h-16 rounded-full bg-card border border-border flex items-center justify-center text-xl font-bold text-brand-cyan mb-6 shadow-sm">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
