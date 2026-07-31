import React, { useState } from 'react';
import { QualityResult } from '@/lib/documentation/quality-analyzer';
import { Check, AlertTriangle, X } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';

interface QualityPanelProps {
  quality: QualityResult;
}

export function QualityPanel({ quality }: QualityPanelProps) {
  const [open, setOpen] = useState(false);

  // Map label back to a color
  let colorClass = 'text-brand-cyan border-brand-cyan/20';
  if (quality.label === 'Moderate') colorClass = 'text-brand-amber border-brand-amber/20';
  if (quality.label === 'Needs Improvement') colorClass = 'text-red-400 border-red-400/20';

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/50 border border-border hover:bg-white/5 transition-colors group">
          <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground">Quality</span>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${colorClass} bg-background`}>
            <span className="text-xs font-bold">{quality.score}</span>
            <span className="text-[10px] uppercase tracking-wider opacity-80">{quality.label}</span>
          </div>
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content 
          className="z-50 w-80 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2"
          sideOffset={8}
        >
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-white">Documentation Quality</h4>
            <div className={`text-xl font-bold ${colorClass.split(' ')[0]}`}>
              {quality.score}<span className="text-sm text-muted-foreground">/100</span>
            </div>
          </div>

          <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
            {quality.suggestions.map((suggestion, i) => {
              let Icon = AlertTriangle;
              let iconColor = 'text-brand-amber';

              return (
                <div key={i} className="flex gap-3 text-sm">
                  <div className={`mt-0.5 flex-shrink-0 ${iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 text-muted-foreground">
                    {suggestion}
                  </div>
                </div>
              );
            })}
            
            {quality.suggestions.length === 0 && (
              <div className="flex gap-3 text-sm">
                <div className={`mt-0.5 flex-shrink-0 text-brand-teal`}>
                  <Check className="h-4 w-4" />
                </div>
                <div className="flex-1 text-muted-foreground">
                  Document looks great! No suggestions.
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-border/50 text-[10px] text-muted-foreground text-center">
            Based on the repository information currently available.
          </div>
          
          <Popover.Arrow className="fill-card" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
