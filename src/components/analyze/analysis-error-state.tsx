"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { AlertCircle, Lock, SearchX, ServerCrash } from "lucide-react";
import { useAnalysisStore, ErrorType } from "@/store/useAnalysisStore";
import { GradientButton, SecondaryButton } from "@/components/ui/button";

export function AnalysisErrorState() {
  const { errorType, errorMessage, reset, startAnalysis } = useAnalysisStore();

  const getErrorContent = (type: ErrorType) => {
    switch (type) {
      case 'invalid_url':
        return {
          icon: <AlertCircle className="w-12 h-12 text-red-500" />,
          title: "Check the repository URL",
          description: "Enter a public GitHub repository URL in the format github.com/owner/repository.",
          action: <SecondaryButton onClick={reset}>Try Again</SecondaryButton>
        };
      case 'not_found':
        return {
          icon: <SearchX className="w-12 h-12 text-brand-amber" />,
          title: "Repository not found",
          description: "We could not find a public repository at this address.",
          action: <SecondaryButton onClick={reset}>Edit URL</SecondaryButton>
        };
      case 'private':
        return {
          icon: <Lock className="w-12 h-12 text-brand-violet" />,
          title: "This repository needs GitHub access",
          description: "Connect GitHub to analyze private repositories.",
          action: (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <GradientButton disabled className="opacity-80 cursor-not-allowed">
                Connect GitHub
              </GradientButton>
              <SecondaryButton onClick={reset}>
                Use a Public Repository Instead
              </SecondaryButton>
            </div>
          )
        };
      case 'rate_limited':
        return {
          icon: <ServerCrash className="w-12 h-12 text-brand-amber" />,
          title: "API Limit Reached",
          description: errorMessage || "GitHub's public API limit has been reached. Please try again shortly.",
          action: <SecondaryButton onClick={reset}>Go Back</SecondaryButton>
        };
      case 'failed':
      default:
        return {
          icon: <ServerCrash className="w-12 h-12 text-red-500" />,
          title: "Analysis could not be completed",
          description: errorMessage || "Something interrupted the repository analysis. Please try again.",
          action: <SecondaryButton onClick={startAnalysis}>Retry Analysis</SecondaryButton>
        };
    }
  };

  const content = getErrorContent(errorType);

  return (
    <div className="flex-1 w-full max-w-2xl mx-auto px-6 py-24 h-full flex flex-col justify-center min-h-[calc(100vh-140px)] text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col items-center"
      >
        <div className="mb-6 p-4 rounded-full bg-secondary/50 border border-border">
          {content.icon}
        </div>
        
        <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">
          {content.title}
        </h2>
        
        <p className="text-lg text-muted-foreground mb-10 max-w-md">
          {content.description}
        </p>
        
        {content.action}
      </motion.div>
    </div>
  );
}
