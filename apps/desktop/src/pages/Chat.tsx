import { useState, useRef, useEffect, useCallback } from"react";
import { useNavigate } from"react-router-dom";
import { supabase } from"@/integrations/supabase/client";
import { Button } from"@/components/ui/button";
import { ScrollArea } from"@/components/ui/scroll-area";
import { Card } from"@/components/ui/card";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from"@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Badge } from"@/components/ui/badge";
import { Separator } from"@/components/ui/separator";
import { Label } from"@/components/ui/label";
import { Textarea } from"@/components/ui/textarea";
import { PaperPlaneTilt, GearSix, CircleNotch, Terminal, Plug, CheckCircle, XCircle, CaretDown, CaretRight, Brain, Lightning, CurrencyDollar, Robot, Square, Sparkle, User, Copy, Check } from "@phosphor-icons/react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from"@/components/ui/collapsible";
import { useToast } from"@/hooks/use-toast";
import { ConversationsSidebar } from"@/components/ConversationsSidebar";
import openClaw from"@/services/openclaw";
import claudeProvider, { type ClaudeStreamEvent } from"@/services/claude-provider";
import { analyticsService } from"@/services/analytics";
import { memoryEngine } from"@/services/memory-engine";
import ReactMarkdown from"react-markdown";
import remarkGfm from"remark-gfm";

// ─── Types ───────────────────────────────────────────────

type Provider = 'claude' | 'openclaw';

interface Message {
 role:"user" |"assistant";
 content: string;
 isStreaming?: boolean;
 provider?: Provider;
 cost?: number;
 model?: string;
 timestamp?: number;
}

interface ParsedMessage {
 thinking?: string;
 content: string;
}

// ─── Helpers ─────────────────────────────────────────────

const parseThinking = (content: string): ParsedMessage => {
 const thinkingRegex = /<think>([\s\S]*?)<\/think>/g;
 const matches = content.match(thinkingRegex);
 if (!matches) return { content };

 const thinking = matches
 .map(match => match.replace(/<\/?think>/g, '').trim())
 .join('\n\n');
 const cleanContent = content.replace(thinkingRegex, '').trim();
 return { thinking, content: cleanContent };
};

// Strip system init noise from content
const cleanSystemNoise = (content: string): string => {
 return content
 .replace(/\n?>\s*\*Claude Code v[\s\S]*?\*\n?/g, '')
 .replace(/\n?>\s*\*claude-[\s\S]*?\*\n?/g, '')
 .trim();
};

