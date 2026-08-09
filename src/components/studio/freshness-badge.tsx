import React from 'react';
import { DocumentationFreshnessStatus } from '@/lib/documentation-freshness/freshness-types';
import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle, Clock } from 'lucide-react';

interface FreshnessBadgeProps {
  status: DocumentationFreshnessStatus | null;
  impactScore?: number;
  onClick: () => void;
  isLoading?: boolean;
}

export function FreshnessBadge({ status, impactScore, onClick, isLoading }: FreshnessBadgeProps) {
  if (isLoading) {
    return (
      <button 
        disabled
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground opacity-70 cursor-wait whitespace-nowrap shrink-0"
      >
        <span className="h-2 w-2 rounded-full bg-muted-foreground animate-pulse" />
        <span>Checking freshness...</span>
      </button>
    );
  }

  switch (status) {
    case DocumentationFreshnessStatus.UP_TO_DATE:
      return (
        <button
          onClick={onClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors whitespace-nowrap shrink-0"
          title="No relevant repository changes detected since last review"
        >
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
          <span>Up to date</span>
        </button>
      );

    case DocumentationFreshnessStatus.CHANGES_DETECTED:
      return (
        <button
          onClick={onClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-55 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-500/20 hover:bg-cyan-100 dark:hover:bg-cyan-500/20 transition-colors whitespace-nowrap shrink-0"
          title="Repository changes detected; low documentation impact"
        >
          <Clock className="h-3.5 w-3.5 text-cyan-500 dark:text-cyan-400" />
          <span>Changes detected</span>
        </button>
      );

    case DocumentationFreshnessStatus.REVIEW_RECOMMENDED:
      return (
        <button
          onClick={onClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors whitespace-nowrap shrink-0"
          title={`Repository changes may affect documentation (Score: ${impactScore ?? 0})`}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
          <span>Review recommended</span>
          {impactScore !== undefined && impactScore > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-500/20 text-[10px]">
              {impactScore}
            </span>
          )}
        </button>
      );

    case DocumentationFreshnessStatus.OUTDATED:
      return (
        <button
          onClick={onClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors animate-pulse whitespace-nowrap shrink-0"
          title="Repository changes directly conflict with documented information"
        >
          <AlertCircle className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />
          <span>Potentially outdated</span>
        </button>
      );

    case DocumentationFreshnessStatus.UNKNOWN:
    default:
      return (
        <button
          onClick={onClick}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-secondary text-muted-foreground border border-border hover:bg-secondary/80 transition-colors whitespace-nowrap shrink-0"
          title="Could not evaluate freshness against repository state"
        >
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
          <span>Freshness unknown</span>
        </button>
      );
  }
}
