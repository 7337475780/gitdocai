import { DocumentationContext } from '../provider';

export function buildImprovementSystemPrompt(issueTitle: string, recommendation: string, targetSection?: string): string {
  return `You are a meticulous technical documentation writer. Your task is to resolve a specific documentation quality issue in a repository's README.

Issue to address: "${issueTitle}"
Action recommendation: "${recommendation}"
Target Section Title: "${targetSection || 'General Section'}"

CRITICAL RULES:
1. Output ONLY the improved/new Markdown content for this specific section.
2. DO NOT wrap the output in a markdown block code fence (e.g. \`\`\`markdown ... \`\`\`). Only use code fences for nested code snippets.
3. DO NOT include introductory remarks, conversational preambles, explanations, or notes before or after the markdown content.
4. USE ONLY factual information from the repository context.
5. DO NOT invent API endpoints, configuration variables, installation scripts, or features that are not explicitly documented or supported by repository signals.
6. If adding environment variables, use dummy values (e.g., \`<YOUR_API_KEY>\` or \`your-value\`) only when they are standard placeholders.
7. Use proper, clean GitHub-Flavored Markdown. Headings in your response should be level 2 (##) or lower.`;
}

export function buildImprovementUserPrompt(
  context: DocumentationContext,
  issueDescription: string,
  targetSection?: string,
  currentSectionContent?: string
): string {
  return `Please generate the improved content for the section "${targetSection || 'General Section'}" to resolve the following issue:
"${issueDescription}"

Here is the current content of the section (if any):
<current_section_content>
${currentSectionContent || '(This is a new section; it currently has no content.)'}
</current_section_content>

Use the repository context below to generate accurate, helpful, and concise documentation content:
<repository_context>
# REPOSITORY INFO
Name: ${context.repository.name}
Owner: ${context.repository.owner}
Description: ${context.repository.description || 'None provided'}
URL: ${context.repository.url}
Primary Language: ${context.repository.primaryLanguage || 'Unknown'}

# PROJECT CLASSIFICATION
Type: ${context.projectType}
Package Manager: ${context.packageManager}

# DETECTED TECHNOLOGIES
${context.technologies.length > 0 ? context.technologies.map(t => `- ${t.name} (${t.category})`).join('\n') : 'None detected'}

# PACKAGE SCRIPTS
${context.scripts.length > 0 ? context.scripts.map(s => `- ${s.name}: \`${s.command}\``).join('\n') : 'None detected'}

# ENVIRONMENT VARIABLES (.env.example)
${context.environmentVars.length > 0 ? context.environmentVars.map(v => `- ${v}`).join('\n') : 'None detected'}

# SIGNIFICANT PROJECT SIGNALS
${context.signals.length > 0 ? context.signals.map(s => `- ${s.type}: ${s.value}`).join('\n') : 'None'}

# FILE TREE SUMMARY
${context.tree.length > 0 ? context.tree.map(f => `- ${f}`).join('\n') : 'None'}
</repository_context>

Generate ONLY the corrected section markdown now.`;
}
