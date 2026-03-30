/**
 * CrowByte Support Agent Service
 * RAG-powered support chat with diagnostics, escalation, and push notifications.
 */

import { supabase } from '@/lib/supabase';
import { openClaw } from './openclaw';
import { IS_ELECTRON, hasElectronAPI } from '@/lib/platform';

// ── Types ────────────────────────────────────────────────────────────────────

export type MessageRole = 'user' | 'agent' | 'system' | 'diagnostic' | 'notification';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';
export type NotificationType = 'info' | 'warning' | 'alert' | 'critical' | 'update';
export type IntentType = 'docs' | 'diagnostic' | 'escalation' | 'general';

export interface SupportMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  diagnostics?: DiagnosticResult;
  ticketId?: string;
  notification?: UserNotification;
}

export interface HealthCheck {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  latencyMs?: number;
}

export interface DiagnosticResult {
  checks: HealthCheck[];
  score: number;
  timestamp: Date;
  summary: string;
}

export interface EscalationTicket {
  id?: string;
  subject: string;
  priority: TicketPriority;
  conversation: SupportMessage[];
  diagnostics?: DiagnosticResult;
  userEmail?: string;
  userId?: string;
}

export interface UserNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  source: 'admin' | 'system' | 'monitoring';
  read: boolean;
  dismissed: boolean;
  createdAt: string;
}

interface KnowledgeChunk {
  id: string;
  title: string;
  section: string;
  keywords: string[];
  content: string;
}

// ── Stopwords for tokenization ───────────────────────────────────────────────

const STOPWORDS = new Set([
  'a','an','the','is','are','was','were','be','been','being','have','has','had',
  'do','does','did','will','would','could','should','may','might','shall','can',
  'i','me','my','we','our','you','your','he','she','it','they','them','this',
  'that','what','which','who','whom','how','when','where','why','in','on','at',
  'to','for','of','with','by','from','and','or','but','not','no','so','if','then',
]);

// ── Intent keyword maps ──────────────────────────────────────────────────────

const INTENT_KEYWORDS: Record<IntentType, string[]> = {
  diagnostic: [
    'error','broken','not working','crash','fail','slow','stuck','bug',
    'issue','problem',"can't","doesn't","won't",'timeout','500','404',
  ],
  escalation: [
    'human','person','agent','support','help me','talk to','someone',
    'real person','escalate','ticket',
  ],
  docs: [
    'how do i','where is','what is','how to','guide','tutorial','explain',
    'documentation','feature','setting','page','navigate',
  ],
  general: [],
};

// ── Service ──────────────────────────────────────────────────────────────────

class SupportAgentService {
  private knowledge: KnowledgeChunk[] = [];
  private knowledgeLoaded = false;

  constructor() {
    this.loadKnowledge();
  }

  /** Load docs-knowledge.json into memory (non-blocking) */
  private async loadKnowledge(): Promise<void> {
    try {
      const mod = await import('@/data/docs-knowledge.json');
      this.knowledge = (mod.default || mod) as KnowledgeChunk[];
    } catch {
      this.knowledge = [];
    }
    this.knowledgeLoaded = true;
  }

  // ── RAG Search ───────────────────────────────────────────────────────────

