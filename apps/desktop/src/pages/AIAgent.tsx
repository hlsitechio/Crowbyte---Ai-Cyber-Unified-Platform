/**
 * Search Agent Page — Tavily-powered intelligent search
 * Features: search history, follow-up suggestions, quick actions, collapsible reasoning
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { searchAgent, type SearchAgentResponse } from "@/services/searchAgent";
import {
  Robot,
  PaperPlaneTilt,
  MagnifyingGlass,
  Brain,
  Clock,
  Trash,
  ArrowSquareOut,
  Sparkle,
  CircleNotch,
  CaretDown,
  CaretRight,
  Crosshair,
  ShieldWarning,
  Detective,
  Binoculars,
  Wrench,
  Virus,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Source {
  title: string;
  url: string;
  content: string;
  score?: number;
}

interface Step {
  action: string;
  observation: string;
}

interface Message {
  id: string;
  role: "user" | "agent";
  content: string;
  sources?: Source[];
  steps?: Step[];
  followUps?: string[];
  timestamp: Date;
}

interface HistoryEntry {
  id: string;
  query: string;
  messages: Message[];
  timestamp: number;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const HISTORY_KEY = "crowbyte_search_history";
const MAX_HISTORY = 15;

const QUICK_ACTIONS = [
  { label: "Latest CVEs", icon: ShieldWarning, template: "What are the latest critical CVEs disclosed this week?" },
  { label: "Exploit DB", icon: Crosshair, template: "Search Exploit-DB for recent public exploits" },
  { label: "OSINT", icon: Detective, template: "OSINT techniques for reconnaissance on " },
  { label: "Threat Intel", icon: Binoculars, template: "Latest threat intelligence on active threat actors" },
  { label: "Tool Discovery", icon: Wrench, template: "Best security tools for " },
  { label: "Malware Analysis", icon: Virus, template: "Recent malware campaigns and analysis techniques" },
];

const CAPABILITIES = [
  { icon: MagnifyingGlass, text: "Deep web research with real-time Tavily AI search" },
  { icon: ShieldWarning, text: "CVE analysis with exploitability and patch status" },
  { icon: Wrench, text: "Security tool discovery and comparison" },
  { icon: Binoculars, text: "Threat intelligence on actors, TTPs, and IOCs" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}

function generateFollowUps(query: string, sources: Source[]): string[] {
  // Extract meaningful multi-word phrases from source titles (not random single words)
  const stopWords = new Set(['the','this','that','with','from','about','have','been','and','for','are','was','were','has','its','new','how','what','why','who','all','can','will','may','more','most','than','into','over','also','but','not','our','your','them','their','some','any','each','both','few','many','much','such','very','just','only']);

  const titles = sources.slice(0, 5).map(s => s.title);
  const keyPhrases = titles
    .flatMap(t => {
      // Extract 2-3 word phrases that look like real topics
      const words = t.split(/[\s\-:,|]+/).filter(w => w.length > 2 && !stopWords.has(w.toLowerCase()));
      const phrases: string[] = [];
      for (let i = 0; i < words.length - 1; i++) {
        if (words[i] && words[i+1] && !stopWords.has(words[i].toLowerCase())) {
          phrases.push(`${words[i]} ${words[i+1]}`);
        }
      }
      return phrases;
    })
    .filter(p => p.length > 5)
    .slice(0, 5);

  const suggestions: string[] = [];

  // Generate contextual security follow-ups
  const queryLower = query.toLowerCase();

  if (queryLower.includes('cve') || queryLower.includes('vulnerabilit')) {
    suggestions.push(`Exploit PoC and active exploitation status`);
    if (keyPhrases[0]) suggestions.push(`${keyPhrases[0]} — patch availability and mitigations`);
    suggestions.push(`Related CVEs and attack chain analysis`);
  } else if (queryLower.includes('malware') || queryLower.includes('ransomware')) {
    suggestions.push(`IOCs and detection signatures for these campaigns`);
    if (keyPhrases[0]) suggestions.push(`${keyPhrases[0]} — MITRE ATT&CK mapping`);
    suggestions.push(`Incident response playbook for this threat`);
  } else if (queryLower.includes('apt') || queryLower.includes('threat actor')) {
    suggestions.push(`TTPs and infrastructure used by these groups`);
    suggestions.push(`Recent campaigns targeting my industry`);
    suggestions.push(`Detection rules and hunting queries`);
  } else if (queryLower.includes('exploit') || queryLower.includes('attack')) {
    suggestions.push(`Defense and mitigation strategies`);
    if (keyPhrases[0]) suggestions.push(`${keyPhrases[0]} — technical deep dive`);
    suggestions.push(`Similar attack techniques and variants`);
  } else {
    // Generic security follow-ups based on extracted topics
    if (keyPhrases[0]) suggestions.push(`${keyPhrases[0]} — deeper technical analysis`);
    if (keyPhrases[1]) suggestions.push(`${keyPhrases[1]} — impact and remediation`);
    suggestions.push(`${query} — latest developments and advisories`);
  }

  return suggestions.slice(0, 3);
}

function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
}

function truncate(text: string, len: number): string {
  return text.length > len ? text.slice(0, len) + "..." : text;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ── Components ─────────────────────────────────────────────────────────────────

function ReasoningSteps({ steps }: { steps: Step[] }) {
  const [open, setOpen] = useState(false);

  if (!steps.length) return null;

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        {open ? <CaretDown size={12} weight="bold" /> : <CaretRight size={12} weight="bold" />}
        Reasoning ({steps.length} steps)
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1.5 pl-3 border-l border-zinc-800">
              {steps.map((step, i) => (
                <div key={i} className="text-xs">
                  <span className="text-violet-400">{step.action}</span>
                  <span className="text-zinc-500 ml-2">{step.observation}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SourcesList({ sources }: { sources: Source[] }) {
  if (!sources.length) return null;

  return (
    <div className="mt-3 space-y-1">
      <span className="text-xs text-zinc-500 font-medium">
        Sources ({sources.length})
      </span>
      <div className="space-y-1">
        {sources.map((src, i) => (
          <a
            key={i}
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-baseline gap-2 group text-sm py-0.5 hover:text-white transition-colors"
          >
            <ArrowSquareOut
              size={12}
              weight="bold"
              className="text-zinc-600 group-hover:text-violet-400 flex-shrink-0 translate-y-[1px]"
            />
            <span className="text-zinc-300 group-hover:text-white truncate">
              {src.title || extractDomain(src.url)}
            </span>
            <span className="text-zinc-600 text-xs flex-shrink-0">
              {extractDomain(src.url)}
            </span>
            {src.score != null && (
              <span className="text-zinc-600 text-xs flex-shrink-0 tabular-nums">
                {Math.round(src.score * 100)}%
              </span>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}

function FollowUpSuggestions({
  suggestions,
  onSelect,
}: {
  suggestions: string[];
  onSelect: (q: string) => void;
}) {
  if (!suggestions.length) return null;

  return (
    <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className="text-xs text-violet-400 hover:text-violet-300 transition-colors"
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function SearchHistory({
  entries,
  onSelect,
  onClear,
  open,
  onToggle,
}: {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-zinc-800/60">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <Clock size={12} weight="bold" />
          Search History ({entries.length})
        </span>
        {open ? <CaretDown size={12} /> : <CaretRight size={12} />}
      </button>
      <AnimatePresence>
        {open && entries.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-2 space-y-0.5">
              {entries.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => onSelect(entry)}
                  className="flex items-center justify-between w-full text-left text-xs py-1 px-2 rounded hover:bg-white/[0.05] transition-colors group"
                >
                  <span className="text-zinc-400 group-hover:text-zinc-200 truncate mr-3">
                    {truncate(entry.query, 50)}
                  </span>
                  <span className="text-zinc-600 flex-shrink-0 tabular-nums">
                    {timeAgo(entry.timestamp)}
                  </span>
                </button>
              ))}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                }}
                className="flex items-center gap-1 text-xs text-zinc-600 hover:text-red-400 transition-colors mt-1 px-2"
              >
                <Trash size={10} weight="bold" />
                Clear history
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AIAgent() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>(loadHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Auto-init
  useEffect(() => {
    initializeAgent();
  }, []);

  // ── Init ─────────────────────────────────────────────────────────────────────

  const initializeAgent = async () => {
    setIsInitializing(true);
    try {
      const tavilyApiKey = import.meta.env.VITE_TAVILY_API_KEY;
      if (!tavilyApiKey) {
        toast({
          title: "Configuration Error",
          description: "VITE_TAVILY_API_KEY not set in .env",
          variant: "destructive",
        });
        return;
      }

      await searchAgent.initialize({ tavilyApiKey, maxResults: 5 });
      setIsInitialized(true);
    } catch (error) {
      toast({
        title: "Initialization Failed",
        description: error instanceof Error ? error.message : "Failed to start agent",
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  // ── Search ───────────────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (query?: string) => {
      const text = query || input.trim();
      if (!text || isLoading) return;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsLoading(true);

      try {
        const response: SearchAgentResponse = await searchAgent.search({ query: text });
        const followUps = generateFollowUps(text, response.sources);

        const agentMsg: Message = {
          id: crypto.randomUUID(),
          role: "agent",
          content: response.answer,
          sources: response.sources,
          steps: response.steps,
          followUps,
          timestamp: new Date(),
        };

        setMessages((prev) => {
          const updated = [...prev, agentMsg];
          // Save to history
          const entry: HistoryEntry = {
            id: crypto.randomUUID(),
            query: text,
            messages: [userMsg, agentMsg],
            timestamp: Date.now(),
          };
          const newHistory = [entry, ...history.filter((h) => h.query !== text)].slice(0, MAX_HISTORY);
          setHistory(newHistory);
          saveHistory(newHistory);
          return updated;
        });
      } catch (error) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "agent",
            content: `Error: ${error instanceof Error ? error.message : "Search failed"}`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, history, toast],
  );

  // ── History ──────────────────────────────────────────────────────────────────

  const restoreHistory = useCallback((entry: HistoryEntry) => {
    // Restore messages with Date objects (they get serialized as strings in localStorage)
    const restored = entry.messages.map((m) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
    setMessages(restored);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  // ── Quick action ─────────────────────────────────────────────────────────────

  const handleQuickAction = useCallback(
    (template: string) => {
      // If template ends with a space, put cursor there for user to type
      if (template.endsWith(" ")) {
        setInput(template);
        inputRef.current?.focus();
      } else {
        sendMessage(template);
      }
    },
    [sendMessage],
  );

  // ── Render: Init Screen ──────────────────────────────────────────────────────

  if (!isInitialized) {
    return (
      <div className="flex flex-col h-screen">
        {/* Header */}
        <Header initialized={false} initializing={isInitializing} onInit={initializeAgent} />

        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md w-full space-y-6">
            <div className="text-center space-y-2">
              <Brain size={32} weight="duotone" className="text-violet-500 mx-auto" />
              <h2 className="text-lg font-semibold text-zinc-200">Initialize search agent to begin</h2>
              <p className="text-sm text-zinc-500">Tavily-powered deep web search for security research</p>
            </div>

            <div className="space-y-2">
              {CAPABILITIES.map((cap, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-zinc-400">
                  <cap.icon size={16} weight="bold" className="text-zinc-600 flex-shrink-0" />
                  {cap.text}
                </div>
              ))}
            </div>

            <button
              onClick={initializeAgent}
              disabled={isInitializing}
              className="w-full py-2.5 rounded-md text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isInitializing ? (
                <>
                  <CircleNotch size={16} weight="bold" className="animate-spin" />
                  Initializing...
                </>
              ) : (
                <>
                  <Sparkle size={16} weight="bold" />
                  Initialize Agent
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Chat Interface ───────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <Header initialized onInit={initializeAgent} />

      {/* History bar */}
      {history.length > 0 && (
        <SearchHistory
          entries={history}
          onSelect={restoreHistory}
          onClear={clearHistory}
          open={historyOpen}
          onToggle={() => setHistoryOpen(!historyOpen)}
        />
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
        <div className="max-w-3xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-16 space-y-3">
              <MagnifyingGlass size={28} weight="duotone" className="text-zinc-700 mx-auto" />
              <p className="text-sm text-zinc-600">Ask anything. Search the web for security research.</p>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "user" ? (
                  /* User bubble */
                  <div className="max-w-[80%] bg-white/[0.05] rounded-xl px-4 py-2.5">
                    <p className="text-sm text-zinc-200">{msg.content}</p>
                    <span className="text-[10px] text-zinc-600 mt-1 block text-right">
                      {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ) : (
                  /* Agent message — no bubble bg */
                  <div className="max-w-[90%] space-y-0">
                    <div className="flex items-start gap-2.5">
                      <Robot
                        size={18}
                        weight="duotone"
                        className="text-violet-500 flex-shrink-0 mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        {/* Answer text */}
                        <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </div>

                        {/* Sources */}
                        {msg.sources && <SourcesList sources={msg.sources} />}

                        {/* Reasoning steps */}
                        {msg.steps && <ReasoningSteps steps={msg.steps} />}

                        {/* Follow-ups */}
                        {msg.followUps && (
                          <FollowUpSuggestions
                            suggestions={msg.followUps}
                            onSelect={sendMessage}
                          />
                        )}

                        <span className="text-[10px] text-zinc-700 mt-2 block">
                          {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2.5"
            >
              <Robot size={18} weight="duotone" className="text-violet-500" />
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <CircleNotch size={14} weight="bold" className="animate-spin text-violet-500" />
                Searching...
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom: quick actions + input */}
      <div className="border-t border-zinc-800/60 px-4 py-3">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {/* Quick actions */}
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => handleQuickAction(action.template)}
                disabled={isLoading}
                className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white disabled:opacity-40 transition-colors whitespace-nowrap flex-shrink-0"
              >
                <action.icon size={13} weight="bold" />
                {action.label}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Search anything..."
              disabled={isLoading}
              className="flex-1 bg-zinc-900 border-zinc-800 focus-visible:ring-violet-500/30 text-sm"
            />
            <button
              onClick={() => sendMessage()}
              disabled={isLoading || !input.trim()}
              className="px-3 rounded-md bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isLoading ? (
                <CircleNotch size={16} weight="bold" className="animate-spin text-white" />
              ) : (
                <PaperPlaneTilt size={16} weight="bold" className="text-white" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────────────

function Header({
  initialized,
  initializing,
  onInit,
}: {
  initialized: boolean;
  initializing?: boolean;
  onInit?: () => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800/60">
      <div className="flex items-center gap-2.5">
        <Brain size={22} weight="duotone" className="text-violet-500" />
        <div>
          <h1 className="text-base font-semibold text-zinc-200">Search Agent</h1>
          <p className="text-[11px] text-zinc-600">Powered by Tavily</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {initialized ? (
          <span className="flex items-center gap-1.5 text-xs text-emerald-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Online
          </span>
        ) : (
          <button
            onClick={onInit}
            disabled={initializing}
            className="text-xs text-zinc-400 hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1.5"
          >
            {initializing ? (
              <>
                <CircleNotch size={12} weight="bold" className="animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Sparkle size={12} weight="bold" />
                Initialize
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
