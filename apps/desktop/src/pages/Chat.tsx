import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  UilRobot, UilBolt, UilCog, UilTimes, UilPlus, UilSearch,
  UilTrashAlt, UilPen, UilShield, UilFilter, UilHeartRate, UilBell,
  UilWindow, UilFlask, UilCrosshair, UilBoltAlt,
} from "@iconscout/react-unicons";
import { useToast } from '@/hooks/use-toast';
import { memoryEngine } from '@/services/memory-engine';
import { streamChat, DEFAULT_MODEL } from '@/services/ai';
import { AssistantMessage, UserMessage, TypingIndicator, type Message } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { EmptyState } from '@/components/chat/EmptyState';

// ─── Types ────────────────────────────────────────────────────────────────────

type Provider = 'crowbyte';

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
}

// ─── Context badge ────────────────────────────────────────────────────────────

const PAGE_CONTEXT: Record<string, { label: string; icon: typeof UilHeartRate; color: string; accent: string }> = {
  '/dashboard':       { label: 'Dashboard',    icon: UilHeartRate, color: 'text-blue-400',    accent: 'bg-blue-500/10 border-blue-500/20' },
  '/alert-center':    { label: 'Alerts',       icon: UilBell,      color: 'text-amber-400',   accent: 'bg-amber-500/10 border-amber-500/20' },
  '/findings':        { label: 'Findings',     icon: UilFilter,    color: 'text-violet-400',  accent: 'bg-violet-500/10 border-violet-500/20' },
  '/sentinel':        { label: 'Sentinel',     icon: UilShield,    color: 'text-red-400',     accent: 'bg-red-500/10 border-red-500/20' },
  '/terminal':        { label: 'Terminal',     icon: UilWindow,    color: 'text-emerald-400', accent: 'bg-emerald-500/10 border-emerald-500/20' },
  '/redteam':         { label: 'Red Team',     icon: UilCrosshair, color: 'text-rose-400',    accent: 'bg-rose-500/10 border-rose-500/20' },
  '/cyber-ops':       { label: 'Cyber Ops',    icon: UilBoltAlt,  color: 'text-orange-400',  accent: 'bg-orange-500/10 border-orange-500/20' },
  '/network-scanner': { label: 'Network Map',  icon: UilFlask,     color: 'text-cyan-400',    accent: 'bg-cyan-500/10 border-cyan-500/20' },
};

function getLastPageContext() {
  try {
    const last = localStorage.getItem('cb_last_page');
    if (last && PAGE_CONTEXT[last]) return { path: last, ...PAGE_CONTEXT[last] };
  } catch { /* empty */ }
  return null;
}

// ─── Date grouping ────────────────────────────────────────────────────────────

