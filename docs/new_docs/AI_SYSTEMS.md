# CrowByte — AI Systems

## Overview

| System | Transport | Electron | Web | Use case |
|--------|-----------|---------|-----|---------|
| OpenClaw (NVIDIA Cloud) | HTTP → VPS port 19990 | Yes | Yes | Default AI for all features |
| Claude Provider (CLI) | Electron IPC → `claude -p` | Yes | No | Chat page — full Claude with MCP tools |
| Section Agent | OpenClaw internally | Yes | Yes | Inline AI actions on each page |
| VeniceAI | HTTPS → Venice API | Yes | No | Privacy mode (user-provided key) |
| Ollama Hermes | HTTP → local Ollama | Yes | No | Local model support |
| OpenRouter | HTTPS → openrouter.ai | Yes | Yes | Legacy — deprecated, do not use |

---

## 1. OpenClaw — Primary AI Engine

Service: `src/services/openclaw.ts`

### How it works
- Connects to VPS `srv1459982.hstgr.cloud` port 18789 (OpenClaw gateway)
- Requests go through `nvidia-proxy` at port 19990 on the VPS
- nvidia-proxy re-adds `provider/` prefix to model IDs before forwarding to NVIDIA Cloud API
- All providers in `openclaw.json` point to `http://127.0.0.1:19990/v1`

### Usage

```ts
import openClaw from '@/services/openclaw';

// Streaming (standard)
for await (const chunk of openClaw.streamChat(messages, model, 0.7, signal)) {
  output += chunk;
}

// One-shot
const result = await openClaw.chat(messages, model);
```

### Available Models

| Model ID | Name | Best for |
|----------|------|---------|
| `deepseek-ai/deepseek-v3.2` | DeepSeek V3.2 | **Default** — general, analysis, reports |
| `qwen/qwen3-coder-480b-a35b-instruct` | Qwen3 Coder 480B | Code, exploit writing |
| `qwen/qwen3.5-397b-a17b` | Qwen 3.5 397B | Complex reasoning |
| `mistralai/mistral-large-3-675b-instruct-2512` | Mistral Large 675B | Balanced speed/quality |
| `moonshotai/kimi-k2-instruct` | Kimi K2 | Long context, documents |
| `mistralai/devstral-2-123b-instruct-2512` | Devstral 123B | Code, security tasks |
| `z-ai/glm5` | GLM5 | Fast, lightweight |

**BROKEN — do not use**: `nvidia/nemotron-3-super-120b` — returns `content: null`

### System Prompt
`openClaw.streamChat()` auto-prepends a CrowByte AI system prompt. Override by passing a `system` role as first message.

---

## 2. Claude Provider — Chat Page (Electron Only)

Service: `src/services/claude-provider.ts`

### How it works
Electron main process spawns `claude -p --output-format stream-json` as a child process via IPC. Streams JSON events back to UI. Claude Code CLI has full MCP server access (d3bugr, shodan, filesystem, memory-engine).

### Available Claude Models
- `claude-opus-4-6` — Opus 4.6 (most capable)
- `claude-sonnet-4-6` — Sonnet 4.6 (default, balanced)
- `claude-haiku-4-5-20251001` — Haiku 4.5 (fast)

### Web Fallback
Web builds use `web-ai-chat.ts` (OpenClaw-based) instead. Never call `claudeProvider.chat()` without checking `IS_ELECTRON`.

---

## 3. Section Agent — Inline AI

Service: `src/services/section-agent.ts`
Components: `InlineAIMenu`, `SectionAIBar`

### Supported Sections
`findings`, `alerts`, `cves`, `threat-intel`, `fleet`, `sentinel`, `redteam`, `reports`, `missions`, `dashboard`

### Available Actions
`triage`, `remediate`, `link-cve`, `check-fleet`, `draft-report`, `classify`, `correlate`, `summarize`, `explain`, `escalate`

### Usage
```tsx
<InlineAIMenu
  section="findings"
  data={finding as Record<string, unknown>}
/>
```

Uses DeepSeek V3.2 at temperature 0.4 (focused, deterministic).

---

## 4. VeniceAI (Electron + User API Key)

Service: `src/services/veniceai-electron.ts`
Guard: Electron only, requires Venice API key in Settings > Integrations.
Use: Privacy-sensitive AI — Venice doesn't log/train on inputs.

---

## 5. Sentinel AI

Service: `src/services/sentinel-ai.ts`
Connects to CrowByte Sentinel Central on OpenClaw VPS (port 7890, deepseek-ai/deepseek-v3-2).
Used for: alert triage, anomaly correlation, security event analysis.

---

## AI Routing Decision Tree

```
New AI feature?
├── Inline per-row analysis → InlineAIMenu + section-agent.ts
├── Section-level analysis → SectionAIBar + section-agent.ts
├── Custom AI call → openClaw.streamChat()
├── Code/exploit generation → openClaw with qwen3-coder-480b
├── Chat page (full context + MCP) → claudeProvider (Electron) / web-ai-chat (web)
├── Privacy mode → veniceai-electron.ts (Electron + user key)
└── Security monitoring → sentinel-ai.ts
```

---

## Chat Prefill (Cross-Page to Chat)

Send context from any page to Chat:

```ts
localStorage.setItem('cb_chat_prefill', JSON.stringify({
  content: 'Analyze this finding: ...',
  context: { finding: rowData }
}));
window.location.hash = '#/chat';
// Chat.tsx reads cb_chat_prefill on mount and pre-fills the input
```

---

## MCP Servers Available to Claude

| Server | Tools | Notes |
|--------|-------|-------|
| d3bugr | 142 security tools — nmap, nuclei, sqlmap, browser CDP, Stagehand | Railway hosted |
| shodan | IP lookup, CVE search, DNS, device search | Direct Shodan API |
| filesystem | File ops on /home/rainkode | Local |
| memory-engine | Persistent SQLite knowledge DB | localhost:37777 viewer |
| fetch | HTTP requests | Built-in |
| youtube-transcript | Video transcripts | MCP |
| netlify | Deploy management | MCP |

---

## OpenRouter (DEPRECATED)

Was the old free-tier backend via `credits.ts`. Replaced by OpenClaw (NVIDIA). Do not use for new features.

Old pattern (do not copy):
```ts
import { sendCreditChat } from './credits'; // DEPRECATED
```

New pattern:
```ts
import openClaw from './openclaw';
for await (const chunk of openClaw.streamChat(messages)) { ... }
```
