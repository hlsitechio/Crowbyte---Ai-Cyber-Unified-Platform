/**
 * Unified AI Service — routes all AI calls through CrowByte API proxy.
 * NVIDIA key lives server-side only; client authenticates with Supabase JWT.
 */

import { supabase } from '@/lib/supabase';

const CHAT_URL = 'https://crowbyte.io/api/ai/chat';
export const DEFAULT_MODEL = 'deepseek-ai/deepseek-v3.2';

const SYSTEM_PROMPT = 'You are CrowByte AI, an expert cybersecurity assistant. Always respond in English. Be concise and direct.';

async function baseHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
  };
}

function withSystem(messages: Array<{ role: string; content: string }>) {
  if (messages[0]?.role === 'system') return messages;
  return [{ role: 'system', content: SYSTEM_PROMPT }, ...messages];
}

// ─── Simple chat (returns string) ────────────────────────────────────────────

export async function chat(
  messages: Array<{ role: string; content: string }>,
  model = DEFAULT_MODEL,
  _temperature = 0.7,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: await baseHeaders(),
    body: JSON.stringify({ model, messages: withSystem(messages), stream: false, max_tokens: 2048 }),
    signal,
  });
  if (!res.ok) throw new Error(`AI error ${res.status}`);
  const j = await res.json();
  return j.choices?.[0]?.message?.content ?? '';
}

// ─── Streaming chat (async generator) ────────────────────────────────────────

export async function* streamChat(
  messages: Array<{ role: string; content: string }>,
  model = DEFAULT_MODEL,
  _temperature = 0.7,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const res = await fetch(CHAT_URL, {
    method: 'POST',
    headers: await baseHeaders(),
    body: JSON.stringify({ model, messages: withSystem(messages), stream: true, max_tokens: 2048 }),
    signal,
  });
  if (!res.ok) throw new Error(`AI error ${res.status}`);

  const reader = res.body?.getReader();
  if (!reader) return;
  const dec = new TextDecoder();
  let buf = '';
  let inThink = false;
  let thinkBuf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') return;
      try {
        const j = JSON.parse(raw);
        const delta = j.choices?.[0]?.delta?.content;
        if (!delta) continue;
        // Filter out <think>...</think> reasoning blocks
        thinkBuf += delta;
        let out = '';
        let i = 0;
        while (i < thinkBuf.length) {
          if (!inThink) {
            const start = thinkBuf.indexOf('<think>', i);
            if (start === -1) { out += thinkBuf.slice(i); thinkBuf = ''; break; }
            out += thinkBuf.slice(i, start);
            inThink = true; i = start + 7;
          } else {
            const end = thinkBuf.indexOf('</think>', i);
            if (end === -1) { thinkBuf = thinkBuf.slice(i); break; }
            inThink = false; i = end + 8;
          }
        }
        if (out) yield out;
      } catch { /* skip */ }
    }
  }
}

// ─── OpenAI-style createChatCompletion (for backward-compat) ─────────────────

export async function createChatCompletion(opts: {
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  signal?: AbortSignal;
}): Promise<{ choices: Array<{ message: { content: string } }> }> {
  const content = await chat(opts.messages, opts.model ?? DEFAULT_MODEL, opts.temperature, opts.signal);
  return { choices: [{ message: { content } }] };
}

// ─── Test connection ──────────────────────────────────────────────────────────

export async function testConnection(): Promise<boolean> {
  try {
    await chat([{ role: 'user', content: 'ping' }]);
    return true;
  } catch {
    return false;
  }
}

// ─── Default export (object-style for drop-in replacement) ───────────────────

const ai = { chat, streamChat, createChatCompletion, testConnection };
export default ai;
