"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  RefreshCw,
  ArrowRight,
  AlertCircle,
  BookOpen,
} from "lucide-react";
import { Button, GradientButton } from "@/components/ui/button";
import { CustomSelect } from "@/components/ui/custom-select";

interface Template {
  id: "professional" | "opensource" | "api" | "library" | "minimal";
  name: string;
  description: string;
  intendedUse: string;
  sections: string[];
}

const TEMPLATES: Template[] = [
  {
    id: "professional",
    name: "Professional README",
    description: "Best for production-grade applications. Comprehensive overview, clear tech stack breakdown, installation, and usage guides.",
    intendedUse: "Production-ready web apps, command-line interfaces, and enterprise tools.",
    sections: ["Project Title", "System Overview", "Key Features", "Technology Stack", "Local Setup & Installation", "Usage Instructions", "License"],
  },
  {
    id: "library",
    name: "Developer Setup Guide",
    description: "Tailored for developer onboarding and configuration. Focuses deeply on prerequisites, setup steps, local testing, and troubleshooting.",
    intendedUse: "Reusable packages, shared libraries, APIs, and multi-developer frameworks.",
    sections: ["Prerequisites", "Step-by-step Setup", "Configuration Options", "Running Unit & Integration Tests", "Troubleshooting Guide"],
  },
  {
    id: "api",
    name: "API Reference Guide",
    description: "Provides structured technical instructions for APIs. Maps out endpoint directories, setup commands, environment configs, and scripts.",
    intendedUse: "REST/GraphQL APIs, backend services, serverless endpoints, and data microservices.",
    sections: ["Environment Setup & Vars", "API Endpoint Definitions", "Request/Response Examples", "Authentication Guide", "Available NPM/CLI Scripts"],
  },
  {
    id: "opensource",
    name: "Contributing Guidelines",
    description: "Best for open-source and community projects. Focuses heavily on codebase contribution policies, PR guidelines, and testing frameworks.",
    intendedUse: "Public GitHub repos, package distribution hubs, and collaborative open-source tools.",
    sections: ["Code of Conduct", "How to File Bug Reports", "Pull Request Lifecycle", "Coding Conventions & Style", "Testing Checklist"],
  },
  {
    id: "minimal",
    name: "Minimal README",
    description: "A fast, straightforward summary of a project. Highlights only the core definition, simple installation, and license.",
    intendedUse: "Utilities, single-file scripts, experimental prototypes, and small modules.",
    sections: ["Quick Start", "Basic Installation", "Simple Usage Examples", "License"],
  },
];

