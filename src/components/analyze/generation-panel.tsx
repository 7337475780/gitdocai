"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ChevronRight, FileText, Settings, Wand2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { GradientButton, SecondaryButton } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/card";
import { useAnalysisStore } from "@/store/useAnalysisStore";

type GenerationState = 'idle' | 'generating' | 'success' | 'error' | 'missing_analysis';
type Template = 'professional' | 'opensource' | 'api' | 'portfolio' | 'library' | 'minimal';
type Tone = 'professional' | 'concise' | 'technical';

const TEMPLATES: { id: Template, label: string, desc: string }[] = [
  { id: 'professional', label: 'Professional', desc: 'Balanced, clear, and complete for apps' },
  { id: 'opensource', label: 'Open Source', desc: 'Prioritizes contributing and community' },
  { id: 'api', label: 'API Project', desc: 'Focuses on endpoints, setup, and scripts' },
  { id: 'portfolio', label: 'Portfolio', desc: 'Showcases features and tech stack' },
  { id: 'library', label: 'Library / Package', desc: 'Focuses on installation and usage' },
  { id: 'minimal', label: 'Minimal', desc: 'Short and to the point' },
];

const TONES: { id: Tone, label: string }[] = [
  { id: 'professional', label: 'Professional' },
  { id: 'concise', label: 'Concise' },
  { id: 'technical', label: 'Technical' },
];

