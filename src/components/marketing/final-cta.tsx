"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GradientButton, SecondaryButton } from "@/components/ui/button";

export function FinalCta() {
  return (
    <section className="relative py-32 overflow-hidden border-t border-border/50">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-30 pointer-events-none">
          <motion.div
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1],
            }}
            transition={{ 
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute inset-0 rounded-[40%] bg-gradient-to-r from-brand-cyan via-brand-violet to-brand-teal blur-[100px]"
          />
        </div>
        <div className="absolute inset-0 bg-background/80 backdrop-blur-3xl" />
      </div>

      <div className="container mx-auto px-6 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto flex flex-col items-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-cyan to-brand-blue shadow-[0_0_30px_rgba(6,182,212,0.3)] mb-8">
            <span className="text-2xl font-bold text-white">G</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6 leading-tight">
            Your repository already contains the story.<br className="hidden md:block" />
            Let GitDoc AI document it.
          </h2>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Analyze a public repository and generate professional documentation for free.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
            <Link href="/analyze">
              <GradientButton className="w-full sm:w-auto h-12 text-base px-8">
                Get Started Free
              </GradientButton>
            </Link>
            <Link href="/templates">
              <SecondaryButton className="w-full sm:w-auto h-12 text-base px-8">
                View Templates
              </SecondaryButton>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