const formatTime = (ts?: number) => {
 if (!ts) return '';
 const d = new Date(ts);
 return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ─── Copy Button ─────────────────────────────────────────

const CopyButton = ({ text }: { text: string }) => {
 const [copied, setCopied] = useState(false);
 const handleCopy = () => {
 navigator.clipboard.writeText(text);
 setCopied(true);
 setTimeout(() => setCopied(false), 1500);
 };
 return (
 <button
 onClick={handleCopy}
 className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
 title="Copy"
 >
 {copied ? <Check size={12} weight="bold" className="text-emerald-500" /> : <Copy size={12} weight="bold" className="text-muted-foreground" />}
 </button>
 );
};

// ─── Assistant Message ───────────────────────────────────

const AssistantMessage = ({ message }: { message: Message }) => {
 const parsed = parseThinking(message.content);
 const cleanContent = cleanSystemNoise(parsed.content || message.content);
 const [isThinkingOpen, setIsThinkingOpen] = useState(false);
 const showThinking = parsed.thinking && !message.isStreaming;

 return (
 <div className="flex gap-3 animate-msg-left group">
 {/* Avatar */}
 <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${
 message.provider === 'claude'
 ? 'bg-transparent ring-1 ring-violet-500/30'
 : 'bg-transparent ring-1 ring-emerald-500/30'
 }`}>
 {message.provider === 'claude'
 ? <Sparkle size={14} weight="bold" className="text-violet-500" />
 : <Robot size={14} weight="bold" className="text-emerald-500" />
 }
 </div>

 {/* Content */}
 <div className="flex-1 min-w-0 space-y-1.5">
 {/* Header */}
 <div className="flex items-center gap-2">
 <span className={`text-xs font-medium ${
 message.provider === 'claude' ? 'text-violet-500' : 'text-emerald-500'
 }`}>
 {message.provider === 'claude' ? 'Claude' : 'OpenClaw'}
 </span>
 {message.model && (
 <span className="text-[10px] text-muted-foreground/60">{message.model}</span>
 )}
 {message.timestamp && (
 <span className="text-[10px] text-muted-foreground/40">{formatTime(message.timestamp)}</span>
 )}
 <CopyButton text={cleanContent} />
 </div>

 {/* Thinking */}
 {showThinking && (
 <Collapsible open={isThinkingOpen} onOpenChange={setIsThinkingOpen}>
 <CollapsibleTrigger className="w-full">
 <div className="flex items-center gap-1.5 py-1 px-2 rounded-md bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer w-fit">
 {isThinkingOpen
 ? <CaretDown size={12} weight="bold" className="text-violet-500/70" />
 : <CaretRight size={12} weight="bold" className="text-violet-500/70" />
 }
 <Brain size={12} weight="bold" className="text-violet-500/70" />
 <span className="text-[11px] text-muted-foreground/70">Thinking</span>
 </div>
 </CollapsibleTrigger>
 <CollapsibleContent className="mt-1.5">
 <div className="p-3 rounded-lg bg-black/20">
 <p className="text-xs text-muted-foreground/70 whitespace-pre-wrap font-mono leading-relaxed">
 {parsed.thinking}
 </p>
 </div>
 </CollapsibleContent>
 </Collapsible>
 )}

 {/* Main content — rendered markdown */}
 <div className="chat-markdown">
 <ReactMarkdown remarkPlugins={[remarkGfm]}>
 {cleanContent}
 </ReactMarkdown>
 </div>

 {/* Cost */}
 {message.cost && !message.isStreaming && (
 <div className="flex items-center gap-1">
 <CurrencyDollar size={10} weight="bold" className="text-yellow-500/50" />
 <span className="text-[10px] text-muted-foreground/50">${message.cost.toFixed(4)}</span>
 </div>
 )}
 </div>
 </div>
 );
};

// ─── User Message ────────────────────────────────────────

const UserMessage = ({ message }: { message: Message }) => (
 <div className="flex gap-3 justify-end animate-msg-right">
 <div className="max-w-[75%] space-y-1">
 {/* Timestamp */}
 {message.timestamp && (
 <div className="text-right">
 <span className="text-[10px] text-muted-foreground/40">{formatTime(message.timestamp)}</span>
 </div>
 )}
 {/* Bubble */}
 <div className="relative">
 <div className="absolute -inset-[1px] bg-gradient-to-br from-violet-500/30 via-purple-500/20 to-fuchsia-500/30 rounded-2xl rounded-br-sm blur-[1px]" />
 <div className="relative bg-gradient-to-br from-violet-500/15 to-purple-500/10 backdrop-blur-sm rounded-2xl rounded-br-sm px-4 py-2.5 ring-1 ring-violet-500/10">
 <p className="text-sm text-gray-100 whitespace-pre-wrap leading-relaxed">{message.content}</p>
 </div>
 </div>
 </div>
 {/* Avatar */}
 <div className="flex-shrink-0 w-7 h-7 rounded-full bg-transparent ring-1 ring-violet-500/40 flex items-center justify-center mt-0.5">
 <User size={14} weight="bold" className="text-violet-300" />
 </div>
 </div>
);

// ─── Typing Indicator ────────────────────────────────────

const TypingIndicator = ({ provider }: { provider: Provider }) => (
 <div className="flex gap-3 animate-msg-left">
 <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
 provider === 'claude' ? 'bg-transparent ring-1 ring-violet-500/30' : 'bg-transparent ring-1 ring-emerald-500/30'
 }`}>
 {provider === 'claude'
 ? <Sparkle size={14} weight="bold" className="text-violet-500 animate-pulse-glow" />
 : <Robot size={14} weight="bold" className="text-emerald-500 animate-pulse-glow" />
 }
 </div>
 <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted/20">
 <div className="flex gap-1">
 <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
 <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
 <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
 </div>
 <span className="text-xs text-muted-foreground/60 ml-1">
 {provider === 'claude' ? 'Claude is thinking' : 'Processing'}
 </span>
 </div>
 </div>
);

// ─── Main Chat Component ─────────────────────────────────

const Chat = () => {
 const { toast } = useToast();
 const navigate = useNavigate();
 const [conversationId, setConversationId] = useState<string | null>(null);
 const [messages, setMessages] = useState<Message[]>([]);
 const [input, setInput] = useState("");
 const [isStreaming, setIsStreaming] = useState(false);

 const [provider, setProvider] = useState<Provider>('claude');
 const [claudeModel, setClaudeModel] = useState('sonnet');
 const [openClawModel, setOpenClawModel] = useState('z-ai/glm5');
 const [openClawConnected, setOpenClawConnected] = useState(false);
 const [claudeAvailable, setClaudeAvailable] = useState(false);
 const [sessionCost, setSessionCost] = useState(0);

 const scrollRef = useRef<HTMLDivElement>(null);

 // ─── Auth + Health ───────────────────────────────────

 useEffect(() => {
 const init = async () => {
 const { data: { session } } = await supabase.auth.getSession();
 if (!session) { navigate("/auth"); return; }
 if (window.electronAPI?.claudeChat) setClaudeAvailable(true);
 try {
 const health = await openClaw.healthCheck();
 setOpenClawConnected(health.ok);
 } catch { setOpenClawConnected(false); }
 if (!conversationId) await createNewConversation();
 };
 init();
 const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
 if (!session) navigate("/auth");
 });
 return () => subscription.unsubscribe();
 }, [navigate]);

 useEffect(() => {
 if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior:"smooth" });
 }, [messages]);

 useEffect(() => {
 if (conversationId) loadMessages(conversationId);
 }, [conversationId]);

 useEffect(() => {
 const check = async () => {
 try { const h = await openClaw.healthCheck(); setOpenClawConnected(h.ok); }
 catch { setOpenClawConnected(false); }
 };
 const interval = setInterval(check, 30000);
 return () => clearInterval(interval);
 }, []);

 // ─── Supabase ────────────────────────────────────────

 const loadMessages = async (convId: string) => {
 const { data } = await supabase
 .from('messages').select('*')
 .eq('conversation_id', convId)
 .order('created_at', { ascending: true });
 if (data && data.length > 0) {
 setMessages(data.map(m => ({
 role: m.role as"user" |"assistant",
 content: m.content,
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
 console.warn('[Chat] Failed to create conversation:', error.message, error.code);
 toast({ title:"Error", description:"Failed to create chat", variant:"destructive" });
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
 const { error } = await supabase.from('messages').insert({ conversation_id: conversationId, role, content });
 if (error) console.warn('[Chat] Failed to save message:', error.message, error.code);

 // Fire-and-forget to memory-engine
 memoryEngine.saveChat({
 content,
 role: role as 'user' | 'assistant',
 session_id: conversationId,
 source: 'chat',
 });
 };

 // ─── Claude Send ─────────────────────────────────────

 const sendClaude = useCallback(async (userMessage: Message) => {
 claudeProvider.setModel(claudeModel);
 claudeProvider.clearListeners();

 let assistantContent ="";
 let totalCost = 0;
 let modelUsed = claudeModel;

 setMessages(prev => [...prev, {
 role:"assistant", content:"", isStreaming: true,
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
 // Don't inject system init into chat content
 break;
 case 'error':
 assistantContent += `\n**Error:** ${event.content}\n`;
 break;
 }

 setMessages(prev => {
 const next = [...prev];
 next[next.length - 1] = {
 role:"assistant", content: assistantContent, isStreaming: true,
 provider: 'claude', model: modelUsed,
 };
 return next;
 });
 });

 try {
 await claudeProvider.send(userMessage.content);
 } finally {
 removeListener();
 }

 setMessages(prev => {
 const next = [...prev];
 next[next.length - 1] = {
 role:"assistant", content: assistantContent, isStreaming: false,
 provider: 'claude', model: modelUsed, cost: totalCost || undefined,
 timestamp: Date.now(),
 };
 return next;
 });

 if (assistantContent) await saveMessage('assistant', assistantContent);
 return assistantContent;
 }, [claudeModel, conversationId]);

 // ─── OpenClaw Send ───────────────────────────────────

 const sendOpenClaw = useCallback(async (userMessage: Message) => {
 let assistantContent ="";

 setMessages(prev => [...prev, {
 role:"assistant", content:"", isStreaming: true,
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
 if (event.type === 'text') {
 assistantContent += event.content;
 } else if (event.type === 'tool_call') {
 assistantContent += `\n\`\`\`bash\n$ ${event.content}\n\`\`\`\n`;
 } else if (event.type === 'tool_result') {
 const truncated = event.content.length > 2000
 ? event.content.slice(0, 2000) + '\n[... truncated ...]'
 : event.content;
 assistantContent += `\`\`\`\n${truncated}\n\`\`\`\n`;
 }

 setMessages(prev => {
 const next = [...prev];
 next[next.length - 1] = {
 role:"assistant", content: assistantContent, isStreaming: true,
 provider: 'openclaw', model: openClawModel,
 };
 return next;
 });
 }

 setMessages(prev => {
 const next = [...prev];
 next[next.length - 1] = {
 role:"assistant", content: assistantContent, isStreaming: false,
 provider: 'openclaw', model: openClawModel, timestamp: Date.now(),
 };
 return next;
 });

 if (assistantContent) await saveMessage('assistant', assistantContent);
 return assistantContent;
 }, [openClawModel, messages, conversationId]);

 // ─── Send Handler ────────────────────────────────────

 const handleSend = async () => {
 if (!input.trim() || isStreaming || !conversationId) return;

 const { data: { session } } = await supabase.auth.getSession();
 if (!session) {
 toast({ title:"Auth Required", description:"Please sign in", variant:"destructive" });
 return;
 }

 const userMessage: Message = { role:"user", content: input, timestamp: Date.now() };
 setMessages(prev => [...prev, userMessage]);
 setInput("");
 setIsStreaming(true);

 await saveMessage('user', userMessage.content);

 const isFirst = messages.filter(m => m.role === 'user').length === 0;
 if (isFirst) {
 const title = userMessage.content.slice(0, 50) + (userMessage.content.length > 50 ? '...' : '');
 await supabase.from('conversations').update({ title }).eq('id', conversationId);
 }

 const chatStartTime = Date.now();

 try {
 if (provider === 'claude') await sendClaude(userMessage);
 else await sendOpenClaw(userMessage);

 await analyticsService.logChat({
 model: provider === 'claude' ? claudeModel : openClawModel,
 messageLength: messages.length,
 responseTimeMs: Date.now() - chatStartTime,
 status: 'success',
 });
 } catch (error) {
 console.error("Chat error:", error);
 await analyticsService.logChat({
 model: provider === 'claude' ? claudeModel : openClawModel,
 messageLength: 0,
 responseTimeMs: Date.now() - chatStartTime,
 status: 'error',
 });
 toast({
 title:"Connection Error",
 description: error instanceof Error ? error.message : `Failed to connect to ${provider}`,
 variant:"destructive",
 });
 setMessages(prev => prev.filter((m, i) => i !== prev.length - 1 || m.content !==""));
 } finally {
 setIsStreaming(false);
 }
 };

 const handleStop = async () => {
 if (provider === 'claude') await claudeProvider.stop();
 setIsStreaming(false);
 };

 const currentModelLabel = provider === 'claude'
 ? claudeProvider.getModels().find(m => m.id === claudeModel)?.name || claudeModel
 : openClaw.getModels().find(m => m.id === openClawModel)?.name || openClawModel;

 // ─── Render ──────────────────────────────────────────

 return (
 <div className="flex h-[calc(100vh-5rem)] gap-4">
 <ConversationsSidebar
 currentConversationId={conversationId}
 onSelectConversation={handleSelectConversation}
 onNewConversation={createNewConversation}
 />

 <div className="flex-1 flex flex-col">
 {/* ─── Header ─────────────────────────────────── */}
 <div className="flex justify-between items-center mb-3">
 <div className="flex items-center gap-3">
 <Terminal size={20} weight="duotone" className="text-primary" />
 <h1 className="text-xl font-bold text-foreground">CrowByte AI</h1>

 {/* Provider toggle */}
 <div className="flex items-center bg-muted/20 rounded-lg p-0.5 ring-1 ring-white/[0.06]">
 <button
 onClick={() => setProvider('claude')}
 className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
 provider === 'claude'
 ? 'bg-transparent text-violet-500 shadow-sm shadow-violet-500/10'
 : 'text-muted-foreground hover:text-foreground'
 }`}
 >
 <Sparkle size={12} weight="bold" className="inline mr-1" />Claude
 </button>
 <button
 onClick={() => setProvider('openclaw')}
 className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
 provider === 'openclaw'
 ? 'bg-transparent text-emerald-500 shadow-sm shadow-emerald-500/10'
 : 'text-muted-foreground hover:text-foreground'
 }`}
 >
 <Robot size={12} weight="bold" className="inline mr-1" />OpenClaw
 </button>
 </div>

 {/* Status dot */}
 <div className="flex items-center gap-1.5">
 <div className={`w-2 h-2 rounded-full ${
 (provider === 'claude' ? claudeAvailable : openClawConnected)
 ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-red-500'
 }`} />
 <span className="text-[10px] text-muted-foreground/60">
 {provider === 'claude'
 ? (claudeAvailable ? 'Ready' : 'Unavailable')
 : (openClawConnected ? 'Connected' : 'Offline')
 }
 </span>
 </div>

 {sessionCost > 0 && (
 <span className="text-[10px] text-amber-500/70 font-mono">${sessionCost.toFixed(4)}</span>
 )}
 </div>

 <div className="flex items-center gap-2">
 {provider === 'claude' ? (
 <Select value={claudeModel} onValueChange={setClaudeModel}>
 <SelectTrigger className="w-[200px] h-8 bg-background/50 border-border/50 text-white text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {claudeProvider.getModels().map(m => (
 <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 ) : (
 <Select value={openClawModel} onValueChange={setOpenClawModel}>
 <SelectTrigger className="w-[240px] h-8 bg-background/50 border-border/50 text-white text-xs">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {openClaw.getModels().map(m => (
 <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 )}

 <Sheet>
 <SheetTrigger asChild>
 <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
 <GearSix size={16} weight="bold" />
 </Button>
 </SheetTrigger>
 <SheetContent className="bg-card border-white/[0.06] overflow-y-auto">
 <SheetHeader>
 <SheetTitle className="text-white">Configuration</SheetTitle>
 <SheetDescription>AI providers and settings</SheetDescription>
 </SheetHeader>
 <div className="space-y-6 mt-6">
 <div>
 <Label className="text-white flex items-center gap-2">
 <Sparkle size={16} weight="bold" className="text-violet-500" />
 Claude Code CLI
 </Label>
 <div className="mt-3 space-y-2">
 {[
 ['Status', claudeAvailable ? 'Ready' : 'Unavailable', claudeAvailable ? 'bg-transparent text-violet-500' : 'bg-transparent text-red-500'],
 ['Environment', '.env-unfiltered', 'bg-transparent text-violet-500'],
 ['Tools', '344+ (MCP + Bash + All)', 'bg-transparent text-violet-500'],
 ['Permissions', 'Bypass All', 'bg-transparent text-red-500'],
 ['Session Cost', `$${sessionCost.toFixed(4)}`, 'bg-transparent text-amber-500'],
 ].map(([label, value, cls]) => (
 <Card key={label as string} className="p-3 ring-1 ring-white/[0.06]">
 <div className="flex items-center justify-between">
 <span className="text-sm text-white">{label}</span>
 <Badge className={cls as string}>{value}</Badge>
 </div>
 </Card>
 ))}
 </div>
 </div>
 <Separator />
 <div>
 <Label className="text-white flex items-center gap-2">
 <Robot size={16} weight="bold" className="text-emerald-500" />
 OpenClaw (NVIDIA Free)
 </Label>
 <div className="mt-3 space-y-2">
 {[
 ['VPS', openClawConnected ? 'Connected' : 'Offline', openClawConnected ? 'bg-transparent text-emerald-500' : 'bg-transparent text-red-500'],
 ['Cost', '$0 (Free)', 'bg-transparent text-emerald-500'],
 ['Agents', '9 Active', 'bg-primary/20 text-primary'],
 ].map(([label, value, cls]) => (
 <Card key={label as string} className="p-3 ring-1 ring-white/[0.06]">
 <div className="flex items-center justify-between">
 <span className="text-sm text-white">{label}</span>
 <Badge className={cls as string}>{value}</Badge>
 </div>
 </Card>
 ))}
 </div>
 </div>
 <Separator />
 <Card className="p-3">
 <div className="flex items-center justify-between">
 <span className="text-sm text-white">Chat History</span>
 <Badge className="bg-primary/20 text-primary">Supabase</Badge>
 </div>
 </Card>
 </div>
 </SheetContent>
 </Sheet>
 </div>
 </div>

 {/* ─── Chat Area ──────────────────────────────── */}
 <Card className="flex-1 flex flex-col /50 bg-card/30 backdrop-blur overflow-hidden">
 <ScrollArea className="flex-1 px-6 py-4">
 <div className="space-y-5 max-w-3xl mx-auto">
 {/* Welcome */}
 {messages.length === 0 && (
 <div className="flex flex-col items-center justify-center h-full py-20 animate-fade-in">
 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${
 provider === 'claude'
 ? 'bg-transparent ring-1 ring-violet-500/20'
 : 'bg-transparent ring-1 ring-emerald-500/20'
 }`}>
 {provider === 'claude'
 ? <Sparkle size={28} weight="duotone" className="text-violet-500" />
 : <Robot size={28} weight="duotone" className="text-emerald-500" />
 }
 </div>
 <h2 className="text-lg font-medium text-foreground/80 mb-1">
 {provider === 'claude' ? 'Claude Code' : 'OpenClaw'}
 </h2>
 <p className="text-xs text-muted-foreground/50 text-center max-w-sm">
 {provider === 'claude'
 ? 'Full .env-unfiltered — 344 tools, all MCP servers, bypass permissions'
 : 'NVIDIA Free — 9 agents, execute_command + dispatch_agent'
 }
 </p>
 </div>
 )}

 {messages.map((message, index) => (
 <div key={index}>
 {message.role ==="user"
 ? <UserMessage message={message} />
 : <AssistantMessage message={message} />
 }
 </div>
 ))}

 {isStreaming && messages[messages.length - 1]?.content ==="" && (
 <TypingIndicator provider={provider} />
 )}

 <div ref={scrollRef} />
 </div>
 </ScrollArea>

 {/* ─── Input ──────────────────────────────────── */}
 <div className="border-t border-white/[0.04] p-3 bg-background/30 backdrop-blur-sm">
 <div className="flex gap-2 items-end max-w-3xl mx-auto">
 <div className="flex-1 relative group">
 <div className={`absolute -inset-[1px] rounded-xl opacity-0 group-focus-within:opacity-100 blur-sm transition-opacity duration-300 ${
 provider === 'claude'
 ? 'bg-gradient-to-r from-violet-500/40 via-purple-500/30 to-fuchsia-500/40'
 : 'bg-gradient-to-r from-emerald-500/40 via-emerald-500/30 to-teal-500/40'
 }`} />
 <Textarea
 value={input}
 onChange={(e) => setInput(e.target.value)}
 onKeyDown={(e) => {
 if (e.key ==="Enter" && !e.shiftKey) {
 e.preventDefault();
 handleSend();
 }
 }}
 placeholder={
 provider === 'claude'
 ?"Message Claude..."
 :"Message OpenClaw..."
 }
 className="terminal-text bg-background/60 border-white/[0.06] focus:border-transparent min-h-[48px] max-h-[120px] resize-none transition-all duration-200 relative rounded-xl text-sm"
 rows={1}
 />
 </div>
 {isStreaming ? (
 <Button onClick={handleStop} size="sm" className="bg-red-500/80 hover:bg-red-500 text-white h-[48px] w-[48px] rounded-xl p-0">
 <Square size={16} weight="bold" />
 </Button>
 ) : (
 <Button
 onClick={handleSend}
 disabled={!input.trim()}
 size="sm"
 className={`h-[48px] w-[48px] rounded-xl p-0 transition-all duration-200 ${
 provider === 'claude'
 ? 'bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/30 text-white'
 : 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/30 text-white'
 }`}
 >
 <PaperPlaneTilt size={16} weight="bold" />
 </Button>
 )}
 </div>
 <div className="flex items-center justify-center mt-1.5">
 <span className="text-[10px] text-muted-foreground/30">
 {currentModelLabel} • {provider === 'claude' ? 'Anthropic' : 'NVIDIA Free'}
 </span>
 </div>
 </div>
 </Card>
 </div>
 </div>
 );
};

export default Chat;
