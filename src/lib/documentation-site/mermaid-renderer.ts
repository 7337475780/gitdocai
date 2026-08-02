export const mermaidRenderer = {
  renderDiagram(code: string): { success: boolean; content: string; error?: string } {
    try {
      const sanitized = code.trim();
      
      // Validate basic mermaid keyword presence (graph, sequenceDiagram, classDiagram, stateDiagram, erDiagram, gantt, pie, flowchart)
      const validKeywords = ['graph', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'gantt', 'pie', 'flowchart', 'gitGraph', 'C4Context'];
      const startsWithKeyword = validKeywords.some(kw => sanitized.toLowerCase().startsWith(kw.toLowerCase()));

      if (!startsWithKeyword) {
        return {
          success: false,
          content: '<div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs my-4">This diagram could not be rendered.</div>',
          error: 'Invalid Mermaid diagram syntax.',
        };
      }

      return {
        success: true,
        content: sanitized,
      };
    } catch (e: any) {
      return {
        success: false,
        content: '<div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-400 text-xs my-4">This diagram could not be rendered.</div>',
        error: e?.message || 'Failed to parse Mermaid diagram.',
      };
    }
  }
};
