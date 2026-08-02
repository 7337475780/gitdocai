import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { 
  Check, 
  AlertTriangle, 
  X, 
  ChevronRight, 
  Sparkles, 
  Eye, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import { DocumentationQualityResult, DocumentationQualityIssue } from '@/lib/documentation-quality/quality-types';

interface QualityPanelProps {
  quality: DocumentationQualityResult;
  documentId: string;
  onMarkdownUpdate?: (markdown: string, quality: any) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QualityPanel({ 
  quality, 
  documentId, 
  onMarkdownUpdate, 
  open, 
  onOpenChange 
}: QualityPanelProps) {
  const [dismissedIssues, setDismissedIssues] = useState<Set<string>>(new Set());
  const [generatingIssueId, setGeneratingIssueId] = useState<string | null>(null);
  const [activeProposal, setActiveProposal] = useState<{
    proposalId: string;
    issueId: string;
    targetSection: string | null;
    currentContent: string;
    proposedContent: string;
    explanation: string | null;
  } | null>(null);
  const [applyingProposal, setApplyingProposal] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Map label back to a color
  let scoreColorClass = 'text-brand-teal border-brand-teal/20';
  let badgeBgClass = 'bg-brand-teal/10';
  if (quality.overallScore < 60) {
    scoreColorClass = 'text-red-400 border-red-400/20';
    badgeBgClass = 'bg-red-500/10';
  } else if (quality.overallScore < 75) {
    scoreColorClass = 'text-brand-amber border-brand-amber/20';
    badgeBgClass = 'bg-brand-amber/10';
  } else if (quality.overallScore < 90) {
    scoreColorClass = 'text-brand-cyan border-brand-cyan/20';
    badgeBgClass = 'bg-brand-cyan/10';
  }

  const getCategoryColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-brand-teal';
      case 'good': return 'bg-brand-cyan';
      case 'needs-improvement': return 'bg-brand-amber';
      default: return 'bg-red-400';
    }
  };

  const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const handleGoToSection = (sectionTitle?: string) => {
    if (!sectionTitle) return;
    const id = slugify(sectionTitle);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onOpenChange(false); // Close quality panel
    } else {
      // Try fallback scroll by text content
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      const match = headings.find(h => h.textContent?.toLowerCase().includes(sectionTitle.toLowerCase()));
      if (match) {
        match.scrollIntoView({ behavior: 'smooth', block: 'start' });
        onOpenChange(false);
      }
    }
  };

  const handleDismiss = (issueId: string) => {
    setDismissedIssues(prev => {
      const next = new Set(prev);
      next.add(issueId);
      return next;
    });
  };

  const handleImproveWithAI = async (issue: DocumentationQualityIssue) => {
    setGeneratingIssueId(issue.id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/documentation/${documentId}/quality/improve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueId: issue.id }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveProposal(data.data);
      } else {
        setErrorMsg(data.error?.message || 'Failed to generate suggestion.');
      }
    } catch (e) {
      setErrorMsg('Failed to call suggestion generator.');
    } finally {
      setGeneratingIssueId(null);
    }
  };

  const handleApplyProposal = async () => {
    if (!activeProposal) return;
    setApplyingProposal(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/documentation/${documentId}/quality/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId: activeProposal.proposalId }),
      });
      const data = await res.json();
      if (data.success && onMarkdownUpdate) {
        onMarkdownUpdate(data.data.markdown, data.data.quality);
        setActiveProposal(null); // Reset proposal view
      } else {
        setErrorMsg(data.error?.message || 'Failed to apply suggestion.');
      }
    } catch (e) {
      setErrorMsg('Failed to apply suggestion.');
    } finally {
      setApplyingProposal(false);
    }
  };

  // Filter out dismissed issues
  const visibleIssues = (quality.issues || []).filter(issue => !dismissedIssues.has(issue.id));

  return (
    <>
      <button 
        onClick={() => onOpenChange(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/50 border border-border hover:bg-white/5 transition-colors group cursor-pointer"
        aria-label={`Documentation quality score ${quality.overallScore}. Click to view details.`}
      >
        <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">Quality</span>
        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${scoreColorClass} ${badgeBgClass} transition-all duration-300`}>
          <span className="text-xs font-bold">{quality.overallScore}</span>
          <span className="text-[10px] uppercase tracking-wider opacity-85">{quality.overallScore >= 90 ? 'Excellent' : quality.overallScore >= 75 ? 'Good' : quality.overallScore >= 60 ? 'Fair' : 'Needs work'}</span>
        </div>
      </button>

      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity" />
          <Dialog.Content 
            className="fixed top-0 right-0 z-50 h-full w-full max-w-md border-l border-border bg-card/98 backdrop-blur-md p-6 shadow-2xl flex flex-col focus:outline-none animate-in slide-in-from-right duration-300"
            aria-describedby="quality-panel-desc"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-4">
              <div>
                <Dialog.Title className="text-lg font-semibold text-foreground tracking-tight">
                  Documentation Quality
                </Dialog.Title>
                <div id="quality-panel-desc" className="text-xs text-muted-foreground mt-0.5">
                  Evaluated at {new Date(quality.evaluatedAt).toLocaleTimeString()}
                </div>
              </div>
              <Dialog.Close className="rounded-full p-1.5 opacity-70 hover:opacity-100 hover:bg-secondary transition-all outline-none">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Dialog.Close>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-xs flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p>{errorMsg}</p>
              </div>
            )}

            {/* Content Body */}
            {activeProposal ? (
              /* Single Issue Proposal Detail View */
              <div className="flex-1 flex flex-col min-h-0">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-brand-cyan animate-pulse" />
                  <h3 className="font-semibold text-foreground text-sm">AI Suggestion Preview</h3>
                </div>

                <p className="text-xs text-muted-foreground mb-4">
                  Review the proposed change below. Applying it will modify only this specific section of your README.
                </p>

                <div className="flex-1 min-h-0 flex flex-col gap-4 overflow-y-auto mb-6 pr-1 custom-scrollbar">
                  {/* Current Section Box */}
                  {activeProposal.currentContent && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Current Section Content</span>
                      <pre className="p-3 bg-background/50 border border-border/40 rounded-lg text-xs font-mono text-muted-foreground overflow-x-auto max-h-[160px]">
                        {activeProposal.currentContent}
                      </pre>
                    </div>
                  )}

                  {/* Proposed Section Box */}
                  <div className="space-y-1 flex-1 flex flex-col min-h-0">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-brand-cyan">Proposed Change</span>
                    <pre className="flex-1 p-3 bg-brand-cyan/5 border border-brand-cyan/20 rounded-lg text-xs font-mono text-foreground overflow-y-auto overflow-x-auto min-h-[220px]">
                      {activeProposal.proposedContent}
                    </pre>
                  </div>
                </div>

                {/* Proposal actions */}
                <div className="flex gap-3 pt-3 border-t border-border/50">
                  <button
                    onClick={() => setActiveProposal(null)}
                    disabled={applyingProposal}
                    className="flex-1 py-2 text-sm border border-border hover:bg-secondary text-foreground font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyProposal}
                    disabled={applyingProposal}
                    className="flex-1 py-2 text-sm bg-foreground text-background hover:bg-foreground/90 font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {applyingProposal ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    Apply Change
                  </button>
                </div>
              </div>
            ) : (
              /* Overview Stats and Suggestion List */
              <div className="flex-1 flex flex-col min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                {/* Score Summary Box */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/40 border border-border/60 mb-6">
                  <div className="space-y-1">
                    <div className="text-3xl font-extrabold text-foreground flex items-baseline">
                      {quality.overallScore}
                      <span className="text-sm font-medium text-muted-foreground ml-1">/100</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug pr-4">
                      {quality.summary}
                    </p>
                  </div>
                  <div className={`w-12 h-12 rounded-full border-2 ${scoreColorClass} flex items-center justify-center shrink-0 font-bold text-sm bg-background/50`}>
                    {quality.overallScore}%
                  </div>
                </div>

                {/* Score categories breakdown */}
                <div className="space-y-3 mb-6">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-brand-teal" />
                    Categories Score
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(quality.categories).map(([key, value]: [string, any]) => {
                      const formattedName = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                      return (
                        <div key={key} className="p-2.5 rounded-lg bg-background/30 border border-border/30">
                          <div className="flex justify-between items-center text-xs mb-1.5">
                            <span className="text-muted-foreground truncate pr-1">{formattedName}</span>
                            <span className="text-foreground font-medium shrink-0">{value.score}/{value.maxScore}</span>
                          </div>
                          <div className="h-1 w-full bg-border/40 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${getCategoryColor(value.status)}`} 
                              style={{ width: `${(value.score / value.maxScore) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Strengths list */}
                {quality.strengths && quality.strengths.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Strengths</h4>
                    <div className="space-y-2">
                      {quality.strengths.map((str, idx) => (
                        <div key={idx} className="flex gap-2 text-xs items-start p-2 bg-brand-teal/5 border border-brand-teal/10 rounded-lg">
                          <Check className="w-3.5 h-3.5 text-brand-teal shrink-0 mt-0.5" />
                          <div>
                            <span className="text-foreground font-medium">{str.title}: </span>
                            <span className="text-muted-foreground">{str.description}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Improvements List */}
                <div className="flex-1 flex flex-col min-h-0">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Suggestions ({visibleIssues.length})</h4>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 min-h-[160px]">
                    {visibleIssues.map(issue => {
                      const isGenerating = generatingIssueId === issue.id;

                      let severityColor = 'bg-brand-amber/10 text-brand-amber border-brand-amber/20';
                      if (issue.severity === 'critical') {
                        severityColor = 'bg-red-500/10 text-red-400 border-red-500/20';
                      } else if (issue.severity === 'suggestion') {
                        severityColor = 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20';
                      }

                      return (
                        <div key={issue.id} className="p-3.5 rounded-xl border border-border/70 bg-card/50 flex flex-col gap-3">
                          {/* Title block */}
                          <div className="flex justify-between items-start gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded border ${severityColor}`}>
                                  {issue.severity}
                                </span>
                                <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground/60 px-1 py-0.5">
                                  {issue.category}
                                </span>
                              </div>
                              <h5 className="font-semibold text-foreground text-xs leading-snug">{issue.title}</h5>
                            </div>
                            <button
                              onClick={() => handleDismiss(issue.id)}
                              className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                              title="Dismiss suggestion"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Description */}
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            {issue.description}
                          </p>

                          {/* Suggestion Recommendation */}
                          <div className="p-2.5 bg-background/50 rounded-lg border border-border/30 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Recommended: </span>
                            {issue.recommendation}
                          </div>

                          {/* Action triggers */}
                          <div className="flex gap-2 justify-end pt-1">
                            {issue.targetSection && (
                              <button
                                onClick={() => handleGoToSection(issue.targetSection)}
                                className="px-2.5 py-1 text-[11px] font-medium border border-border hover:bg-secondary text-foreground rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                              >
                                <Eye className="w-3 h-3" />
                                Go to section
                              </button>
                            )}
                            <button
                              onClick={() => handleImproveWithAI(issue)}
                              disabled={isGenerating || generatingIssueId !== null}
                              className="px-2.5 py-1 text-[11px] font-medium bg-brand-cyan/10 hover:bg-brand-cyan/20 border border-brand-cyan/30 text-brand-cyan rounded-md transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                            >
                              {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                              Improve with AI
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {visibleIssues.length === 0 && (
                      <div className="text-center py-8 border border-dashed border-border/50 rounded-xl bg-secondary/40">
                        <CheckCircle2 className="w-8 h-8 text-brand-teal mx-auto mb-2" />
                        <h5 className="font-semibold text-foreground text-xs mb-1">All clear!</h5>
                        <p className="text-[11px] text-muted-foreground px-4">
                          No suggestions remaining. Your README covers all expected repository checks.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
