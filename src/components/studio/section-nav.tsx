import React from 'react';
import { DocumentSection } from '@/lib/documentation/section-parser';
import { ChevronRight, RefreshCw, FileText } from 'lucide-react';

interface SectionNavProps {
  sections: DocumentSection[];
  activeSectionId: string | null;
  onSectionClick: (id: string) => void;
  onRegenerateSection: (id: string) => void;
  metadata: {
    wordCount: number;
    characterCount: number;
  };
}

export function SectionNav({
  sections,
  activeSectionId,
  onSectionClick,
  onRegenerateSection,
  metadata
}: SectionNavProps) {
  return (
    <div className="flex h-full flex-col bg-background/50 border-r border-border">
      <div className="p-4 border-b border-border/50">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-cyan" />
          Document Outline
        </h3>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        <div className="space-y-0.5">
          {sections.map((section) => (
            <div
              key={section.id}
              className={`group flex items-center justify-between rounded-md px-2 py-1.5 cursor-pointer text-sm transition-colors ${
                activeSectionId === section.id
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              }`}
              onClick={() => onSectionClick(section.id)}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                {/* Indent based on level */}
                {section.level > 1 && (
                  <span className="inline-block" style={{ width: `${(section.level - 1) * 12}px` }} />
                )}
                {activeSectionId === section.id && <ChevronRight className="h-3 w-3 flex-shrink-0 text-brand-cyan" />}
                <span className="truncate">{section.title}</span>
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRegenerateSection(section.id);
                }}
                className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded ${activeSectionId === section.id ? 'opacity-100 text-brand-cyan' : 'text-muted-foreground'}`}
                title="Regenerate this section"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-border/50 text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Sections</span>
          <span className="font-medium text-foreground">{sections.length}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span>Words</span>
          <span className="font-medium text-foreground">{metadata.wordCount.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span>Characters</span>
          <span className="font-medium text-foreground">{metadata.characterCount.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
