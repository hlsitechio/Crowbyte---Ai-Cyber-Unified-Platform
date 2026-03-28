/**
 * Claude Code CLI Provider
 * Streams Claude responses via Electron IPC → claude -p --output-format stream-json
 * Uses the full .env-unfiltered setup (CLAUDE.md, MCP servers, tools, plugins)
 */

export interface ClaudeModel {
  id: string;
  name: string;
  provider: string;
}

export interface ClaudeStreamEvent {
  type: 'text' | 'tool_call' | 'tool_result' | 'thinking' | 'system' | 'cost' | 'done' | 'error';
  content: string;
  sessionId?: string;
  costUsd?: number;
  model?: string;
}

const CLAUDE_MODELS: ClaudeModel[] = [
  { id: 'opus', name: 'Claude Opus 4.6', provider: 'Anthropic' },
  { id: 'sonnet', name: 'Claude Sonnet 4.6', provider: 'Anthropic' },
  { id: 'haiku', name: 'Claude Haiku 4.5', provider: 'Anthropic' },
];

function formatStreamError(error: string): string {
  const normalized = error.trim();
  const lower = normalized.toLowerCase();

  const copilotRateLimitMatch = normalized.match(/please try again in\s+(.+)$/i);
  if (lower.includes('copilot') && lower.includes('rate limit') && copilotRateLimitMatch) {
    const waitTime = copilotRateLimitMatch[1].trim();
    return waitTime
      ? `Copilot rate limit reached. Please try again in ${waitTime}.`
      : 'Copilot rate limit reached. Please wait a few minutes and try again.';
  }

  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('http 429')) {
    return 'Rate limit reached. Please wait a few minutes and try again.';
  }

  return normalized || 'An unexpected error occurred. Please try again.';
}

class ClaudeProvider {
  private currentModel = 'sonnet';
  private sessionId: string | null = null;
  private maxBudget = 5.0;
  private listeners: Array<(event: ClaudeStreamEvent) => void> = [];
  private active = false;

  getModels(): ClaudeModel[] {
    return CLAUDE_MODELS;
  }

  setModel(model: string) {
    this.currentModel = model;
  }

  getModel(): string {
    return this.currentModel;
  }

  setMaxBudget(budget: number) {
    this.maxBudget = budget;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  isActive(): boolean {
    return this.active;
  }

  /**
   * Send a message to Claude CLI and stream back events.
   * Returns a promise that resolves when the stream ends.
   * Call onEvent() before send() to receive streaming events.
   */
  async send(prompt: string): Promise<{ ok: boolean; costUsd?: number }> {
    if (!window.electronAPI?.claudeChat) {
      return { ok: false };
    }

    this.active = true;

    return new Promise((resolve) => {
      // Wire up listeners
      window.electronAPI!.removeClaudeListeners!();

      window.electronAPI!.onClaudeStreamEvent!((raw: any) => {
        const events = this.parseStreamEvent(raw);
        for (const ev of events) {
          for (const listener of this.listeners) {
            listener(ev);
          }
        }
      });

      window.electronAPI!.onClaudeStreamError!((error: string) => {
        for (const listener of this.listeners) {
          listener({ type: 'error', content: formatStreamError(error) });
        }
        this.active = false;
        window.electronAPI!.removeClaudeListeners!();
        resolve({ ok: false });
      });

      window.electronAPI!.onClaudeStreamEnd!((data: any) => {
        for (const listener of this.listeners) {
          listener({ type: 'done', content: '' });
        }
        this.active = false;
        window.electronAPI!.removeClaudeListeners!();
        resolve({ ok: data?.code === 0, costUsd: undefined });
      });

      // Start the Claude process
      window.electronAPI!.claudeChat!({
        prompt,
        model: this.currentModel,
        sessionId: this.sessionId,
        maxBudget: this.maxBudget,
      });
    });
  }

  onEvent(listener: (event: ClaudeStreamEvent) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  clearListeners() {
    this.listeners = [];
  }

  async stop() {
    if (window.electronAPI?.claudeStop) {
      await window.electronAPI.claudeStop();
    }
    this.active = false;
  }

  /**
   * Parse a raw NDJSON event from Claude CLI stream-json format
   */
  private parseStreamEvent(raw: any): ClaudeStreamEvent[] {
    const events: ClaudeStreamEvent[] = [];

    if (raw.type === 'assistant') {
      // Extract text content from assistant message
      const msg = raw.message;
      if (msg?.content) {
        for (const block of msg.content) {
          if (block.type === 'text') {
            events.push({ type: 'text', content: block.text, model: msg.model });
          } else if (block.type === 'thinking') {
            events.push({ type: 'thinking', content: block.thinking || '' });
          } else if (block.type === 'tool_use') {
            const toolName = block.name || 'unknown';
            const toolInput = typeof block.input === 'string'
              ? block.input
              : JSON.stringify(block.input, null, 2);

            if (toolName === 'Bash') {
              events.push({ type: 'tool_call', content: block.input?.command || toolInput });
            } else if (toolName === 'Edit' || toolName === 'Write') {
              events.push({ type: 'tool_call', content: `${toolName}: ${block.input?.file_path || ''}` });
            } else if (toolName === 'Read') {
              events.push({ type: 'tool_call', content: `Read: ${block.input?.file_path || ''}` });
            } else {
              events.push({ type: 'tool_call', content: `${toolName}\n${toolInput}` });
            }
          }
        }
      }
      // Capture session ID
      if (raw.session_id) {
        this.sessionId = raw.session_id;
      }
    } else if (raw.type === 'tool_result') {
      // Tool execution result
      const content = raw.content || raw.output || '';
      const text = typeof content === 'string' ? content : JSON.stringify(content);
      events.push({ type: 'tool_result', content: text });
    } else if (raw.type === 'result') {
      // Final result with cost info
      if (raw.total_cost_usd) {
        events.push({
          type: 'cost',
          content: `$${raw.total_cost_usd.toFixed(4)}`,
          costUsd: raw.total_cost_usd,
          sessionId: raw.session_id,
        });
      }
      if (raw.result) {
        events.push({ type: 'text', content: raw.result });
      }
      if (raw.session_id) {
        this.sessionId = raw.session_id;
      }
    } else if (raw.type === 'system' && raw.subtype === 'init') {
      // System init — capture session info
      if (raw.session_id) {
        this.sessionId = raw.session_id;
      }
      events.push({
        type: 'system',
        content: `Claude Code v${raw.claude_code_version || '?'} | ${raw.model || 'unknown'} | ${raw.tools?.length || 0} tools | ${raw.mcp_servers?.filter((s: any) => s.status === 'connected').length || 0} MCP servers`,
        sessionId: raw.session_id,
      });
    }

    return events;
  }
}

export const claudeProvider = new ClaudeProvider();
export default claudeProvider;
