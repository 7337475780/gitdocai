import { RepositoryChange } from '../../documentation-freshness/freshness-types';

export interface FreshnessPromptInput {
  documentType: string;
  currentMarkdown: string;
  sections: any[];
  repositoryAnalysis: any;
  reasons: RepositoryChange[];
  targetSections?: string[];
  customInstructions?: string;
}

export function buildFreshnessPrompt(input: FreshnessPromptInput) {
  const isSectionOnly = input.targetSections && input.targetSections.length > 0;

  const systemPrompt = `You are a technical documentation architect updating existing ${input.documentType} documentation based on recent repository changes.

RULES FOR UPDATING DOCUMENTATION:
1. Update ONLY the relevant content matching the detected repository changes.
2. ${isSectionOnly ? `Target sections to update: ${input.targetSections?.join(', ')}. Preserve all other sections exactly.` : 'Preserve existing document structure and unaffected content where accurate.'}
3. PRESERVE user-written custom examples, manual notes, and formatting that remain valid.
4. DO NOT invent non-existent APIs, environment variables, scripts, package dependencies, architecture components, or setup steps.
5. If repository evidence is incomplete or uncertain, state "Needs verification" rather than making assumptions.
6. Output ONLY pure Github-Flavored Markdown. Do NOT include commentary, introductory conversational text, provider names, or explanations outside the markdown body.`;

  const changesFormatted = input.reasons.map(r => `- [${r.importance}] ${r.type}: ${r.summary}`).join('\n');

  const userPrompt = `DOCUMENT TYPE: ${input.documentType}

RECENT REPOSITORY CHANGES:
${changesFormatted || '- General repository refresh'}

${input.customInstructions ? `USER INSTRUCTIONS:\n${input.customInstructions}\n` : ''}

CURRENT DOCUMENT CONTENT:
\`\`\`markdown
${input.currentMarkdown}
\`\`\`

REPOSITORY ANALYSIS DATA:
\`\`\`json
${JSON.stringify({
  summary: input.repositoryAnalysis?.summary || {},
  packageJson: input.repositoryAnalysis?.packageJson || {},
  envVars: input.repositoryAnalysis?.envVars || [],
  apiRoutes: input.repositoryAnalysis?.apiRoutes || [],
}, null, 2)}
\`\`\`

Generate the updated ${input.documentType} markdown documentation now following all system rules.`;

  return { systemPrompt, userPrompt };
}
