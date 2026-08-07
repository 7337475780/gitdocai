import { Metadata } from "next";
import { AnalyzeExperience } from "@/components/analyze/analyze-experience";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Analyze Repository | GitDoc AI",
  description: "Understand your repository before documenting it.",
};

export default function AnalyzePage() {
  return (
    <div className="flex h-full w-full">
      <Suspense fallback={
        <div className="flex-1 flex flex-col items-center justify-center min-h-[400px]">
          <div className="h-8 w-8 text-brand-cyan animate-spin" />
        </div>
      }>
        <AnalyzeExperience />
      </Suspense>
    </div>
  );
}
