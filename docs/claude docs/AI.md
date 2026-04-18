# CrowByte — AI Integration Reference

## Overview

CrowByte has three distinct AI systems. Each has a different purpose and transport:

| System | What it is | Transport | When to use |
|--------|-----------|-----------|-------------|
| **OpenClaw** | NVIDIA cloud models via VPS proxy | HTTP → VPS port 19990 | Section agents, inline AI, any feature needing a fast LLM |
| **Claude Provider** | Actual Claude (you) via Electron IPC | `claude -p --output-format stream-json` | Chat page — Electron only |
| **Web AI Chat** | Lightweight chat fallback for web | OpenClaw → NVIDIA | Chat page — web version |

---

## 1. OpenClaw — Primary AI Engine

### What it is
OpenClaw is the VPS agent swarm. The service in CrowByte connects to it via a local NVIDIA proxy running on the VPS at port 19990.

### How to use it

```ts
import openClaw from '@/services/openclaw';

// Streaming (most common — for UI that shows text as it arrives)
for await (const chunk of openClaw.streamChat(messages, model, temperature, signal)) {
  output += chunk;
  updateUI(chunk);
}

// One-shot (simple, no streaming)
const result = await openClaw.chat(messages, model);
```

### streamChat signature

```ts
streamChat(
  messages: OpenClawMessage[],  // [{role: 'user'|'assistant'|'system', content: string}]
  model?: string,               // defaults to currentModel (deepseek-v3.2)
  temperature?: number,         // default 0.7, use 0.4 for focused tasks
  signal?: AbortSignal          // for cancellation
): AsyncGenerator<string>       // yields string chunks
```

### Available Models

| Model ID | Name | Best for |
|----------|------|---------|
| `deepseek-ai/deepseek-v3.2` | DeepSeek V3.2 | **Default** — general reasoning, analysis, reports |
| `qwen/qwen3-coder-480b-a35b-instruct` | Qwen3 Coder 480B | Code generation, exploit writing |
| `qwen/qwen3.5-397b-a17b` | Qwen 3.5 397B | Complex multi-step reasoning |
| `mistralai/mistral-large-3-675b-instruct-2512` | Mistral Large 675B | Balanced reasoning + speed |
| `moonshotai/kimi-k2-instruct` | Kimi K2 | Long context, document analysis |
| `mistralai/devstral-2-123b-instruct-2512` | Devstral 123B | Code, security tasks |
| `z-ai/glm5` | GLM5 | Fast, lightweight |

**DO NOT USE**: `nemotron-3-super-120b` — returns `content: null` (broken reasoning model)

### VPS Proxy

The NVIDIA API requires full provider-prefixed model IDs like `deepseek-ai/deepseek-v3.2`. OpenClaw strips this prefix internally. The proxy at VPS port 19990 (`nvidia-proxy.service`) re-adds it before forwarding to NVIDIA.

All OpenClaw providers in openclaw.json point to `http://127.0.0.1:19990/v1` (the proxy), NOT directly to NVIDIA.

### Default System Prompt

`openClaw.streamChat()` automatically prepends a `SYSTEM_PROMPT` that identifies the assistant as "CrowByte AI" with cybersecurity context. You can override by providing a system role in your messages array.

### Config (env vars)

```
VITE_OPENCLAW_HOST=srv1459982.hstgr.cloud   # VPS hostname
VITE_NVIDIA_API_KEY=nvapi-...               # NVIDIA API key
VITE_OPENCLAW_GATEWAY_TOKEN=eed1449d0dbe... # Gateway auth token
VITE_OPENCLAW_SSH_PASSWORD=REDACTED_VPS_PASS # VPS SSH password
```

---

## 2. Section Agent — Inline AI Actions

### What it is
Inline AI that analyzes data on each page. Shows action buttons next to rows/items (InlineAIMenu) or as a section-level bar (SectionAIBar).

### Supported Sections

```ts
type SectionId =
  | 'findings'      // Triage, remediate, link CVE
  | 'alerts'        // Classify, correlate, escalate
  | 'cves'          // Explain, check fleet exposure
  | 'threat-intel'  // Summarize, correlate
  | 'fleet'         // Check exposure
  | 'sentinel'      // Triage, correlate
  | 'redteam'       // Draft report
  | 'reports'       // Summarize
  | 'missions'      // Summarize, explain
  | 'dashboard';    // Summarize
```

### Available Actions