function groupConversationsByDate(convs: Conversation[]): { label: string; items: Conversation[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const lastWeek = new Date(today); lastWeek.setDate(lastWeek.getDate() - 7);
  const lastMonth = new Date(today); lastMonth.setDate(lastMonth.getDate() - 30);

  const groups: { label: string; items: Conversation[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'Last 7 days', items: [] },
    { label: 'Last 30 days', items: [] },
    { label: 'Older', items: [] },
  ];

  for (const c of convs) {
    const d = new Date(c.updated_at);
    if (d >= today) groups[0].items.push(c);
    else if (d >= yesterday) groups[1].items.push(c);
    else if (d >= lastWeek) groups[2].items.push(c);
    else if (d >= lastMonth) groups[3].items.push(c);
    else groups[4].items.push(c);
  }

  return groups.filter(g => g.items.length > 0);
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// ─── Provider colors ──────────────────────────────────────────────────────────

const PROVIDER_STYLES: Record<Provider, { label: string; color: string; dot: string }> = {
  crowbyte:   { label: 'CrowByte AI', color: 'text-blue-400',    dot: 'bg-blue-400' },
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Chat() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Core
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  // Panels
  const [rightOpen, setRightOpen] = useState(false);

  // Provider
  const [provider] = useState<Provider>('crowbyte');

  // Connection

  // Right panel settings
  const [temperature, setTemperature] = useState(0.7);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [agentPersona, setAgentPersona] = useState('default');

  // Context
  const [pageContext, setPageContext] = useState(getLastPageContext());

  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ─── Context badge polling ────────────────────────────────────────────────

  useEffect(() => {
    const handler = () => setPageContext(getLastPageContext());
    window.addEventListener('storage', handler);
    const iv = setInterval(handler, 3000);
    return () => { window.removeEventListener('storage', handler); clearInterval(iv); };
  }, []);

  // ─── Init ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth'); return; }

      await loadConversations();
      await createNewConversation();
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => { if (!s) navigate('/auth'); });
    return () => { subscription.unsubscribe(); abortRef.current?.abort(); };
  }, [navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (conversationId) loadMessages(conversationId);
  }, [conversationId]);



  // ─── Chat prefill from other pages (InlineAI → Chat) ───────────────────
  useEffect(() => {
    const prefill = localStorage.getItem('cb_chat_prefill');
    if (!prefill) return;
    localStorage.removeItem('cb_chat_prefill');
    setInput(prefill);
    // Auto-send if it's not a template with placeholders
    if (!prefill.includes('XXXXX') && !prefill.includes('// paste')) {
      setTimeout(() => handleSend(prefill), 150);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Supabase ────────────────────────────────────────────────────────────

  const loadConversations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('conversations')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(100);
    if (data) setConversations(data);
  };

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from('messages').select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (data && data.length > 0) {
      const mapped = data.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        provider: m.provider as Provider | undefined,
        model: m.model,
        timestamp: m.created_at ? new Date(m.created_at).getTime() : undefined,
      }));
      setMessages(mapped);
    } else {
      setMessages([]);
    }
  };

  const createNewConversation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title: 'New conversation' })
      .select('id, title, updated_at').single();
    if (error) { toast({ title: 'Error', description: 'Failed to create chat', variant: 'destructive' }); return; }
    setConversationId(data.id);
    setMessages([]);
    setConversations(prev => [data, ...prev]);
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('conversations').delete().eq('id', id);
    setConversations(prev => prev.filter(c => c.id !== id));
    if (conversationId === id) await createNewConversation();
  };

  const renameConversation = async (id: string, title: string) => {
    await supabase.from('conversations').update({ title }).eq('id', id);
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
    setEditingId(null);
  };

  const saveMessage = async (role: string, content: string) => {
    if (!conversationId) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('messages').insert({
      conversation_id: conversationId, user_id: user?.id, role, content, provider,
      model: 'gemini-2.5-flash',
    });
    memoryEngine.saveChat({ content, role: role as 'user' | 'assistant', session_id: conversationId!, source: 'chat' });
  };

  const handleDeleteMessage = (index: number) => setMessages(prev => prev.filter((_, i) => i !== index));

  const handleRegenerate = async (index: number) => {
    const i = messages.slice(0, index).findLastIndex(m => m.role === 'user');
    if (i < 0) return;
    const trimmed = messages.slice(0, i + 1);
    setMessages(trimmed);
    setIsStreaming(true);
    try {
      await sendCrowByte(trimmed[i]);
    } catch { toast({ title: 'Error', description: 'Regeneration failed', variant: 'destructive' }); }
    finally { setIsStreaming(false); }
  };

  // ─── Send methods ─────────────────────────────────────────────────────────

  const sendCrowByte = useCallback(async (userMessage: Message, signal?: AbortSignal) => {
    let content = '';
    setMessages(prev => [...prev, { role: 'assistant', content: '', isStreaming: true, provider: 'crowbyte', model: 'DeepSeek V3', timestamp: Date.now() }]);
    try {
      const history = [...messages, userMessage].map(m => ({ role: m.role, content: m.content }));
      for await (const delta of streamChat(history, DEFAULT_MODEL, 0.7, signal)) {
        content += delta;
        setMessages(prev => { const n = [...prev]; n[n.length - 1] = { ...n[n.length - 1], content, isStreaming: true }; return n; });
      }
    } catch (err: any) {
      if (!content) content = `**Error:** ${err.message || 'Connection failed'}`;
    }
    setMessages(prev => { const n = [...prev]; n[n.length - 1] = { ...n[n.length - 1], content, isStreaming: false, timestamp: Date.now() }; return n; });
    if (content) await saveMessage('assistant', content);
    return content;
  }, [messages, conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Send handler ─────────────────────────────────────────────────────────

  const handleSend = async (overrideInput?: string) => {
    const text = overrideInput || input;
    if (!text.trim() || isStreaming || !conversationId) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { toast({ title: 'Auth Required', description: 'Please sign in', variant: 'destructive' }); return; }
    const userMessage: Message = { role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);
    await saveMessage('user', text);
    if (messages.filter(m => m.role === 'user').length === 0) {
      const title = text.slice(0, 60) + (text.length > 60 ? '...' : '');
      await supabase.from('conversations').update({ title }).eq('id', conversationId);
      setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, title, updated_at: new Date().toISOString() } : c));
    }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      await sendCrowByte(userMessage, abortRef.current.signal);
    } catch (error) {
      toast({ title: 'Connection Error', description: error instanceof Error ? error.message : 'Failed', variant: 'destructive' });
    } finally { setIsStreaming(false); }
  };

  const handleStop = () => {
    abortRef.current?.abort(); abortRef.current = null;
    setIsStreaming(false);
  };

  // ─── Derived ──────────────────────────────────────────────────────────────

  const filteredConversations = useMemo(() =>
    search.trim() ? conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase())) : conversations,
    [conversations, search]
  );

  const grouped = useMemo(() => groupConversationsByDate(filteredConversations), [filteredConversations]);

  const currentConv = conversations.find(c => c.id === conversationId);

  const isConnected = true;

  const modelLabel = 'DeepSeek V3';

  const providerStyle = PROVIDER_STYLES[provider];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-[#111113] overflow-hidden">

      {/* ══ LEFT SIDEBAR ═══════════════════════════════════════════════════════ */}
      <div className="w-[240px] shrink-0 flex flex-col border-r border-white/[0.05] bg-[#0e0e10]">

        {/* Search + New */}
        <div className="p-3 space-y-2 border-b border-white/[0.04]">
          <button
            onClick={createNewConversation}
            className="w-full flex items-center justify-center gap-2 h-8 rounded-lg bg-white/[0.07] hover:bg-white/[0.1] text-zinc-300 text-xs font-medium transition-colors"
          >
            <UilPlus size={13} />
            New chat
          </button>
          <div className="relative">
            <UilSearch size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full h-7 pl-7 pr-3 rounded-md bg-white/[0.04] border border-white/[0.05] text-[11px] text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-white/[0.1] focus:bg-white/[0.06] transition-all"
            />
          </div>
        </div>

        {/* Tools */}
        <div className="px-3 py-2 border-b border-white/[0.04]">
          <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600 px-1 pb-1">Tools</p>
          <div className="space-y-0.5">
            {[
              { icon: UilFlask,     label: 'Think',   hint: 'Deep reasoning' },
              { icon: UilBoltAlt,  label: 'Fusion',  hint: 'Multi-model' },
              { icon: UilCrosshair,label: 'Recon',   hint: 'Target recon' },
              { icon: UilRobot,    label: 'Report',  hint: 'Bug report' },
            ].map(({ icon: Icon, label, hint }) => (
              <button key={label} className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-colors group">
                <Icon size={13} />
                <span className="text-[11px] font-medium">{label}</span>
                <span className="text-[10px] text-zinc-700 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">{hint}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1">
          <div className="px-2 py-2">
            {grouped.length === 0 && (
              <p className="text-[11px] text-zinc-600 text-center py-6">No conversations yet</p>
            )}
            {grouped.map(group => (
              <div key={group.label} className="mb-3">
                <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-600 px-2 py-1">{group.label}</p>
                {group.items.map(conv => (
                  <div
                    key={conv.id}
                    onClick={() => { setConversationId(conv.id); setSearch(''); }}
                    className={`group relative flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
                      conversationId === conv.id
                        ? 'bg-white/[0.08] text-zinc-100'
                        : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                    }`}
                  >
                    {editingId === conv.id ? (
                      <input
                        autoFocus
                        value={editingTitle}
                        onChange={e => setEditingTitle(e.target.value)}
                        onBlur={() => renameConversation(conv.id, editingTitle)}
                        onKeyDown={e => { if (e.key === 'Enter') renameConversation(conv.id, editingTitle); if (e.key === 'Escape') setEditingId(null); }}
                        onClick={e => e.stopPropagation()}
                        className="flex-1 bg-transparent text-[11px] outline-none border-b border-zinc-500 text-zinc-100"
                      />
                    ) : (
                      <>
                        <span className="flex-1 text-[11px] truncate">{conv.title}</span>
                        <span className="text-[9px] text-zinc-600 shrink-0 group-hover:hidden">{timeAgo(conv.updated_at)}</span>
                        <div className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={e => { e.stopPropagation(); setEditingId(conv.id); setEditingTitle(conv.title); }}
                            className="p-0.5 rounded text-zinc-600 hover:text-zinc-300 transition-colors"
                          >
                            <UilPen size={10} />
                          </button>
                          <button
                            onClick={e => deleteConversation(conv.id, e)}
                            className="p-0.5 rounded text-zinc-600 hover:text-red-400 transition-colors"
                          >
                            <UilTrashAlt size={10} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Account footer */}
        <div className="px-3 py-2.5 border-t border-white/[0.04] flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
            <UilBolt size={11} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-zinc-300 font-medium truncate">CrowByte</p>
            <p className="text-[9px] text-zinc-600 truncate">Pro</p>
          </div>
          <button onClick={() => navigate('/settings')} className="text-zinc-600 hover:text-zinc-400 transition-colors">
            <UilCog size={13} />
          </button>
        </div>

      </div>

      {/* ══ MAIN ════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between h-11 px-4 border-b border-white/[0.04] bg-[#111113]/80 backdrop-blur-sm shrink-0">
          {/* Left: current chat title */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-[12px] text-zinc-500 truncate max-w-[220px]">
              {currentConv?.title || 'New chat'}
            </span>
          </div>

          {/* Center: model badge */}
          <button
            onClick={() => setRightOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.07] transition-colors absolute left-1/2 -translate-x-1/2"
          >
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? providerStyle.dot : 'bg-red-400'}`} />
            <span className="text-[11px] text-zinc-300 font-medium">{modelLabel}</span>
          </button>

          {/* Right: context + settings */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            {/* Context badge */}
            <AnimatePresence>
              {pageContext && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ duration: 0.15 }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium transition-opacity hover:opacity-80 ${pageContext.accent}`}
                  onClick={() => navigate(pageContext.path)}
                  title={`Go to ${pageContext.label}`}
                >
                  <pageContext.icon size={10} className={pageContext.color} />
                  <span className={pageContext.color}>{pageContext.label}</span>
                </motion.button>
              )}
            </AnimatePresence>

          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="max-w-2xl mx-auto px-5 py-6 space-y-5">
            {messages.length === 0 ? (
              <EmptyState
                provider={provider}
                onSendPrompt={(prompt) => {
                  setInput(prompt);
                  if (!prompt.includes('// paste') && !prompt.includes('XXXXX')) setTimeout(() => handleSend(prompt), 100);
                }}
              />
            ) : (
              messages.map((msg, i) => (
                <div key={i}>
                  {msg.role === 'user'
                    ? <UserMessage message={msg} onDelete={() => handleDeleteMessage(i)} />
                    : <AssistantMessage message={msg} onRegenerate={() => handleRegenerate(i)} onDelete={() => handleDeleteMessage(i)} />
                  }
                </div>
              ))
            )}
            {isStreaming && messages[messages.length - 1]?.content === '' && <TypingIndicator provider={provider} />}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => handleSend()}
          onStop={handleStop}
          isStreaming={isStreaming}
          provider={provider}
          modelLabel={modelLabel}
          providerLabel={providerStyle.label}
        />
      </div>

      {/* ══ RIGHT PANEL ═════════════════════════════════════════════════════════ */}
      <AnimatePresence initial={false}>
        {rightOpen && (
          <motion.div
            key="right"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 264, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden shrink-0 border-l border-white/[0.05]"
          >
            <div className="w-[264px] h-full bg-[#0e0e10] flex flex-col">
              <div className="flex items-center justify-between h-11 px-4 border-b border-white/[0.04] shrink-0">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Settings</span>
                <button onClick={() => setRightOpen(false)} className="text-zinc-600 hover:text-zinc-400 transition-colors">
                  <UilTimes size={14} />
                </button>
              </div>

              <ScrollArea className="flex-1">
                <div className="p-4 space-y-5">

                                    {/* Temperature */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Temperature</p>
                      <span className="text-[10px] font-mono text-zinc-400">{temperature.toFixed(2)}</span>
                    </div>
                    <Slider value={[temperature]} onValueChange={([v]) => setTemperature(v)} min={0} max={2} step={0.05} className="w-full" />
                    <div className="flex justify-between text-[9px] text-zinc-600">
                      <span>Precise</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  <div className="h-px bg-white/[0.04]" />

                  {/* Persona */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Agent Persona</p>
                    <Select value={agentPersona} onValueChange={setAgentPersona}>
                      <SelectTrigger className="h-8 bg-white/[0.04] border-white/[0.06] text-zinc-300 text-[11px] rounded-lg w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          { id: 'default',  label: '🤖 Default' },
                          { id: 'hacker',   label: '💻 Hacker / Pentester' },
                          { id: 'analyst',  label: '🔍 Threat Analyst' },
                          { id: 'defender', label: '🛡️ SOC Defender' },
                          { id: 'coder',    label: '⚙️ Security Coder' },
                          { id: 'reporter', label: '📋 Report Writer' },
                        ].map(p => <SelectItem key={p.id} value={p.id} className="text-xs">{p.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="h-px bg-white/[0.04]" />

                  {/* System prompt */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">System Prompt</p>
                    <Textarea
                      value={systemPrompt}
                      onChange={e => setSystemPrompt(e.target.value)}
                      placeholder="Override system prompt..."
                      className="min-h-[90px] text-[11px] bg-white/[0.04] border-white/[0.05] text-zinc-300 resize-none placeholder:text-zinc-600 rounded-lg leading-relaxed"
                    />
                  </div>

                  {/* Active context */}
                  {pageContext && (
                    <>
                      <div className="h-px bg-white/[0.04]" />
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Active Context</p>
                        <button
                          onClick={() => navigate(pageContext.path)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] hover:opacity-80 transition-opacity ${pageContext.accent}`}
                        >
                          <pageContext.icon size={12} className={pageContext.color} />
                          <span className={pageContext.color}>{pageContext.label}</span>
                          <span className="text-zinc-600 ml-auto text-[9px]">click to go back</span>
                        </button>
                      </div>
                    </>
                  )}

                </div>
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