  searchKnowledge(query: string, limit = 3): KnowledgeChunk[] {
    if (!this.knowledge.length) return [];

    const tokens = query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w));

    if (!tokens.length) return [];

    const scored = this.knowledge.map((chunk) => {
      let score = 0;
      const contentLower = chunk.content.toLowerCase();
      for (const token of tokens) {
        if (chunk.keywords.some((k) => k.toLowerCase().includes(token))) score += 3;
        if (contentLower.includes(token)) score += 1;
        if (chunk.title.toLowerCase().includes(token)) score += 2;
      }
      return { chunk, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((s) => s.chunk);
  }

  // ── Intent Classification ────────────────────────────────────────────────

  classifyIntent(message: string): IntentType {
    const lower = message.toLowerCase();

    const scores: Record<IntentType, number> = { diagnostic: 0, escalation: 0, docs: 0, general: 0 };

    for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS) as [IntentType, string[]][]) {
      for (const kw of keywords) {
        if (lower.includes(kw)) scores[intent]++;
      }
    }

    let best: IntentType = 'general';
    let max = 0;
    for (const [intent, score] of Object.entries(scores) as [IntentType, number][]) {
      if (score > max) { max = score; best = intent; }
    }
    return best;
  }

  // ── Diagnostics ──────────────────────────────────────────────────────────

  async runDiagnostics(): Promise<DiagnosticResult> {
    const checks = await Promise.all([
      this.checkSupabase(),
      this.checkAuth(),
      this.checkOpenClaw(),
      this.checkElectron(),
      this.checkStorage(),
      this.checkErrorReporter(),
    ]);

    const okCount = checks.filter((c) => c.status === 'ok').length;
    const warnCount = checks.filter((c) => c.status === 'warning').length;
    const total = checks.length;
    const score = Math.round((okCount / total) * 100) + (okCount === total ? 4 : 0);
    const clampedScore = Math.min(score, 100);

    const issues = checks.filter((c) => c.status !== 'ok');
    const summary = issues.length === 0
      ? `${total}/${total} systems healthy. All green.`
      : `${okCount}/${total} systems healthy.${warnCount ? ` ${warnCount} warning(s).` : ''} ${issues.map((i) => `${i.name}: ${i.message}`).join('. ')}.`;

    return { checks, score: clampedScore, timestamp: new Date(), summary };
  }

  private async checkSupabase(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      const latencyMs = Date.now() - start;
      if (error) return { name: 'Supabase', status: 'error', message: error.message, latencyMs };
      return { name: 'Supabase', status: latencyMs > 3000 ? 'warning' : 'ok', message: `Connected (${latencyMs}ms)`, latencyMs };
    } catch (e) {
      return { name: 'Supabase', status: 'error', message: e.message || 'Unreachable', latencyMs: Date.now() - start };
    }
  }

  private async checkAuth(): Promise<HealthCheck> {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return { name: 'Auth', status: 'warning', message: 'No active session' };
      const exp = data.session.expires_at;
      if (exp && exp * 1000 < Date.now()) return { name: 'Auth', status: 'error', message: 'Token expired' };
      return { name: 'Auth', status: 'ok', message: 'Session active' };
    } catch (e) {
      return { name: 'Auth', status: 'error', message: e.message || 'Auth check failed' };
    }
  }

  private async checkOpenClaw(): Promise<HealthCheck> {
    const host = import.meta.env.VITE_OPENCLAW_HOSTNAME;
    if (!host) return { name: 'OpenClaw', status: 'warning', message: 'Not configured (VITE_OPENCLAW_HOSTNAME missing)' };
    const start = Date.now();
    try {
      const res = await fetch(`https://${host}/nvidia/v1/models`, { signal: AbortSignal.timeout(5000) });
      const latencyMs = Date.now() - start;
      return { name: 'OpenClaw', status: res.ok ? 'ok' : 'warning', message: res.ok ? `Reachable (${latencyMs}ms)` : `HTTP ${res.status}`, latencyMs };
    } catch {
      return { name: 'OpenClaw', status: 'error', message: 'VPS unreachable (timeout)', latencyMs: Date.now() - start };
    }
  }

  private async checkElectron(): Promise<HealthCheck> {
    if (!IS_ELECTRON) return { name: 'Electron', status: 'ok', message: 'Web build — skipped' };
    return hasElectronAPI()
      ? { name: 'Electron', status: 'ok', message: 'IPC bridge available' }
      : { name: 'Electron', status: 'error', message: 'IPC bridge missing — preload may have failed' };
  }

  private async checkStorage(): Promise<HealthCheck> {
    try {
      if (!navigator.storage?.estimate) return { name: 'Storage', status: 'ok', message: 'API unavailable — skipped' };
      const est = await navigator.storage.estimate();
      const usedMB = Math.round((est.usage || 0) / 1024 / 1024);
      const quotaMB = Math.round((est.quota || 0) / 1024 / 1024);
      const pct = quotaMB > 0 ? Math.round((usedMB / quotaMB) * 100) : 0;
      const status = pct > 90 ? 'error' : pct > 70 ? 'warning' : 'ok';
      return { name: 'Storage', status, message: `${usedMB}MB / ${quotaMB}MB (${pct}%)` };
    } catch {
      return { name: 'Storage', status: 'ok', message: 'Check skipped' };
    }
  }

  private async checkErrorReporter(): Promise<HealthCheck> {
    try {
      // Check if GlitchTip / Sentry SDK is initialized on window
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sentry = (window as any).__SENTRY__;
      if (sentry) return { name: 'ErrorReporter', status: 'ok', message: 'Sentry/GlitchTip active' };
      return { name: 'ErrorReporter', status: 'warning', message: 'No error reporter detected' };
    } catch {
      return { name: 'ErrorReporter', status: 'ok', message: 'Check skipped' };
    }
  }

  // ── Chat ─────────────────────────────────────────────────────────────────

  async chat(messages: SupportMessage[]): Promise<SupportMessage> {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return this.makeMessage('agent', 'I didn\'t catch that. Could you rephrase?');

    const intent = this.classifyIntent(lastUser.content);

    let ragContext = '';
    let diagnosticContext = '';
    let diagnostics: DiagnosticResult | undefined;

    if (intent === 'diagnostic') {
      diagnostics = await this.runDiagnostics();
      diagnosticContext = `\n\n## Diagnostic Results (score: ${diagnostics.score}/100)\n${diagnostics.checks.map((c) => `- **${c.name}**: ${c.status.toUpperCase()} — ${c.message}`).join('\n')}\n\nSummary: ${diagnostics.summary}`;
    }

    if (intent === 'docs' || intent === 'general') {
      const chunks = this.searchKnowledge(lastUser.content);
      if (chunks.length) {
        ragContext = `\n\n## Documentation Context\n${chunks.map((c) => `### ${c.title} (${c.section})\n${c.content}`).join('\n\n')}`;
      }
    }

    if (intent === 'escalation') {
      return this.makeMessage('agent',
        'I can create a support ticket and escalate to a human. Would you like me to do that?\n\n' +
        'Just say **"yes, escalate"** and I\'ll create a ticket with our conversation and any diagnostics attached.');
    }

    const systemPrompt = `You are the CrowByte Support Agent — a helpful AI assistant built into the CrowByte offensive security platform.

Your job:
- Help users navigate CrowByte features
- Diagnose technical issues using diagnostic results
- Explain how things work using documentation context
- Offer to escalate to human support when you can't resolve an issue

Style: Concise, technical, friendly. Use markdown. Be direct.
Never make up features that don't exist.
When diagnostic results are provided, analyze them and suggest fixes.${ragContext}${diagnosticContext}`;

    // Build OpenClaw-compatible message array
    const history = messages.slice(-10).map((m) => ({
      role: (m.role === 'agent' ? 'assistant' : 'user') as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    try {
      const reply = await openClaw.chat(
        [{ role: 'system', content: systemPrompt }, ...history],
        undefined,
        0.5,
      );
      const msg = this.makeMessage('agent', reply || 'Sorry, I couldn\'t generate a response.');
      if (diagnostics) msg.diagnostics = diagnostics;
      return msg;
    } catch (e) {
      return this.makeMessage('agent', `Support agent error: ${e.message || 'Failed to reach AI backend.'}\n\nYou can try running diagnostics or escalate to human support.`);
    }
  }

  // ── Escalation ───────────────────────────────────────────────────────────

  async escalate(ticket: EscalationTicket): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    const row = {
      subject: ticket.subject,
      priority: ticket.priority,
      status: 'open' as TicketStatus,
      conversation: JSON.stringify(ticket.conversation.slice(-20)),
      diagnostics: ticket.diagnostics ? JSON.stringify(ticket.diagnostics) : null,
      user_email: ticket.userEmail || user?.email || null,
      user_id: ticket.userId || user?.id || null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('support_tickets').insert([row]).select('id').single();
    if (error) throw new Error(`Failed to create ticket: ${error.message}`);

    const ticketId = data.id as string;
    await this.notifyDiscord(ticket, ticketId).catch(() => {});
    return ticketId;
  }

  private async notifyDiscord(ticket: EscalationTicket, ticketId: string): Promise<void> {
    const webhookUrl = import.meta.env.VITE_DISCORD_SUPPORT_WEBHOOK;
    if (!webhookUrl) return;

    const colorMap: Record<TicketPriority, number> = {
      critical: 0xff0000,
      high: 0xff8c00,
      medium: 0xffd700,
      low: 0x3b82f6,
    };

    const firstMsg = ticket.conversation.find((m) => m.role === 'user')?.content || '(no message)';

    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: `Support Ticket: ${ticket.subject}`,
          color: colorMap[ticket.priority],
          fields: [
            { name: 'Ticket ID', value: ticketId, inline: true },
            { name: 'Priority', value: ticket.priority.toUpperCase(), inline: true },
            { name: 'User', value: ticket.userEmail || ticket.userId || 'Anonymous', inline: true },
            { name: 'Health Score', value: ticket.diagnostics ? `${ticket.diagnostics.score}/100` : 'N/A', inline: true },
            { name: 'First Message', value: firstMsg.slice(0, 200) },
          ],
          timestamp: new Date().toISOString(),
        }],
      }),
    });
  }

  // ── Notifications ────────────────────────────────────────────────────────

  async getNotifications(): Promise<UserNotification[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return [];
    return (data || []).map(this.mapNotification);
  }

  async markNotificationRead(id: string): Promise<void> {
    await supabase.from('user_notifications').update({ read: true }).eq('id', id);
  }

  async dismissNotification(id: string): Promise<void> {
    await supabase.from('user_notifications').update({ dismissed: true }).eq('id', id);
  }

  subscribeToNotifications(callback: (notification: UserNotification) => void): () => void {
    let userId: string | null = null;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;
    };
    setup();

    const channel = supabase
      .channel('user-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_notifications' }, (payload) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = payload.new as any;
        if (userId && row.user_id === userId) {
          callback(this.mapNotification(row));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }

  // ── Tickets ──────────────────────────────────────────────────────────────

  async getTickets(): Promise<EscalationTicket[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((row: any) => ({
      id: row.id,
      subject: row.subject,
      priority: row.priority,
      conversation: typeof row.conversation === 'string' ? JSON.parse(row.conversation) : row.conversation || [],
      diagnostics: row.diagnostics ? (typeof row.diagnostics === 'string' ? JSON.parse(row.diagnostics) : row.diagnostics) : undefined,
      userEmail: row.user_email,
      userId: row.user_id,
    }));
  }

  async getTicketById(id: string): Promise<EscalationTicket | null> {
    const { data } = await supabase.from('support_tickets').select('*').eq('id', id).single();
    if (!data) return null;
    return {
      id: data.id,
      subject: data.subject,
      priority: data.priority,
      conversation: typeof data.conversation === 'string' ? JSON.parse(data.conversation) : data.conversation || [],
      diagnostics: data.diagnostics ? (typeof data.diagnostics === 'string' ? JSON.parse(data.diagnostics) : data.diagnostics) : undefined,
      userEmail: data.user_email,
      userId: data.user_id,
    };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  private makeMessage(role: MessageRole, content: string): SupportMessage {
    return { id: crypto.randomUUID(), role, content, timestamp: new Date() };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapNotification(row: any): UserNotification {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      actionUrl: row.action_url,
      source: row.source,
      read: row.read,
      dismissed: row.dismissed,
      createdAt: row.created_at,
    };
  }
}

// ── Export singleton ──────────────────────────────────────────────────────────

export const supportAgent = new SupportAgentService();
export default supportAgent;