```ts
type ActionId =
  | 'triage'       // Assess severity/priority
  | 'remediate'    // Draft remediation steps
  | 'link-cve'     // Find related CVEs
  | 'check-fleet'  // Check if fleet devices are exposed
  | 'draft-report' // Write a report entry
  | 'classify'     // Classify/categorize
  | 'correlate'    // Cross-reference with other data
  | 'summarize'    // Summarize a set of items
  | 'explain'      // Explain what something means
  | 'escalate';    // Recommend escalation path
```

### How to add InlineAIMenu to a page

```tsx
import { InlineAIMenu } from "@/components/InlineAIMenu";

// In your table row:
<InlineAIMenu
  section="findings"                          // SectionId
  data={finding as Record<string, unknown>}   // the row data passed to AI
/>
```

### How the AI call works

`section-agent.ts` → `openClaw.streamChat(messages, 'deepseek-ai/deepseek-v3.2', 0.4, signal)`

Temperature 0.4 (lower = more focused/deterministic for security analysis).

### To add a new section

1. Add to `SectionId` type in `section-agent.ts`
2. Add entry to `SECTION_CONFIGS` object with `persona`, `context`, and `actions[]`
3. Wire `<InlineAIMenu section="your-section" data={...} />` in the page

---

## 3. Claude Provider — Chat Page (Electron Only)

### What it is
The Claude Provider spawns the actual `claude` CLI (`claude -p --output-format stream-json`) via Electron IPC. This is how the Chat page gives you (Claude) full context, tools, and MCP access.

### Transport
Electron main process → `spawn("claude", ["-p", "--output-format", "stream-json"])` → streams JSON events back via IPC.

### Web fallback
On web builds (`IS_WEB = true`), `claudeProvider` returns an error. The web chat page uses `web-ai-chat.ts` (OpenClaw-based) instead.

### Important
**This is Electron-only.** Never call `claudeProvider.chat()` from web-facing code without checking `IS_ELECTRON`. The provider itself guards with `hasElectronAPI()`.

---

## 4. Inline AI — How to Send to Chat

When an AI action produces a result that the user wants to follow up on in Chat, write to localStorage:

```ts
// From any page/action result:
localStorage.setItem('cb_chat_prefill', JSON.stringify({
  content: 'Analyze this finding: ...',
  context: { finding: data }
}));
// Then navigate to chat:
window.location.hash = '#/chat';
```

Chat.tsx reads `cb_chat_prefill` on mount, pre-fills the input, and optionally auto-sends.

**TODO**: This prefill hook is not yet wired in Chat.tsx — needs implementation.

---

## 5. OpenRouter (Legacy — DO NOT USE for new features)

OpenRouter was the old free-tier AI backend. It has been replaced by OpenClaw (NVIDIA). Do not add new features using `credits.ts` or `sendCreditChat`.

Old pattern (DEPRECATED):
```ts
import { sendCreditChat } from './credits';
const res = await sendCreditChat(messages, 'qwen/qwen3.6-plus:free', signal);
```

New pattern (USE THIS):
```ts
import openClaw from './openclaw';
for await (const chunk of openClaw.streamChat(messages, 'deepseek-ai/deepseek-v3.2', 0.4, signal)) {
  ...
}
```

---

## 6. VeniceAI (Electron Only — Privacy Mode)

`veniceai-electron.ts` — privacy-focused AI via Venice.ai API. Electron only (no web). Used optionally when the user has a Venice API key configured in Settings > Integrations. Not a general-purpose backend.

---

## Routing Decision Tree

```
New AI feature needed?
│
├─ Inline analysis / section action?
│   └─ Use section-agent.ts + InlineAIMenu/SectionAIBar
│
├─ Custom chat / one-off AI call?
│   └─ Use openClaw.streamChat() directly
│
├─ Code generation / exploit writing?
│   └─ Use openClaw.streamChat() with model = 'qwen/qwen3-coder-480b-a35b-instruct'
│
├─ Chat page (full context + MCP tools)?
│   ├─ Electron → claudeProvider (that's you, Claude)
│   └─ Web → web-ai-chat.ts (OpenClaw)
│
└─ Privacy-sensitive? (Electron only)
    └─ veniceai-electron.ts (if user has key)
```

---

## Environment Variables Needed

```bash
# .env (all builds)
VITE_OPENCLAW_HOST=srv1459982.hstgr.cloud
VITE_NVIDIA_API_KEY=REDACTED_NVIDIA_KEY
VITE_OPENCLAW_GATEWAY_TOKEN=REDACTED_OPENCLAW_TOKEN
VITE_OPENCLAW_SSH_PASSWORD=REDACTED_VPS_PASS
```
