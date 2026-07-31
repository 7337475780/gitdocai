# GitDoc AI

GitDoc AI is an intelligent documentation generation studio that turns any public GitHub repository into a polished, professional README.

## Features

- **Live Repository Analysis**: Detects package managers, frameworks, technologies, and scripts directly from public GitHub repositories.
- **AI Documentation Engine**: Converts raw project signals into beautiful, strictly factual README files using OpenAI.
- **Documentation Studio**: (Coming in Phase 6) A full Markdown editor to refine and publish generated documentation.

## Phase 5 Features

- **AI Provider Abstraction**: Supports swapping LLMs easily. Includes `OpenRouterProvider` and `MockProvider`.
- **Markdown Validation**: Cleans up malformed code blocks and checks heading structure.
- **Section Parsing**: Slices generated Markdown into discrete, editable sections.
- **Quality Pre-check**: Scores the generated document based on critical developer documentation signals (e.g. Installation, Usage, License).

## Configuration

Duplicate `.env.example` to `.env` and fill in the values:

```env
# GitHub Configuration
# Generate a classic token at https://github.com/settings/tokens to increase rate limits to 5000/hr.
GITHUB_TOKEN=ghp_your_token_here

# AI Provider Configuration
# Required for documentation generation. Use 'mock' for local development without an API key.
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-v1-your_key_here
OPENROUTER_MODEL=google/gemini-2.5-flash
```

### Multi-Provider Fallback Architecture

GitDoc AI features a highly reliable, server-side multi-provider AI architecture to ensure continuous documentation generation even when utilizing free-tier AI APIs which are subject to rate limits and quotas.

We currently support the following AI Providers (all configured via `.env.example`):
1. **Google Gemini** (Native API)
2. **OpenRouter** (OpenAI-compatible)
3. **Groq** (OpenAI-compatible)
4. **Cerebras** (OpenAI-compatible)
5. **Hugging Face** (OpenAI-compatible Inference API)

**How Fallback Works:**
1. **Model-Level Fallback**: If a primary model fails with a retryable error (e.g., HTTP 429 Rate Limit, HTTP 500), GitDoc AI automatically retries using the next configured model *for the same provider*.
2. **Provider-Level Fallback**: If all configured models for a provider fail, the orchestrator seamlessly falls back to the next configured *provider* in the `AI_PROVIDER_ORDER`.
3. **Configuration**: The exact order of fallback is controlled by `AI_PROVIDER_ORDER` in your environment.
4. **Resiliency**: Hard failures (like HTTP 401 Invalid API Key) instantly skip the offending provider without wasting attempt cycles. Timeouts (`AI_REQUEST_TIMEOUT_MS`) and max retry limits (`AI_MAX_TOTAL_ATTEMPTS`) ensure bounding.

> **Note on Free Tiers**: Provider availability and free model availability may change. Free API tiers have rate limits and quotas. It is recommended to configure at least two providers (e.g. `gemini,groq`) to guarantee high availability.

#### Security
- **Server-Side Only**: All API calls are executed strictly on the server. API keys are never exposed to the browser.
- **Prompt Isolation**: Repository content is forcefully treated as untrusted reference data, mitigating malicious instructions injected within repository code.

---

### Local Mock Mode

If you set `AI_PROVIDER=mock`, the application will automatically fall back to the `MockProvider`. This is useful for rapid frontend development and deterministic testing without incurring API costs. If `AI_PROVIDER=openrouter` but the key is missing, the application will correctly throw an error.

## Security Considerations

- **Server-side only**: All AI requests and GitHub requests happen securely on the Next.js server. `OPENAI_API_KEY` and `GITHUB_TOKEN` are never exposed to the browser.
- **Strict Prompting**: The AI is strictly instructed NOT to hallucinate APIs, features, or commands. It relies purely on the analysis evidence provided by the repository.
- **Safe Rendering**: All Markdown is treated as untrusted and is validated before being stored.

## Known Limitations (Phase 5)

- Private repositories are not currently supported.
- The `studio` route is currently a placeholder; full editing capabilities will be introduced in Phase 6.
- In-memory storage is used for temporary documents. Restarting the dev server will clear generated READMEs.

## Development

```bash
npm install
npm run dev
```
