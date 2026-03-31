import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  GearSix, Sparkle, Robot, Lightning, SidebarSimple,
  CurrencyDollar, Lock, Crown,
} from '@phosphor-icons/react';
import { useToast } from '@/hooks/use-toast';
import { ConversationsSidebar } from '@/components/ConversationsSidebar';
import openClaw from '@/services/openclaw';
import claudeProvider, { type ClaudeStreamEvent } from '@/services/claude-provider';
import { analyticsService } from '@/services/analytics';
import { memoryEngine } from '@/services/memory-engine';
import { isWebAiAvailable, streamChat, getModels as getWebModels, getUsage, getTierInfo, type AiModel } from '@/services/web-ai-chat';

// Chat sub-components
import { AssistantMessage, UserMessage, TypingIndicator, type Message } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { EmptyState } from '@/components/chat/EmptyState';

// ─── Types ───────────────────────────────────────────

type Provider = 'claude' | 'openclaw' | 'crowbyte';

// ─── Provider Toggle ─────────────────────────────────

const PROVIDERS: { id: Provider; icon: typeof Sparkle; label: string; color: string }[] = [
  { id: 'claude', icon: Sparkle, label: 'Claude', color: 'violet' },
  { id: 'openclaw', icon: Robot, label: 'OpenClaw', color: 'emerald' },
  { id: 'crowbyte', icon: Lightning, label: 'CrowByte', color: 'blue' },
];

