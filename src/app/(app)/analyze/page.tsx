import { Metadata } from "next";
import { AnalyzeExperience } from "@/components/analyze/analyze-experience";

export const metadata: Metadata = {
  title: "Analyze Repository | GitDoc AI",
  description: "Understand your repository before documenting it.",
};

export default function AnalyzePage() {
  return (
    <div className="flex h-full w-full">
      <AnalyzeExperience />
    </div>
  );
}
