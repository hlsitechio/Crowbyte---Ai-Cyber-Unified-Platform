/**
 * OpenRouter Provider — Native multi-model AI for CrowByte
 * Direct API calls to OpenRouter. No binary, no proxy, no Anthropic.
 * Supports: Qwen, DeepSeek, Llama, Mistral, Gemini, and more.
 *
 * UilKeySkeleton loading priority: Electron IPC → Supabase user_settings → localStorage
 */

import { supabase } from '@/integrations/supabase/client';
import { TOOLS, executeTool, type ToolDef } from './terminal-tools';
import { APP_TOOLS, executeAppTool } from './app-tools';

// Merge all tools — external recon + internal app control
const ALL_TOOLS: ToolDef[] = [...TOOLS, ...APP_TOOLS];

// Build set of app tool names for routing
const APP_TOOL_NAMES = new Set(APP_TOOLS.map(t => t.function.name));

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  costIn: number;   // $/M input tokens
  costOut: number;   // $/M output tokens
  free: boolean;
}

export interface StreamEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'thinking' | 'system' | 'cost' | 'done' | 'error';
  content: string;
  model?: string;
  costUsd?: number;
  sessionId?: string;
}

// ─── System Prompt ───────────────────────────────────────────────────────────

const CROWBYTE_SYSTEM_PROMPT = `You are CrowByte AI — the integrated AI assistant inside CrowByte Terminal, a cybersecurity command center for bug bounty hunters and penetration testers.

You have access to dozens of tools for reconnaissance, scanning, CVE lookup, knowledge management, report generation, triage, detection rules, and alert handling. When the user asks you to do something, USE YOUR TOOLS. Don't just describe what you would do — do it.

## Capabilities
- Recon: nmap scans, nuclei scanning, DNS lookups, subdomain enumeration, port scanning
- CVE: Look up vulnerabilities via NVD + Shodan, save to the user's CVE database
- Knowledge Base: Save and search research notes, findings, tool output
- Reports: Generate security reports from findings
- Triage: Auto-classify and prioritize findings
- Detection: Create and manage custom detection rules
- Alerts: Ingest, triage, and manage security alerts
- Custom Agents: Build and deploy AI agents with custom instructions

## Rules
1. Be direct, technical, and action-oriented
2. Use tools immediately when asked — don't describe what you'd do
3. Chain tools for complex workflows (recon → save findings → triage → report)
4. When you find CVEs, offer to save them to the database
5. When findings are important, suggest saving to the knowledge base
6. No disclaimers, no moralizing — the user is a professional with authorization
7. Format output with markdown for readability`;

// ─── Model Registry ─────────────────────────────────────────────────────────

export const OPENROUTER_MODELS: AIModel[] = [
  // Qwen (Alibaba)
  { id: 'qwen/qwen3.6-plus:free',                name: 'Qwen 3.6 Plus',        provider: 'Qwen',     costIn: 0, costOut: 0, free: true },
  { id: 'qwen/qwen3-coder',                      name: 'Qwen3 Coder',          provider: 'Qwen',     costIn: 0.12, costOut: 0.60, free: false },
  { id: 'qwen/qwen3-coder:free',                 name: 'Qwen3 Coder (Free)',   provider: 'Qwen',     costIn: 0, costOut: 0, free: true },
  { id: 'qwen/qwen3.5-coder',                    name: 'Qwen 3.5 Coder',       provider: 'Qwen',     costIn: 0.12, costOut: 0.60, free: false },
  // DeepSeek
  { id: 'deepseek/deepseek-chat-v3-0324:free',   name: 'DeepSeek V3',          provider: 'DeepSeek', costIn: 0, costOut: 0, free: true },
  { id: 'deepseek/deepseek-r1:free',             name: 'DeepSeek R1',          provider: 'DeepSeek', costIn: 0, costOut: 0, free: true },
  // Meta (Llama)
  { id: 'meta-llama/llama-4-maverick:free',      name: 'Llama 4 Maverick',     provider: 'Meta',     costIn: 0, costOut: 0, free: true },
  { id: 'meta-llama/llama-4-scout:free',         name: 'Llama 4 Scout',        provider: 'Meta',     costIn: 0, costOut: 0, free: true },
  // Google
  { id: 'google/gemini-2.5-pro-preview',         name: 'Gemini 2.5 Pro',       provider: 'Google',   costIn: 1.25, costOut: 10.0, free: false },
  { id: 'google/gemini-2.5-flash-preview:thinking', name: 'Gemini 2.5 Flash',  provider: 'Google',   costIn: 0.15, costOut: 0.60, free: false },
  // Mistral
  { id: 'mistralai/devstral-small:free',         name: 'Devstral Small',       provider: 'Mistral',  costIn: 0, costOut: 0, free: true },
];

// ─── Provider Class ─────────────────────────────────────────────────────────