const ProviderToggle = ({
  provider, setProvider, showCrowByte,
}: { provider: Provider; setProvider: (p: Provider) => void; showCrowByte: boolean }) => (
  <div className="flex items-center bg-zinc-900/50 rounded-xl p-1 ring-1 ring-white/[0.06]">
    {PROVIDERS.filter(p => p.id !== 'crowbyte' || showCrowByte).map(p => {
      const active = provider === p.id;
      return (
        <button
          key={p.id}
          onClick={() => setProvider(p.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
            active
              ? `bg-${p.color}-500/10 text-${p.color}-400 ring-1 ring-${p.color}-500/20`
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <p.icon size={13} weight={active ? 'duotone' : 'bold'} />
          {p.label}
        </button>
      );
    })}
  </div>
);

// ─── Status Dot ──────────────────────────────────────

const StatusDot = ({ connected, label }: { connected: boolean; label: string }) => (
  <div className="flex items-center gap-1.5">
    <div className={`w-2 h-2 rounded-full transition-colors ${
      connected ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-red-400'
    }`} />
    <span className="text-[10px] text-zinc-500 font-medium">{label}</span>
  </div>
);

// ─── Main Chat Component ─────────────────────────────

const Chat = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [provider, setProvider] = useState<Provider>('claude');
  const [claudeModel, setClaudeModel] = useState('sonnet');
  const [openClawModel, setOpenClawModel] = useState('z-ai/glm5');
  const [openClawConnected, setOpenClawConnected] = useState(false);
  const [claudeAvailable, setClaudeAvailable] = useState(false);
  const [sessionCost, setSessionCost] = useState(0);

  // Web AI
  const [webAiAvailable, setWebAiAvailable] = useState(false);
  const [webAiModel, setWebAiModel] = useState('deepseek-ai/deepseek-v3.2');
  const [webAiModels, setWebAiModels] = useState<AiModel[]>([]);
  const [webAiUsage, setWebAiUsage] = useState<{ current: number; limit: number | null; tier: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // ─── Init ────────────────────────────────────────

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth'); return; }
      if (window.electronAPI?.claudeChat) setClaudeAvailable(true);
      try {
        const health = await openClaw.healthCheck();
        setOpenClawConnected(health.ok);
      } catch { setOpenClawConnected(false); }

      if (isWebAiAvailable()) {
        setWebAiAvailable(true);
        const [modelsResult, usage] = await Promise.all([getWebModels(), getUsage()]);
        if (modelsResult.models.length > 0) setWebAiModels(modelsResult.models);
        if (usage) setWebAiUsage({ current: usage.current, limit: usage.limit, tier: usage.tier });
        if (!window.electronAPI?.claudeChat) setProvider('crowbyte');
      }

      if (!conversationId) await createNewConversation();
    };
    init();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) navigate('/auth');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (conversationId) loadMessages(conversationId);
  }, [conversationId]);

  // Health check polling
  useEffect(() => {
    const check = async () => {
      try { const h = await openClaw.healthCheck(); setOpenClawConnected(h.ok); }
      catch { setOpenClawConnected(false); }
    };
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  // ─── Supabase ──────────────────────────────────

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from('messages').select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (data && data.length > 0) {
      setMessages(data.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
        provider: m.provider as Provider | undefined,
        model: m.model,
        timestamp: m.created_at ? new Date(m.created_at).getTime() : undefined,
      })));
    } else {
      setMessages([]);
    }
  };

  const createNewConversation = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: user.id, title: 'New Conversation' })
      .select('id, title, updated_at').single();
    if (error) {
      console.warn('[Chat] Failed to create conversation:', error.message);
      toast({ title: 'Error', description: 'Failed to create chat', variant: 'destructive' });
      return;
    }
    setConversationId(data.id);
    setMessages([]);
    setSessionCost(0);
  };

  const handleSelectConversation = (convId: string) => {
    setConversationId(convId);
    setSessionCost(0);
  };

  const saveMessage = async (role: string, content: string) => {
    if (!conversationId) return;
    const { error } = await supabase.from('messages').insert({
      conversation_id: conversationId, role, content,
      provider, model: provider === 'claude' ? claudeModel : provider === 'openclaw' ? openClawModel : webAiModel,
    });
    if (error) console.warn('[Chat] Failed to save message:', error.message);
    memoryEngine.saveChat({ content, role: role as 'user' | 'assistant', session_id: conversationId, source: 'chat' });
  };

  // ─── Delete Message ────────────────────────────

  const handleDeleteMessage = async (index: number) => {
    setMessages(prev => prev.filter((_, i) => i !== index));
    // Could also delete from DB but messages table doesn't have individual IDs exposed in our current flow
  };

  // ─── Regenerate ────────────────────────────────

  const handleRegenerate = async (index: number) => {
    // Find the last user message before this assistant message
    const userMsgIdx = messages.slice(0, index).findLastIndex(m => m.role === 'user');
    if (userMsgIdx < 0) return;

    // Remove all messages after the user message
    const trimmed = messages.slice(0, userMsgIdx + 1);
    setMessages(trimmed);

    const userMessage = trimmed[userMsgIdx];
    setIsStreaming(true);

    try {
      if (provider === 'claude') await sendClaude(userMessage);
      else if (provider === 'openclaw') await sendOpenClaw(userMessage);
      else await sendCrowByte(userMessage);
    } catch (err) {
      toast({ title: 'Error', description: 'Regeneration failed', variant: 'destructive' });
    } finally {
      setIsStreaming(false);
    }
  };

  // ─── Claude Send ───────────────────────────────

  const sendClaude = useCallback(async (userMessage: Message) => {
    claudeProvider.setModel(claudeModel);
    claudeProvider.clearListeners();

    let assistantContent = '';
    let totalCost = 0;
    let modelUsed = claudeModel;

    setMessages(prev => [...prev, {
      role: 'assistant', content: '', isStreaming: true,
      provider: 'claude', model: claudeModel, timestamp: Date.now(),
    }]);

    const removeListener = claudeProvider.onEvent((event: ClaudeStreamEvent) => {
      switch (event.type) {
        case 'text':
          assistantContent += event.content;
          if (event.model) modelUsed = event.model;
          break;
        case 'thinking':
          assistantContent += `<think>${event.content}</think>`;
          break;
        case 'tool_call':
          assistantContent += `\n\`\`\`bash\n$ ${event.content}\n\`\`\`\n`;
          break;
        case 'tool_result': {
          const truncated = event.content.length > 3000
            ? event.content.slice(0, 3000) + '\n[... truncated ...]'
            : event.content;
          assistantContent += `\`\`\`\n${truncated}\n\`\`\`\n`;
          break;
        }
        case 'cost':
          totalCost = event.costUsd || 0;
          setSessionCost(prev => prev + totalCost);
          break;
        case 'system':
          break;
        case 'error':
          assistantContent += `\n**Error:** ${event.content}\n`;
          break;
      }

      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant', content: assistantContent, isStreaming: true,
          provider: 'claude', model: modelUsed,
        };
        return next;
      });
    });

    try { await claudeProvider.send(userMessage.content); }
    finally { removeListener(); }

    setMessages(prev => {
      const next = [...prev];
      next[next.length - 1] = {
        role: 'assistant', content: assistantContent, isStreaming: false,
        provider: 'claude', model: modelUsed, cost: totalCost || undefined, timestamp: Date.now(),
      };
      return next;
    });

    if (assistantContent) await saveMessage('assistant', assistantContent);
    return assistantContent;
  }, [claudeModel, conversationId]);

  // ─── OpenClaw Send ─────────────────────────────

  const sendOpenClaw = useCallback(async (userMessage: Message) => {
    let assistantContent = '';

    setMessages(prev => [...prev, {
      role: 'assistant', content: '', isStreaming: true,
      provider: 'openclaw', model: openClawModel, timestamp: Date.now(),
    }]);

    const executeCommand = async (cmd: string): Promise<string> => {
      if (window.electronAPI?.executeCommand) return await window.electronAPI.executeCommand(cmd);
      return 'Error: Not running in Electron';
    };

    openClaw.setModel(openClawModel);
    const stream = openClaw.agenticChat(
      [...messages, userMessage].map(m => ({ role: m.role, content: m.content })),
      executeCommand, openClawModel, 0.7,
    );

    for await (const event of stream) {
      if (event.type === 'text') assistantContent += event.content;
      else if (event.type === 'tool_call') assistantContent += `\n\`\`\`bash\n$ ${event.content}\n\`\`\`\n`;
      else if (event.type === 'tool_result') {
        const truncated = event.content.length > 2000
          ? event.content.slice(0, 2000) + '\n[... truncated ...]'
          : event.content;
        assistantContent += `\`\`\`\n${truncated}\n\`\`\`\n`;
      }

      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant', content: assistantContent, isStreaming: true,
          provider: 'openclaw', model: openClawModel,
        };
        return next;
      });
    }

    setMessages(prev => {
      const next = [...prev];
      next[next.length - 1] = {
        role: 'assistant', content: assistantContent, isStreaming: false,
        provider: 'openclaw', model: openClawModel, timestamp: Date.now(),
      };
      return next;
    });

    if (assistantContent) await saveMessage('assistant', assistantContent);
    return assistantContent;
  }, [openClawModel, messages, conversationId]);

  // ─── CrowByte Web AI Send ─────────────────────

  const sendCrowByte = useCallback(async (userMessage: Message) => {
    let assistantContent = '';

    setMessages(prev => [...prev, {
      role: 'assistant', content: '', isStreaming: true,
      provider: 'crowbyte', model: webAiModel, timestamp: Date.now(),
    }]);

    const chatMessages = [...messages, userMessage].map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    for await (const chunk of streamChat(chatMessages, webAiModel)) {
      if (chunk.type === 'text') assistantContent += chunk.content;
      else if (chunk.type === 'error') assistantContent += `\n**Error:** ${chunk.content}\n`;
      else if (chunk.type === 'done') break;

      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant', content: assistantContent, isStreaming: true,
          provider: 'crowbyte', model: webAiModel,
        };
        return next;
      });
    }

    setMessages(prev => {
      const next = [...prev];
      next[next.length - 1] = {
        role: 'assistant', content: assistantContent, isStreaming: false,
        provider: 'crowbyte', model: webAiModel, timestamp: Date.now(),
      };
      return next;
    });

    const usage = await getUsage();
    if (usage) setWebAiUsage({ current: usage.current, limit: usage.limit, tier: usage.tier });
    if (assistantContent) await saveMessage('assistant', assistantContent);
    return assistantContent;
  }, [webAiModel, messages, conversationId]);

  // ─── Send Handler ──────────────────────────────

  const handleSend = async (overrideInput?: string) => {
    const text = overrideInput || input;
    if (!text.trim() || isStreaming || !conversationId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: 'Auth Required', description: 'Please sign in', variant: 'destructive' });
      return;
    }

    const userMessage: Message = { role: 'user', content: text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsStreaming(true);

    await saveMessage('user', userMessage.content);

    const isFirst = messages.filter(m => m.role === 'user').length === 0;
    if (isFirst) {
      const title = userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : '');
      await supabase.from('conversations').update({ title }).eq('id', conversationId);
    }

    const chatStartTime = Date.now();
    const activeModel = provider === 'claude' ? claudeModel : provider === 'openclaw' ? openClawModel : webAiModel;

    try {
      if (provider === 'claude') await sendClaude(userMessage);
      else if (provider === 'openclaw') await sendOpenClaw(userMessage);
      else await sendCrowByte(userMessage);

      await analyticsService.logChat({
        model: activeModel,
        messageLength: messages.length,
        responseTimeMs: Date.now() - chatStartTime,
        status: 'success',
      });
    } catch (error) {
      console.error('Chat error:', error);
      await analyticsService.logChat({
        model: activeModel,
        messageLength: 0,
        responseTimeMs: Date.now() - chatStartTime,
        status: 'error',
      });
      toast({
        title: 'Connection Error',
        description: error instanceof Error ? error.message : `Failed to connect to ${provider}`,
        variant: 'destructive',
      });
      setMessages(prev => prev.filter((m, i) => i !== prev.length - 1 || m.content !== ''));
    } finally {
      setIsStreaming(false);
    }
  };

  const handleStop = async () => {
    if (provider === 'claude') await claudeProvider.stop();
    setIsStreaming(false);
  };

  // ─── Derived State ─────────────────────────────

  const isConnected = provider === 'claude' ? claudeAvailable
    : provider === 'openclaw' ? openClawConnected
    : webAiAvailable;

  const statusLabel = provider === 'claude'
    ? (claudeAvailable ? 'Ready' : 'Unavailable')
    : provider === 'openclaw'
    ? (openClawConnected ? 'Connected' : 'Offline')
    : (webAiAvailable ? 'Online' : 'Unavailable');

  const currentModelLabel = provider === 'claude'
    ? claudeProvider.getModels().find(m => m.id === claudeModel)?.name || claudeModel
    : provider === 'openclaw'
    ? openClaw.getModels().find(m => m.id === openClawModel)?.name || openClawModel
    : webAiModels.find(m => m.id === webAiModel)?.name || webAiModel;

  const providerLabel = provider === 'claude' ? 'Claude' : provider === 'openclaw' ? 'OpenClaw' : 'CrowByte';

  // ─── Render ────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Sidebar */}
      {sidebarOpen && (
        <ConversationsSidebar
          currentConversationId={conversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={createNewConversation}
        />
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* ─── Header ──────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.04] bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            {/* Toggle sidebar */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-300"
              onClick={() => setSidebarOpen(v => !v)}
              aria-label="Toggle sidebar"
            >
              <SidebarSimple size={18} weight="bold" />
            </Button>

            {/* Provider toggle */}
            <ProviderToggle
              provider={provider}
              setProvider={setProvider}
              showCrowByte={webAiAvailable}
            />

            {/* Status */}
            <StatusDot connected={isConnected} label={statusLabel} />

            {/* Session cost */}
            {sessionCost > 0 && (
              <div className="flex items-center gap-1">
                <CurrencyDollar size={11} weight="bold" className="text-amber-500/50" />
                <span className="text-[10px] text-amber-500/70 font-mono">${sessionCost.toFixed(4)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Model selector */}
            {provider === 'claude' ? (
              <Select value={claudeModel} onValueChange={setClaudeModel}>
                <SelectTrigger className="w-[180px] h-8 bg-zinc-900/50 border-white/[0.06] text-zinc-300 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {claudeProvider.getModels().map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : provider === 'openclaw' ? (
              <Select value={openClawModel} onValueChange={setOpenClawModel}>
                <SelectTrigger className="w-[220px] h-8 bg-zinc-900/50 border-white/[0.06] text-zinc-300 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {openClaw.getModels().map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center gap-2">
                <Select value={webAiModel} onValueChange={(v) => {
                  const model = webAiModels.find(m => m.id === v);
                  if (model?.locked) {
                    toast({ title: 'Model Locked', description: `${model.name} requires Pro tier. Upgrade in Settings.`, variant: 'destructive' });
                    return;
                  }
                  setWebAiModel(v);
                }}>
                  <SelectTrigger className="w-[220px] h-8 bg-zinc-900/50 border-white/[0.06] text-zinc-300 text-xs rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {webAiModels.map(m => (
                      <SelectItem key={m.id} value={m.id} disabled={m.locked}>
                        <span className="flex items-center gap-1.5">
                          {m.locked && <Lock size={11} weight="bold" className="text-zinc-500" />}
                          {m.name}
                          {m.tier === 'pro' && !m.locked && <Crown size={11} weight="fill" className="text-amber-400" />}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Tier badge + usage */}
                {webAiUsage && (
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-5 border-blue-500/20 text-blue-400 uppercase">
                      {webAiUsage.tier}
                    </Badge>
                    {webAiUsage.limit !== null && (
                      <span className="text-[10px] text-blue-400/70 font-mono whitespace-nowrap">
                        {webAiUsage.current}/{webAiUsage.limit}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Settings */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-300" aria-label="Settings">
                  <GearSix size={16} weight="bold" />
                </Button>
              </SheetTrigger>
              <SheetContent className="bg-zinc-950 border-white/[0.06] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle className="text-zinc-200">Configuration</SheetTitle>
                  <SheetDescription className="text-zinc-500">AI providers and settings</SheetDescription>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  {/* Claude */}
                  <div>
                    <Label className="text-zinc-200 flex items-center gap-2">
                      <Sparkle size={16} weight="bold" className="text-violet-400" />
                      Claude Code CLI
                    </Label>
                    <div className="mt-3 space-y-2">
                      {([
                        ['Status', claudeAvailable ? 'Ready' : 'Unavailable', claudeAvailable ? 'text-violet-400' : 'text-red-400'],
                        ['Environment', '.env-unfiltered', 'text-violet-400'],
                        ['Tools', '344+ (MCP + Bash + All)', 'text-violet-400'],
                        ['Permissions', 'Bypass All', 'text-red-400'],
                        ['Session Cost', `$${sessionCost.toFixed(4)}`, 'text-amber-400'],
                      ] as const).map(([label, value, cls]) => (
                        <Card key={label} className="p-3 bg-zinc-900/50 ring-1 ring-white/[0.06]">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-300">{label}</span>
                            <Badge variant="outline" className={`${cls} border-transparent`}>{value}</Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                  <Separator className="bg-white/[0.04]" />
                  {/* OpenClaw */}
                  <div>
                    <Label className="text-zinc-200 flex items-center gap-2">
                      <Robot size={16} weight="bold" className="text-emerald-400" />
                      OpenClaw (NVIDIA Free)
                    </Label>
                    <div className="mt-3 space-y-2">
                      {([
                        ['VPS', openClawConnected ? 'Connected' : 'Offline', openClawConnected ? 'text-emerald-400' : 'text-red-400'],
                        ['Cost', '$0 (Free)', 'text-emerald-400'],
                        ['Agents', '9 Active', 'text-blue-400'],
                      ] as const).map(([label, value, cls]) => (
                        <Card key={label} className="p-3 bg-zinc-900/50 ring-1 ring-white/[0.06]">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-zinc-300">{label}</span>
                            <Badge variant="outline" className={`${cls} border-transparent`}>{value}</Badge>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                  {webAiAvailable && (
                    <>
                      <Separator className="bg-white/[0.04]" />
                      <div>
                        <Label className="text-zinc-200 flex items-center gap-2">
                          <Lightning size={16} weight="bold" className="text-blue-400" />
                          CrowByte AI (Web)
                        </Label>
                        <div className="mt-3 space-y-2">
                          {([
                            ['Status', 'Online', 'text-blue-400'],
                            ['Tier', webAiUsage?.tier?.toUpperCase() || 'FREE', 'text-blue-400'],
                            ['Usage', webAiUsage ? (webAiUsage.limit === null ? 'Unlimited' : `${webAiUsage.current}/${webAiUsage.limit}`) : 'N/A', 'text-blue-300'],
                            ['Models', `${webAiModels.length} available`, 'text-zinc-400'],
                            ['Cost', '$0 (Included)', 'text-emerald-400'],
                          ] as const).map(([label, value, cls]) => (
                            <Card key={label} className="p-3 bg-zinc-900/50 ring-1 ring-white/[0.06]">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-zinc-300">{label}</span>
                                <Badge variant="outline" className={`${cls} border-transparent`}>{value}</Badge>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  <Separator className="bg-white/[0.04]" />
                  <Card className="p-3 bg-zinc-900/50 ring-1 ring-white/[0.06]">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-300">Chat History</span>
                      <Badge variant="outline" className="text-blue-400 border-transparent">Supabase</Badge>
                    </div>
                  </Card>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* ─── Messages Area ───────────────────── */}
        <ScrollArea className="flex-1">
          <div className="space-y-6 max-w-3xl mx-auto px-6 py-6">
            {messages.length === 0 ? (
              <EmptyState
                provider={provider}
                onSendPrompt={(prompt) => {
                  setInput(prompt);
                  // Auto-send if it's a complete prompt (no placeholder markers)
                  if (!prompt.includes('// paste') && !prompt.includes('XXXXX')) {
                    setTimeout(() => handleSend(prompt), 100);
                  }
                }}
              />
            ) : (
              messages.map((message, index) => (
                <div key={index}>
                  {message.role === 'user' ? (
                    <UserMessage
                      message={message}
                      onDelete={() => handleDeleteMessage(index)}
                    />
                  ) : (
                    <AssistantMessage
                      message={message}
                      onRegenerate={() => handleRegenerate(index)}
                      onDelete={() => handleDeleteMessage(index)}
                    />
                  )}
                </div>
              ))
            )}

            {isStreaming && messages[messages.length - 1]?.content === '' && (
              <TypingIndicator provider={provider} />
            )}

            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* ─── Input ───────────────────────────── */}
        <ChatInput
          value={input}
          onChange={setInput}
          onSend={() => handleSend()}
          onStop={handleStop}
          isStreaming={isStreaming}
          provider={provider}
          modelLabel={currentModelLabel}
          providerLabel={providerLabel}
        />
      </div>
    </div>
  );
};

export default Chat;
