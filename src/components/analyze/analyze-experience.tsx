"use client";

import * as React from "react";
import { useAnalysisStore } from "@/store/useAnalysisStore";
import { RepositoryInputState } from "@/components/analyze/repository-input-state";
import { AnalysisProgressState } from "@/components/analyze/analysis-progress-state";
import { AnalysisSuccessState } from "@/components/analyze/analysis-success-state";
import { AnalysisErrorState } from "@/components/analyze/analysis-error-state";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";

export function AnalyzeExperience() {
  const { status, setUrl, reset } = useAnalysisStore();
  const searchParams = useSearchParams();
  const urlParam = searchParams.get("url");

  React.useEffect(() => {
    if (urlParam) {
      const currentUrlInStore = useAnalysisStore.getState().url;
      if (currentUrlInStore !== urlParam) {
        reset();
        setUrl(urlParam);
        const timer = setTimeout(() => {
          useAnalysisStore.getState().startAnalysis();
        }, 50);
        return () => clearTimeout(timer);
      }
    }
  }, [urlParam, setUrl, reset]);

  return (
    <div className="flex-1 flex flex-col w-full h-full relative overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        {(status === "idle" || status === "validating") && (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 overflow-y-auto"
          >
            <RepositoryInputState />
          </motion.div>
        )}
        
        {status === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0, scale: 1.02, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.98, filter: "blur(4px)" }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 overflow-y-auto"
          >
            <AnalysisProgressState />
          </motion.div>
        )}

        {status === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 1.02, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 overflow-y-auto"
          >
            <AnalysisSuccessState />
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="absolute inset-0 overflow-y-auto"
          >
            <AnalysisErrorState />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
