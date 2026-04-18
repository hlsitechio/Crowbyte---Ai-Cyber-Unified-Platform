/**
 * InlineAI — Drop-in AI actions for any section row or header.
 *
 * Usage:
 *   <InlineAIMenu section="findings" data={finding} />        ← row-level button
 *   <SectionAIBar section="findings" />                       ← top of page proactive bar
 */

import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { UilRobot, UilTimes, UilCopy, UilBolt, UilSpinner } from '@iconscout/react-unicons';
import { SECTION_ACTIONS, runSectionAction, getProactiveContext, type SectionId, type ActionId, type ProactiveContext } from '@/services/section-agent';
import ReactMarkdown from 'react-markdown';

// ─── Row-level AI action button ───────────────────────────────────────────────

interface InlineAIMenuProps {
  section: SectionId;
  data: Record<string, unknown>;
  /** Optional: open in chat instead of inline panel */
  onSendToChat?: (prompt: string) => void;
}

export function InlineAIMenu({ section, data, onSendToChat }: InlineAIMenuProps) {
  const [open, setOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionId | null>(null);
  const [result, setResult] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const actions = SECTION_ACTIONS[section] || [];

  const run = useCallback(async (actionId: ActionId) => {
    if (streaming) { abortRef.current?.abort(); return; }
    setActiveAction(actionId);
    setResult('');
    setStreaming(true);
    abortRef.current = new AbortController();
    try {
      await runSectionAction(section, actionId, data, (chunk) => {
        setResult(prev => prev + chunk);
      }, abortRef.current.signal);
    } catch (err: any) {
      if (err.name !== 'AbortError') setResult(prev => prev + '\n\n*Error: ' + err.message + '*');
    } finally {
      setStreaming(false);
    }
  }, [section, data, streaming]);

  const copyResult = () => {
    navigator.clipboard.writeText(result).catch(() => {});
  };

  const sendToChat = (actionId: ActionId) => {
    const action = actions.find(a => a.id === actionId);
    if (!action || !onSendToChat) return;
    onSendToChat(action.promptBuilder(data));
    setOpen(false);
  };

  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
          open
            ? 'bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/30'
            : 'text-zinc-600 hover:text-violet-400 hover:bg-violet-500/10'
        }`}
        title="AI actions"
      >
        <UilRobot size={12} />
        <span>AI</span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 top-6 z-50 w-[340px] bg-[#141416] border border-white/[0.08] rounded-xl shadow-2xl overflow-hidden"
          >
            {/* Action bar */}
            {!activeAction && (
              <div className="p-2 flex flex-wrap gap-1">
                {actions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => run(action.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 text-[11px] font-medium transition-colors"
                  >
                    <span>{action.icon}</span>
                    {action.label}
                  </button>
                ))}
                {onSendToChat && (
                  <button
                    onClick={() => sendToChat(actions[0]?.id)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-400 text-[11px] font-medium transition-colors ml-auto"
                  >
                    <UilBolt size={11} />
                    Open in Chat
                  </button>
                )}
              </div>
            )}

            {/* Result panel */}
            {activeAction && (
              <div className="flex flex-col max-h-[360px]">
                {/* Header */}
                <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.05]">
                  <div className="flex items-center gap-1.5">
                    <span>{actions.find(a => a.id === activeAction)?.icon}</span>
                    <span className="text-[11px] font-medium text-zinc-300">
                      {actions.find(a => a.id === activeAction)?.label}
                    </span>
                    {streaming && <UilSpinner size={11} className="text-violet-400 animate-spin" />}
                  </div>
                  <div className="flex items-center gap-1">
                    {result && (
                      <button onClick={copyResult} className="p-1 rounded text-zinc-600 hover:text-zinc-300 transition-colors" title="Copy">
                        <UilCopy size={12} />
                      </button>
                    )}
                    {onSendToChat && result && (
                      <button
                        onClick={() => { onSendToChat(result); setOpen(false); }}
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 text-[10px] hover:bg-violet-500/20 transition-colors"
                      >
                        <UilBolt size={10} />
                        Chat
                      </button>
                    )}
                    <button onClick={() => { setActiveAction(null); setResult(''); abortRef.current?.abort(); }} className="p-1 rounded text-zinc-600 hover:text-zinc-400 transition-colors">
                      <UilTimes size={12} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-3 text-[11px] text-zinc-300 leading-relaxed prose prose-invert prose-sm max-w-none">
                  {result ? (
                    <ReactMarkdown>{result}</ReactMarkdown>
                  ) : (
                    <div className="flex items-center gap-2 text-zinc-500 py-2">
                      <UilSpinner size={13} className="animate-spin" />
                      Analyzing...
                    </div>
                  )}
                </div>

                {/* Back */}
                {!streaming && (
                  <div className="border-t border-white/[0.04] px-3 py-1.5">
                    <button onClick={() => { setActiveAction(null); setResult(''); }} className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors">
                      ← Try another action
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Section-level proactive AI bar ──────────────────────────────────────────

interface SectionAIBarProps {
  path: string;
  onSendToChat?: (prompt: string) => void;
}

export function SectionAIBar({ path, onSendToChat }: SectionAIBarProps) {
  const navigate = useNavigate();
  const [context, setContext] = useState<ProactiveContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useState(() => {
    getProactiveContext(path)
      .then(ctx => { setContext(ctx); setLoading(false); })
      .catch(() => setLoading(false));
  });

  if (loading || dismissed || !context) return null;

  const handleAction = () => {
    if (onSendToChat) {
      onSendToChat(context.quickPrompt);
    } else {
      localStorage.setItem('cb_chat_prefill', context.quickPrompt);
      navigate('/chat');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="flex items-center gap-3 px-3 py-2 mb-3 rounded-lg bg-violet-500/[0.07] border border-violet-500/20"
    >
      <div className="flex items-center gap-2 shrink-0">
        <UilRobot size={14} className="text-violet-400" />
        <span className="text-[11px] font-medium text-violet-300">{context.headline}</span>
      </div>
      <span className="text-[11px] text-zinc-500 flex-1 truncate">— {context.suggestion}</span>
      <button
        onClick={handleAction}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 text-[11px] font-medium transition-colors shrink-0"
      >
        <UilBolt size={11} />
        Let's do it
      </button>
      <button onClick={() => setDismissed(true)} className="text-zinc-700 hover:text-zinc-500 transition-colors shrink-0">
        <UilTimes size={13} />
      </button>
    </motion.div>
  );
}