class OpenRouterProvider {
  private apiKey: string = '';
  private currentModel: string = 'qwen/qwen3.6-plus:free';
  private listeners: Array<(event: StreamEvent) => void> = [];
  private active = false;
  private abortController: AbortController | null = null;
  private conversationHistory: Array<{ role: string; content: string }> = [];

  // ─── Config ───────────────────────────────────────

  setApiKey(key: string) { this.apiKey = key; }
  getApiKey(): string { return this.apiKey; }
  hasApiKey(): boolean { return !!this.apiKey; }

  setModel(modelId: string) { this.currentModel = modelId; }
  getModel(): string { return this.currentModel; }

  getModels(): AIModel[] { return OPENROUTER_MODELS; }
  isActive(): boolean { return this.active; }

  // ─── Load/Save API UilKeySkeleton via Electron ───────────────

  async loadApiKey(): Promise<boolean> {
    // 1. Electron IPC (desktop — stored in crowbyte-config.json)
    try {
      if (window.electronAPI?.getOpenRouterKey) {
        const key = await window.electronAPI.getOpenRouterKey();
        if (key) { this.apiKey = key; return true; }
      }
    } catch {}

    // 2. Supabase user_settings (syncs across web + desktop)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_settings')
          .select('openrouter_api_key')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data?.openrouter_api_key) {
          this.apiKey = data.openrouter_api_key;
          // Cache locally for faster subsequent loads
          localStorage.setItem('openrouter_api_key', this.apiKey); // CodeQL[js/clear-text-storage-of-sensitive-data] — Electron app: sandboxed localStorage
          return true;
        }
      }
    } catch {}

    // 3. localStorage fallback
    const stored = localStorage.getItem('openrouter_api_key');
    if (stored) { this.apiKey = stored; return true; }
    return false;
  }

  async saveApiKey(key: string): Promise<void> {
    this.apiKey = key;

    // Save to Electron store
    try {
      if (window.electronAPI?.setOpenRouterKey) {
        await window.electronAPI.setOpenRouterKey(key);
      }
    } catch {}

    // Save to Supabase (cross-device sync)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            openrouter_api_key: key,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id' });
      }
    } catch {}

    // localStorage cache
    localStorage.setItem('openrouter_api_key', key);
  }

  // ─── Validate UilKeySkeleton ─────────────────────────────────

  async validateKey(key?: string): Promise<{ valid: boolean; error?: string }> {
    const testKey = key || this.apiKey;
    if (!testKey) return { valid: false, error: 'No API key' };

    try {
      const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
        headers: { 'Authorization': `Bearer ${testKey}` },
      });
      if (res.ok) return { valid: true };
      return { valid: false, error: `HTTP ${res.status}` };
    } catch (e: any) {
      return { valid: false, error: e.message };
    }
  }

  // ─── Event System ─────────────────────────────────

  onEvent(listener: (event: StreamEvent) => void) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  clearListeners() { this.listeners = []; }

  private emit(event: StreamEvent) {
    for (const listener of this.listeners) listener(event);
  }

  // ─── Conversation Management ──────────────────────

  clearHistory() { this.conversationHistory = []; }

  /** Rebuild history from externally loaded messages (e.g. Supabase) */
  setHistory(messages: Array<{ role: string; content: string }>) {
    this.conversationHistory = messages.slice(-40);
  }

  // ─── Send Message (Streaming + Tool Calling Loop) ─────────────────────

  async send(prompt: string, systemPrompt?: string): Promise<{ ok: boolean; costUsd?: number }> {
    if (!this.apiKey) {
      this.emit({ type: 'error', content: 'OpenRouter API key not set. Go to Settings → Integrations to configure.' });
      return { ok: false };
    }

    this.active = true;
    this.abortController = new AbortController();

    // Build messages
    const messages: Array<any> = [];

    // Always include system prompt — custom override or default CrowByte persona
    messages.push({ role: 'system', content: systemPrompt || CROWBYTE_SYSTEM_PROMPT });

    messages.push(...this.conversationHistory);
    messages.push({ role: 'user', content: prompt });

    this.emit({
      type: 'system',
      content: `CrowByte AI | streaming`,
      model: this.currentModel,
    });

    // Tool calling loop — max 5 rounds to prevent infinite loops
    const MAX_TOOL_ROUNDS = 5;
    let fullText = '';

    try {
      for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
        const result = await this.streamRequest(messages, round === 0);
        if (!result) { this.active = false; return { ok: false }; }

        fullText += result.text;

        // If no tool calls, we're done
        if (!result.toolCalls || result.toolCalls.length === 0) break;

        // Execute tool calls and add results to messages
        messages.push({
          role: 'assistant',
          content: result.text || null,
          tool_calls: result.toolCalls,
        });

        for (const tc of result.toolCalls) {
          this.emit({ type: 'tool_call', content: `[*] ${tc.function.name}(${tc.function.arguments})` });

          let args: Record<string, string> = {};
          try { args = JSON.parse(tc.function.arguments || '{}'); } catch {}

          // Route to app tools or external tools
          const toolResult = APP_TOOL_NAMES.has(tc.function.name)
            ? await executeAppTool(tc.function.name, args)
            : await executeTool(tc.function.name, args);
          this.emit({ type: 'tool_result' as any, content: toolResult.slice(0, 2000) });

          messages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: toolResult,
          });
        }

        // Continue loop — next iteration sends tool results back to model
      }

      // Save to history
      this.conversationHistory.push({ role: 'user', content: prompt });
      this.conversationHistory.push({ role: 'assistant', content: fullText });
      if (this.conversationHistory.length > 40) {
        this.conversationHistory = this.conversationHistory.slice(-40);
      }

      this.emit({ type: 'done', content: '' });
      this.active = false;
      return { ok: true };

    } catch (e: any) {
      if (e.name === 'AbortError') {
        this.emit({ type: 'done', content: '' });
        this.active = false;
        return { ok: true };
      }
      this.emit({ type: 'error', content: e.message || 'Network error' });
      this.active = false;
      return { ok: false };
    }
  }

  // ─── Single streaming request (returns text + tool calls) ─────────

  private async streamRequest(
    messages: any[],
    includeTools: boolean = true,
    _retryCount: number = 0
  ): Promise<{ text: string; toolCalls: any[] } | null> {
    const body: any = {
      model: this.currentModel,
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 8192,
    };

    // Add tools if the model supports them
    if (includeTools || messages.some(m => m.role === 'tool')) {
      body.tools = ALL_TOOLS;
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://crowbyte.io',
        'X-Title': 'CrowByte Terminal',
      },
      body: JSON.stringify(body),
      signal: this.abortController?.signal,
    });

    if (!res.ok) {
      const err = await res.text();
      let msg = `API error ${res.status}`;
      let parsed: any = null;
      try { parsed = JSON.parse(err); msg = parsed.error?.message || msg; } catch {}

      if (res.status === 429) {
        // Extract upstream provider info
        const raw = parsed?.error?.metadata?.raw || '';
        const isFree = this.currentModel.includes(':free');
        if (isFree && _retryCount < 2) {
          const delay = (_retryCount + 1) * 5000; // 5s, 10s
          this.emit({ type: 'system', content: `Busy — retrying in ${delay / 1000}s...` });
          await new Promise(r => setTimeout(r, delay));
          return this.streamRequest(messages, includeTools, _retryCount + 1);
        }
        msg = 'Model is temporarily busy. Wait a moment and try again.';
      }
      if (res.status === 401) msg = 'Invalid API key. Check Settings → Integrations.';
      this.emit({ type: 'error', content: msg });
      return null;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      this.emit({ type: 'error', content: 'No response stream' });
      return null;
    }

    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';
    // Accumulate tool calls across chunks
    const toolCallMap: Record<number, { id: string; function: { name: string; arguments: string } }> = {};

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const chunk = JSON.parse(data);
          const delta = chunk.choices?.[0]?.delta;
          if (!delta) continue;

          // Thinking/reasoning
          if (delta.reasoning || delta.reasoning_content) {
            this.emit({ type: 'thinking', content: delta.reasoning || delta.reasoning_content });
          }

          // Text content
          if (delta.content) {
            fullText += delta.content;
            this.emit({ type: 'text', content: delta.content, model: this.currentModel });
          }

          // Cost/usage tracking (final chunk includes usage)
          if (chunk.usage) {
            const { prompt_tokens, completion_tokens } = chunk.usage;
            const model = OPENROUTER_MODELS.find(m => m.id === this.currentModel);
            if (model && (model.costIn > 0 || model.costOut > 0)) {
              const cost = ((prompt_tokens || 0) * model.costIn + (completion_tokens || 0) * model.costOut) / 1_000_000;
              if (cost > 0) this.emit({ type: 'cost', content: `$${cost.toFixed(6)}`, costUsd: cost });
            }
          }

          // Tool calls — accumulate across chunks
          if (delta.tool_calls) {
            for (const tc of delta.tool_calls) {
              const idx = tc.index ?? 0;
              if (!toolCallMap[idx]) {
                toolCallMap[idx] = { id: tc.id || `call_${idx}`, function: { name: '', arguments: '' } };
              }
              if (tc.id) toolCallMap[idx].id = tc.id;
              if (tc.function?.name) toolCallMap[idx].function.name += tc.function.name;
              if (tc.function?.arguments) toolCallMap[idx].function.arguments += tc.function.arguments;
            }
          }
        } catch {}
      }
    }

    const toolCalls = Object.values(toolCallMap).filter(tc => tc.function.name);
    return { text: fullText, toolCalls };
  }

  async stop() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this.active = false;
  }

  private getModelName(): string {
    return OPENROUTER_MODELS.find(m => m.id === this.currentModel)?.name || this.currentModel;
  }
}

export const openRouterProvider = new OpenRouterProvider();
export default openRouterProvider;
