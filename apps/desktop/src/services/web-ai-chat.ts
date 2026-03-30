/**
 * Web AI Chat Service — Uses /api/ai/chat for web platform users.
 * Streams SSE responses from CrowByte's proxied AI endpoint.
 */

import { supabase } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiModel {
  id: string;
  name: string;
  desc: string;
}

export interface UsageInfo {
  tier: string;
  current: number;
  limit: number | null;
  remaining: number | null;
}

async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

/**
 * Check if web AI chat is available (web platform, not Electron).
 */
export function isWebAiAvailable(): boolean {
  return !isElectron;
}

/**
 * Fetch available AI models.
 */
export async function getModels(): Promise<AiModel[]> {
  try {
    const res = await fetch('/api/ai/models');
    if (!res.ok) return [];
    const data = await res.json();
    return data.models || [];
  } catch {
    return [];
  }
}

/**
 * Check current usage limits.
 */
export async function getUsage(): Promise<UsageInfo | null> {
  const token = await getAuthToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/ai/usage', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Stream AI chat response via SSE.
 * Yields text chunks as they arrive.
 */
export async function* streamChat(
  messages: ChatMessage[],
  model?: string
): AsyncGenerator<{ type: 'text' | 'error' | 'done'; content: string }> {
  const token = await getAuthToken();
  if (!token) {
    yield { type: 'error', content: 'Not authenticated. Please sign in.' };
    return;
  }

  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ messages, model }),
  });

  if (res.status === 429) {
    const err = await res.json();
    yield { type: 'error', content: err.message || 'Rate limit exceeded. Upgrade your plan for more messages.' };
    return;
  }

  if (res.status === 401) {
    yield { type: 'error', content: 'Session expired. Please sign in again.' };
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'AI service error' }));
    yield { type: 'error', content: err.error || `Server error: ${res.status}` };
    return;
  }

  // Parse SSE stream (OpenAI-compatible format)
  const reader = res.body?.getReader();
  if (!reader) {
    yield { type: 'error', content: 'No response body' };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          yield { type: 'done', content: '' };
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) {
            yield { type: 'text', content: delta.content };
          }
          // Check for errors in stream
          if (parsed.error) {
            yield { type: 'error', content: parsed.error };
            return;
          }
        } catch {
          // Skip unparseable lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: 'done', content: '' };
}