export function TemplatesView() {
  const router = useRouter();

  // State
  const [repositories, setRepositories] = React.useState<Array<{ id: string; name: string; owner: string }>>([]);
  const [selectedRepoId, setSelectedRepoId] = React.useState("");
  const [selectedTemplate, setSelectedTemplate] = React.useState<Template | null>(null);

  // Customization States
  const [title, setTitle] = React.useState("");
  const [includeInstallation, setIncludeInstallation] = React.useState(true);
  const [includeUsage, setIncludeUsage] = React.useState(true);
  const [includeAPI, setIncludeAPI] = React.useState(false);
  const [includeContributing, setIncludeContributing] = React.useState(false);
  const [detailLevel, setDetailLevel] = React.useState<"concise" | "standard" | "detailed">("standard");

  // Loading / Error States
  const [isPageLoading, setIsPageLoading] = React.useState(true);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [generationProgress, setGenerationProgress] = React.useState("");
  const [fallbackStatus, setFallbackStatus] = React.useState("");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Load repositories on mount
  const loadRepositories = React.useCallback(async () => {
    setIsPageLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (json.success && json.data?.repositories) {
        const repos = json.data.repositories.map((r: any) => ({
          id: r.id,
          name: r.repositoryName,
          owner: r.repositoryOwner,
        }));
        setRepositories(repos);
        if (repos.length > 0) {
          setSelectedRepoId(repos[0].id);
        }
      } else {
        setErrorMsg("Failed to retrieve analyzed repositories.");
      }
    } catch {
      setErrorMsg("A network error occurred while loading repositories.");
    } finally {
      setIsPageLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadRepositories();
  }, [loadRepositories]);

  // Set default title when template changes
  React.useEffect(() => {
    if (selectedTemplate) {
      const activeRepo = repositories.find(r => r.id === selectedRepoId);
      const repoName = activeRepo ? activeRepo.name : "Repository";
      setTitle(`${repoName} ${selectedTemplate.name}`);

      // Set logical section defaults
      setIncludeInstallation(selectedTemplate.id !== "opensource");
      setIncludeUsage(selectedTemplate.id !== "opensource");
      setIncludeAPI(selectedTemplate.id === "api");
      setIncludeContributing(selectedTemplate.id === "opensource");
    }
  }, [selectedTemplate, selectedRepoId, repositories]);

  // Handle generation action
  const handleGenerate = async () => {
    if (!selectedRepoId) {
      setErrorMsg("Please select a repository first.");
      return;
    }
    if (!selectedTemplate) {
      setErrorMsg("Please select a template first.");
      return;
    }
    if (!title.trim()) {
      setErrorMsg("Document title is required.");
      return;
    }

    setIsGenerating(true);
    setErrorMsg(null);
    setGenerationProgress("Reading repository analysis context...");
    setFallbackStatus("");

    // Simulate multi-step progress for better UX feedback
    const progressIntervals = [
      { text: "Reading repository analysis context...", delay: 0 },
      { text: "Structuring documentation outline...", delay: 1000 },
      { text: "Executing AI model generation...", delay: 2500 },
      { text: "Evaluating documentation quality...", delay: 5000 },
    ];

    const timeouts = progressIntervals.map(step =>
      setTimeout(() => setGenerationProgress(step.text), step.delay)
    );

    // Fallback status indicator
    const fallbackTimeout = setTimeout(() => {
      setFallbackStatus("AI generation is taking longer than expected. Attempting secondary model fallback...");
    }, 8000);

    try {
      const response = await fetch("/api/documentation/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId: selectedRepoId,
          template: selectedTemplate.id,
          tone: "professional",
          title,
          includeInstallation,
          includeUsage,
          includeAPI,
          includeContributing,
          detailLevel,
        }),
      });

      // Clear timers
      timeouts.forEach(clearTimeout);
      clearTimeout(fallbackTimeout);

      const result = await response.json();

      if (result.success && result.data?.id) {
        setGenerationProgress("Documentation saved successfully! Redirecting...");
        router.push(`/studio/${result.data.id}`);
      } else {
        const msg = result.error?.message || "Failed to generate documentation. Please try again.";
        setErrorMsg(msg);
        setIsGenerating(false);
      }
    } catch {
      timeouts.forEach(clearTimeout);
      clearTimeout(fallbackTimeout);
      setErrorMsg("A connection error occurred during AI generation. Please check your provider settings.");
      setIsGenerating(false);
    }
  };

  if (isPageLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <RefreshCw className="h-8 w-8 text-brand-cyan animate-spin mb-4" />
        <p className="text-sm text-muted-foreground font-medium">Loading templates and repositories...</p>
      </div>
    );
  }

  if (repositories.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="bg-card/30 border border-dashed border-border rounded-2xl p-10 flex flex-col items-center justify-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">No Analyzed Repositories</h3>
          <p className="text-sm text-muted-foreground mb-8 max-w-md">
            Analyze a repository before generating documentation. GitDoc AI needs a repository structure and analysis to build accurate documents.
          </p>
          <GradientButton
            onClick={() => router.push("/analyze")}
            className="h-11"
          >
            Analyze Repository
          </GradientButton>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold leading-7 text-foreground sm:truncate sm:text-3xl tracking-tight">
          Documentation Templates
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select a template classification and customize the generation parameters to spin up real technical docs.
        </p>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 mb-8">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Generation Action Failed</h3>
              <p className="mt-1 text-sm text-muted-foreground">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {/* Selection flow */}
      {!selectedTemplate ? (
        <div className="space-y-8">
          {/* Target Repository Selection */}
          <div className="bg-card/40 border border-border rounded-xl p-5 backdrop-blur-md max-w-xl">
            <label htmlFor="repo-select" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Select Target Repository Analysis
            </label>
            <CustomSelect
              value={selectedRepoId}
              onChange={setSelectedRepoId}
              options={repositories.map((repo) => ({
                value: repo.id,
                label: `${repo.owner}/${repo.name}`,
              }))}
              placeholder="Select Target Repository"
              className="h-11"
            />
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                className="group relative flex flex-col justify-between rounded-xl border border-border bg-card/20 p-6 hover:bg-secondary/20 hover:border-brand-cyan/40 transition-all duration-300"
              >
                <div>
                  <h3 className="text-lg font-bold text-foreground group-hover:text-brand-cyan transition-colors mb-2">
                    {tmpl.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {tmpl.description}
                  </p>

                  <div className="mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-blue block mb-1">
                      Intended Use:
                    </span>
                    <p className="text-xs text-muted-foreground">{tmpl.intendedUse}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand-cyan block mb-1">
                      Expected Sections:
                    </span>
                    <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                      {tmpl.sections.map((sect, i) => (
                        <li key={i}>{sect}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/60">
                  <Button
                    variant="link"
                    onClick={() => setSelectedTemplate(tmpl)}
                    className="p-0 text-brand-cyan group-hover:text-foreground h-auto flex items-center gap-1.5 font-semibold"
                  >
                    Select Template
                    <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Configuration and Generation Panel */
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Customization Controls */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card/40 border border-border rounded-xl p-6 backdrop-blur-md space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-cyan">
                    Configure Template
                  </span>
                  <h3 className="text-xl font-bold text-foreground">{selectedTemplate.name}</h3>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedTemplate(null)}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground h-auto py-1 px-2.5"
                  disabled={isGenerating}
                >
                  Change Template
                </Button>
              </div>

              {/* Title option */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">Document Title</label>
                <input
                  type="text"
                  placeholder="Enter custom document title..."
                  className="h-11 w-full rounded-lg border border-input bg-background/50 px-3 py-2 text-sm text-foreground focus-ring"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isGenerating}
                />
              </div>

              {/* Detail Level */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-foreground">Documentation Detail Level</label>
                <CustomSelect
                  value={detailLevel}
                  onChange={(val) => setDetailLevel(val as any)}
                  options={[
                    { value: "concise", label: "Concise - compact, to-the-point" },
                    { value: "standard", label: "Standard - balanced level of detail" },
                    { value: "detailed", label: "Detailed - in-depth, thorough coverage" },
                  ]}
                  placeholder="Detail Level"
                  className={`h-11 ${isGenerating ? "opacity-50 pointer-events-none" : ""}`}
                />
              </div>

              {/* Toggle Options */}
              <div className="space-y-4 pt-2">
                <label className="block text-sm font-semibold text-foreground">Include Sections</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background/30 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-input text-brand-cyan focus:ring-brand-cyan"
                      checked={includeInstallation}
                      onChange={(e) => setIncludeInstallation(e.target.checked)}
                      disabled={isGenerating}
                    />
                    <div>
                      <span className="text-sm font-semibold text-foreground block">Installation & Setup</span>
                      <span className="text-xs text-muted-foreground">Standard steps for configuring dependencies.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background/30 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-input text-brand-cyan focus:ring-brand-cyan"
                      checked={includeUsage}
                      onChange={(e) => setIncludeUsage(e.target.checked)}
                      disabled={isGenerating}
                    />
                    <div>
                      <span className="text-sm font-semibold text-foreground block">Usage Instructions</span>
                      <span className="text-xs text-muted-foreground">Examples detailing commands and entry points.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background/30 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-input text-brand-cyan focus:ring-brand-cyan"
                      checked={includeAPI}
                      onChange={(e) => setIncludeAPI(e.target.checked)}
                      disabled={isGenerating}
                    />
                    <div>
                      <span className="text-sm font-semibold text-foreground block">API Reference</span>
                      <span className="text-xs text-muted-foreground">Endpoint list and request/response parameters.</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 rounded-lg border border-border bg-background/30 cursor-pointer select-none focus-ring">
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-input text-brand-cyan focus:ring-brand-cyan focus-ring"
                      checked={includeContributing}
                      onChange={(e) => setIncludeContributing(e.target.checked)}
                      disabled={isGenerating}
                    />
                    <div>
                      <span className="text-sm font-semibold text-foreground block">Contributing Guidelines</span>
                      <span className="text-xs text-muted-foreground">Code styling rules, testing setups, and PR processes.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-3 border-t border-border">
                <Button
                  onClick={() => setSelectedTemplate(null)}
                  variant="outline"
                  className="h-11 px-6 font-semibold"
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
                <GradientButton
                  onClick={handleGenerate}
                  className="h-11 px-6 font-semibold"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Generate Documentation
                    </>
                  )}
                </GradientButton>
              </div>
            </div>
          </div>

          {/* Sidebar Info/Progress */}
          <div className="space-y-6">
            {/* Template specs card */}
            <div className="bg-card/20 border border-border rounded-xl p-5">
              <h4 className="text-sm font-bold text-foreground mb-3">Template Specification</h4>
              <div className="space-y-4 text-xs">
                <div>
                  <span className="font-semibold text-muted-foreground block mb-1">Description</span>
                  <p className="text-muted-foreground leading-relaxed">{selectedTemplate.description}</p>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground block mb-1">Logical Sections</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedTemplate.sections.map((sect, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-secondary/50 border border-border text-muted-foreground">
                        {sect}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Generation Progress Indicator */}
            {isGenerating && (
              <div className="bg-card/40 border border-brand-cyan/35 rounded-xl p-5 space-y-4 animate-pulse">
                <div className="flex items-center gap-2 text-brand-cyan">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span className="text-xs font-bold uppercase tracking-wider">AI Generation in Progress</span>
                </div>
                <p className="text-sm text-foreground font-medium">{generationProgress}</p>
                {fallbackStatus && (
                  <p className="text-xs text-brand-amber bg-brand-amber/10 p-2.5 rounded border border-brand-amber/25">
                    {fallbackStatus}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