export function GenerationPanel({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const { result } = useAnalysisStore();
  
  const [state, setState] = React.useState<GenerationState>('idle');
  const [template, setTemplate] = React.useState<Template>('professional');
  const [tone, setTone] = React.useState<Tone>('professional');
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Staged animation state
  const [stage, setStage] = React.useState(0);
  const stages = [
    "Preparing repository context...",
    "Selecting documentation structure...",
    "Writing repository-specific sections...",
    "Validating Markdown...",
    "Checking documentation quality...",
    "Preparing Documentation Studio..."
  ];

  React.useEffect(() => {
    if (state === 'generating') {
      let currentStage = 0;
      const interval = setInterval(() => {
        currentStage++;
        if (currentStage < stages.length) {
          setStage(currentStage);
        }
      }, 800); // Fake progress progression
      return () => clearInterval(interval);
    }
  }, [state]);

  const handleGenerate = async () => {
    if (!result?.analysisId) {
      return;
    }

    setState('generating');
    setStage(0);

    try {
      const response = await fetch('/api/documentation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysisId: result.analysisId,
          template,
          tone
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        if (data?.error?.code === 'REPOSITORY_ANALYSIS_NOT_FOUND') {
          throw new Error('REPOSITORY_ANALYSIS_NOT_FOUND');
        }
        throw new Error(data?.error?.message || 'Failed to generate documentation.');
      }

      // Briefly show success state before navigating
      setState('success');
      
      // Delay slightly for UX so they see the success message
      setTimeout(() => {
        sessionStorage.setItem('currentDocumentId', data.data.id);
        router.push(`/studio/${data.data.id}`);
      }, 1500);

    } catch (err: any) {
      console.error(err);
      if (err.message === 'REPOSITORY_ANALYSIS_NOT_FOUND') {
        setState('missing_analysis');
      } else {
        setErrorMsg(err.message);
        setState('error');
      }
    }
  };

  if (state === 'success') {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="inline-flex p-4 rounded-full bg-brand-teal/20 mb-6">
            <CheckCircle2 className="w-12 h-12 text-brand-teal" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">Documentation is ready.</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Your README has been generated from the repository analysis and is ready to review.
          </p>
          <Loader2 className="w-6 h-6 text-brand-cyan animate-spin mx-auto" />
        </motion.div>
      </div>
    );
  }

  if (state === 'generating') {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 text-center">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
          <div className="inline-flex p-4 rounded-full bg-brand-violet/20 mb-6">
            <Wand2 className="w-12 h-12 text-brand-violet animate-pulse" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">Creating your documentation...</h2>
          <p className="text-muted-foreground text-lg mb-8">
            GitDoc AI is organizing repository evidence into a clear, developer-friendly README.
          </p>
          
          <div className="max-w-md mx-auto text-left space-y-4">
            {stages.map((s, i) => (
              <div key={i} className={`flex items-center gap-3 transition-opacity duration-300 ${i <= stage ? 'opacity-100' : 'opacity-20'}`}>
                {i < stage ? (
                  <CheckCircle2 className="w-5 h-5 text-brand-teal shrink-0" />
                ) : i === stage ? (
                  <Loader2 className="w-5 h-5 text-brand-cyan animate-spin shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-border shrink-0" />
                )}
                <span className={`text-sm ${i === stage ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>{s}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="inline-flex p-4 rounded-full bg-red-500/20 mb-6">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">Documentation could not be generated.</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
            {errorMsg}
          </p>
          <div className="flex items-center justify-center gap-4">
            <SecondaryButton onClick={onCancel}>Return to Analysis</SecondaryButton>
            <GradientButton onClick={handleGenerate}>Retry Generation</GradientButton>
          </div>
        </motion.div>
      </div>
    );
  }

  if (state === 'missing_analysis') {
    return (
      <div className="w-full max-w-2xl mx-auto py-12 text-center">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <div className="inline-flex p-4 rounded-full bg-brand-amber/20 mb-6">
            <AlertCircle className="w-12 h-12 text-brand-amber" />
          </div>
          <h2 className="text-3xl font-bold text-foreground mb-4">This repository analysis is no longer available.</h2>
          <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
            Please analyze the repository again before generating documentation.
          </p>
          <div className="flex items-center justify-center gap-4">
            <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
            <GradientButton onClick={() => {
              const { startAnalysis } = useAnalysisStore.getState();
              onCancel();
              setTimeout(() => {
                startAnalysis();
              }, 100);
            }}>Analyze Again</GradientButton>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Configure Documentation</h2>
          <p className="text-muted-foreground">Select how GitDoc AI should structure and write your README.</p>
        </div>
        <SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand-cyan" />
              Template
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TEMPLATES.map(t => (
                <div 
                  key={t.id}
                  onClick={() => setTemplate(t.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${template === t.id ? 'border-brand-cyan bg-brand-cyan/10' : 'border-border bg-secondary/30 hover:border-border/80'}`}
                >
                  <div className="font-medium text-foreground mb-1">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-brand-violet" />
              Writing Tone
            </h3>
            <div className="flex flex-col gap-3">
              {TONES.map(t => (
                <div 
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`p-3 rounded-md border cursor-pointer transition-all flex items-center gap-3 ${tone === t.id ? 'border-brand-violet bg-brand-violet/10 text-foreground' : 'border-border bg-secondary/30 text-muted-foreground hover:border-border/80'}`}
                >
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${tone === t.id ? 'border-brand-violet' : 'border-muted-foreground'}`}>
                    {tone === t.id && <div className="w-2 h-2 rounded-full bg-brand-violet" />}
                  </div>
                  <span className="text-sm font-medium">{t.label}</span>
                </div>
              ))}
            </div>
          </GlassCard>

            {!result?.analysisId && (
              <div className="flex items-center gap-2 text-brand-amber text-sm mt-4 p-3 rounded-md border border-brand-amber/20 bg-brand-amber/5">
                <AlertCircle className="w-4 h-4" />
                Repository analysis is not ready. Analyze the repository before generating documentation.
              </div>
            )}
            
            <GradientButton 
              onClick={handleGenerate} 
              disabled={!result?.analysisId}
              className="w-full h-12 flex items-center justify-center gap-2 text-lg mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate Documentation
              <ChevronRight className="w-5 h-5" />
            </GradientButton>
        </div>
      </div>
    </motion.div>
  );
}
