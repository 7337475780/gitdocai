import React, { useRef, useEffect, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { markdown, markdownLanguage } from '@codemirror/lang-markdown';
import { languages } from '@codemirror/language-data';
import { oneDark } from '@codemirror/theme-one-dark';
import { EditorView } from '@codemirror/view';
import { useTheme } from 'next-themes';

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
}

export function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === 'dark';

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
      borderRight: "1px solid var(--border)",
      color: "var(--muted-foreground)"
    },
    ".cm-activeLine": {
      backgroundColor: isDark 
        ? "rgba(255, 255, 255, 0.03) !important"
        : "rgba(0, 0, 0, 0.03) !important"
    },
    ".cm-activeLineGutter": {
      backgroundColor: isDark
        ? "rgba(255, 255, 255, 0.05) !important"
        : "rgba(0, 0, 0, 0.05) !important",
      color: "var(--foreground)"
    }
  });

  if (!mounted) {
    return <div className="h-full w-full bg-background/30" />;
  }

  return (
    <div className="h-full w-full bg-background/30 overflow-hidden">
      <CodeMirror
        value={value}
        height="100%"
        theme={isDark ? oneDark : 'light'}
        extensions={[
          markdown({ base: markdownLanguage, codeLanguages: languages }),
          EditorView.lineWrapping,
          customTheme
        ]}
        onChange={onChange}
        className="h-full text-sm custom-scrollbar"
      />
    </div>
  );
}

