/**
 * Memory Engine Service
 * Frontend client for the memory-engine REST API
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface MemoryStats {
  entries: number;
  knowledge: number;
  sessions_total: number;
  sessions_done: number;
  by_agent: Record<string, number>;
  by_status: Record<string, number>;
}

export interface SearchResult {
  content: string;
  role: string;
  session_id: string;
  timestamp?: string;
  source_line?: number;
}

export interface KnowledgeEntry {
  id: number;
  topic: string;
  summary: string;
  details?: string;
  agent: string;
  tags?: string;
  status: string;
  created_at: string;
  updated_at: string;
  review_trigger?: string;
  update_history?: string;
}

export interface TopicEntry {
  word: string;
  count: number;
}

export interface TopicDetail {
  total_hits: number;
  sessions_count: number;
  sessions: {
    session_id: string;
    hit_count: number;
    first_ts?: string;
    tools_used: string[];
    user_msgs: string[];
    assistant_msgs: string[];
  }[];
}

export interface SessionEntry {
  id: string;
  status: string;
  started_at?: string;
  ended_at?: string;
  entries: number;
}

export interface SessionDetail {
  session_id: string;
  page: number;
  total_pages: number;
  total_entries: number;
  entries: {
    role: string;
    content: string;
    timestamp?: string;
    source_line?: number;
  }[];
  error?: string;
}

export interface ObservationEntry {
  type: string;
  concept?: string;
  confidence: number;
  content: string;
  session_id?: string;
}

export interface ProjectEntry {
  id: number;
  name: string;
  description?: string;
  tags?: string;
  color: string;
  status: string;
  session_count?: number;
  created_at: string;
  updated_at: string;
}

export interface SemanticResult {
  content: string;
  role?: string;
  timestamp?: string;
  session_id?: string;
  similarity?: number;
  hybrid_score?: number;
  sem_score?: number;
  fts_score?: number;
}

// ─── Service ───────────────────────────────────────────────────────────────

class MemoryEngineService {
  private baseUrl: string;

  constructor() {
    // Use relative URL — same origin as the CrowByte server
    this.baseUrl = '/api/memory';
  }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const token = localStorage.getItem('crowbyte_server_token') || localStorage.getItem('crowbyte_token');
    const headers: Record<string, string> = {
      ...(options?.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (options?.body && typeof options.body === 'string') {
      headers['Content-Type'] = 'application/json';
    }

    const res = await window.fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    return res.json();
  }

  // ─── Health & Stats ────────────────────────────────────────────────────

  async getHealth(): Promise<{ ok: boolean } & MemoryStats> {
    return this.fetch('/health');
  }

  async getStats(): Promise<MemoryStats> {
    return this.fetch('/stats');
  }

  // ─── Search ────────────────────────────────────────────────────────────

  async search(query: string, opts?: {
    agent?: string;
    role?: string;
    days?: number;
    limit?: number;
  }): Promise<{ results: SearchResult[]; count: number }> {
    const params = new URLSearchParams({ q: query });
    if (opts?.agent) params.set('agent', opts.agent);
    if (opts?.role) params.set('role', opts.role);
    if (opts?.days) params.set('days', String(opts.days));
    if (opts?.limit) params.set('limit', String(opts.limit));
    return this.fetch(`/search?${params}`);
  }

  async semanticSearch(query: string, opts?: {
    role?: string;
    mode?: 'hybrid' | 'semantic' | 'keyword';
    limit?: number;
  }): Promise<{ results: SemanticResult[]; related: { word: string; score: number }[]; count: number; mode: string }> {
    const params = new URLSearchParams({ q: query });
    if (opts?.role) params.set('role', opts.role);
    if (opts?.mode) params.set('mode', opts.mode);
    if (opts?.limit) params.set('limit', String(opts.limit));
    return this.fetch(`/semantic?${params}`);
  }

  // ─── Knowledge ─────────────────────────────────────────────────────────

  async searchKnowledge(query?: string, opts?: {
    agent?: string;
    status?: string;
    limit?: number;
  }): Promise<{ results: KnowledgeEntry[]; count: number }> {
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (opts?.agent) params.set('agent', opts.agent);
    if (opts?.status) params.set('status', opts.status);
    if (opts?.limit) params.set('limit', String(opts.limit));
    return this.fetch(`/knowledge?${params}`);
  }

  async saveKnowledge(data: {
    topic: string;
    summary: string;
    details?: string;
    agent?: string;
    tags?: string;
    review_trigger?: string;
  }): Promise<{ id: number; action: string }> {
    return this.fetch('/knowledge', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAgentKnowledge(agent: string, status?: string): Promise<{ results: KnowledgeEntry[]; count: number }> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    return this.fetch(`/knowledge/${encodeURIComponent(agent)}?${params}`);
  }

  // ─── Topics ────────────────────────────────────────────────────────────

  async getTopics(minHits?: number, limit?: number): Promise<{ topics: TopicEntry[] }> {
    const params = new URLSearchParams();
    if (minHits) params.set('min_hits', String(minHits));
    if (limit) params.set('limit', String(limit));
    return this.fetch(`/topics?${params}`);
  }

  async getTopic(name: string, limit?: number): Promise<TopicDetail> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    return this.fetch(`/topic/${encodeURIComponent(name)}?${params}`);
  }

  // ─── Timeline ──────────────────────────────────────────────────────────

  async getTimeline(opts?: {
    start?: string;
    end?: string;
    limit?: number;
  }): Promise<{ entries: SearchResult[]; count: number }> {
    const params = new URLSearchParams();
    if (opts?.start) params.set('start', opts.start);
    if (opts?.end) params.set('end', opts.end);
    if (opts?.limit) params.set('limit', String(opts.limit));
    return this.fetch(`/timeline?${params}`);
  }

  // ─── Sessions ──────────────────────────────────────────────────────────

  async getSessions(limit?: number, query?: string): Promise<{ sessions: SessionEntry[] }> {
    const params = new URLSearchParams();
    if (limit) params.set('limit', String(limit));
    if (query) params.set('q', query);
    return this.fetch(`/sessions?${params}`);
  }

  async getSession(id: string, page?: number, perPage?: number): Promise<SessionDetail> {
    const params = new URLSearchParams();
    if (page) params.set('page', String(page));
    if (perPage) params.set('per_page', String(perPage));
    return this.fetch(`/sessions/${encodeURIComponent(id)}?${params}`);
  }

  // ─── Observations ──────────────────────────────────────────────────────

  async getObservations(opts?: {
    type?: string;
    concept?: string;
    session_id?: string;
    min_confidence?: number;
    limit?: number;
  }): Promise<{ results: ObservationEntry[]; count: number }> {
    const params = new URLSearchParams();
    if (opts?.type) params.set('type', opts.type);
    if (opts?.concept) params.set('concept', opts.concept);
    if (opts?.session_id) params.set('session_id', opts.session_id);
    if (opts?.min_confidence) params.set('min_confidence', String(opts.min_confidence));
    if (opts?.limit) params.set('limit', String(opts.limit));
    return this.fetch(`/observations?${params}`);
  }

  // ─── Projects ──────────────────────────────────────────────────────────

  async getProjects(status?: string): Promise<{ projects: ProjectEntry[] }> {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    return this.fetch(`/projects?${params}`);
  }

  async createProject(data: {
    name: string;
    description?: string;
    tags?: string;
    color?: string;
  }): Promise<{ id: number; action: string }> {
    return this.fetch('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProject(name: string): Promise<{
    project: ProjectEntry;
    stats: Record<string, number>;
    sessions: SessionEntry[];
    observations: ObservationEntry[];
  }> {
    return this.fetch(`/projects/${encodeURIComponent(name)}`);
  }

  async searchProject(name: string, query: string, opts?: {
    role?: string;
    limit?: number;
  }): Promise<{ results: SearchResult[]; count: number }> {
    const params = new URLSearchParams({ q: query });
    if (opts?.role) params.set('role', opts.role);
    if (opts?.limit) params.set('limit', String(opts.limit));
    return this.fetch(`/projects/${encodeURIComponent(name)}/search?${params}`);
  }

  // ─── Chat / Terminal Live Ingest ─────────────────────────────────────

  /**
   * Save a chat message to memory-engine. Fire-and-forget.
   */
  saveChat(data: {
    content: string;
    role: 'user' | 'assistant' | 'system';
    session_id?: string;
    source?: 'chat' | 'terminal' | 'system';
    timestamp?: string;
  }): void {
    // Non-blocking — don't await
    this.fetch('/chat', {
      method: 'POST',
      body: JSON.stringify({
        content: data.content,
        role: data.role,
        session_id: data.session_id,
        source: data.source || 'chat',
        timestamp: data.timestamp || new Date().toISOString(),
      }),
    }).catch(() => {
      // Silent fail — memory is best-effort
    });
  }

  // ─── Admin ─────────────────────────────────────────────────────────────

  async runLifecycle(): Promise<{ stale: number; archived: number; deleted: number }> {
    return this.fetch('/lifecycle', { method: 'POST' });
  }

  async ingest(source: 'latest' | 'all' = 'latest'): Promise<Record<string, unknown>> {
    return this.fetch('/ingest', {
      method: 'POST',
      body: JSON.stringify({ source }),
    });
  }
}

// Export singleton
export const memoryEngine = new MemoryEngineService();
export default memoryEngine;
