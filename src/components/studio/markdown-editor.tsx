import React, { useRef, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  // We want to override the default OneDark background to blend with our app's background
  const customTheme = EditorView.theme({
    "&": {
      backgroundColor: "transparent !important",
      height: "100%"
    },
    ".cm-scroller": {
      fontFamily: "var(--font-geist-mono), monospace",
      fontSize: "14px",
      lineHeight: "1.6",
    },
    ".cm-gutters": {
      backgroundColor: "transparent !important",
      borderRight: "1px solid hsl(var(--border) / 0.5)",
      color: "hsl(var(--muted-foreground))"
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255, 255, 255, 0.03) !important"
    },
    ".cm-activeLineGutter": {
      backgroundColor: "rgba(255, 255, 255, 0.05) !important",
      color: "hsl(var(--foreground))"
    }
  });

  return (
    <div className="h-full w-full bg-background/30 overflow-hidden">
      <CodeMirror
        value={value}
        height="100%"
        theme={[oneDark, customTheme]}
        extensions={[
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          EditorView.lineWrapping
        ]}
        onChange={onChange}
        className="h-full text-sm custom-scrollbar"
      />
    </div>
  );
}
