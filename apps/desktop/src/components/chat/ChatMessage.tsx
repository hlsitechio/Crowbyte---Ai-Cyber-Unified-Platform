import { useState, memo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Copy, Check, Brain, CaretRight, CaretDown, CurrencyDollar,
  Sparkle, Robot, Lightning, User, ArrowClockwise, Trash,
} from '@phosphor-icons/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';

type Provider = 'claude' | 'openclaw' | 'crowbyte';

export interface Message {
  role: 'user' | 'assistant';
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

// ─── Helpers ─────────────────────────────────────────

const parseThinking = (content: string): ParsedMessage => {
  const thinkingRegex = /<think>([\s\S]*?)<\/think>/g;
  const matches = content.match(thinkingRegex);
  if (!matches) return { content };
  const thinking = matches.map(m => m.replace(/<\/?think>/g, '').trim()).join('\n\n');
  const cleanContent = content.replace(thinkingRegex, '').trim();
  return { thinking, content: cleanContent };
};

const cleanSystemNoise = (content: string): string =>
  content
    .replace(/\n?>\s*\*Claude Code v[\s\S]*?\*\n?/g, '')
    .replace(/\n?>\s*\*claude-[\s\S]*?\*\n?/g, '')
    .trim();

const formatTime = (ts?: number) => {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const PROVIDER_CONFIG = {
  claude: { color: 'violet', icon: Sparkle, label: 'Claude' },
  openclaw: { color: 'emerald', icon: Robot, label: 'OpenClaw' },
  crowbyte: { color: 'blue', icon: Lightning, label: 'CrowByte' },
};

// ─── Copy Button ─────────────────────────────────────

const CopyButton = ({ text, size = 12 }: { text: string; size?: number }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
      title="Copy message"
    >
      {copied
        ? <Check size={size} weight="bold" className="text-emerald-400" />
        : <Copy size={size} weight="bold" className="text-zinc-500" />
      }
    </button>
  );
};

// ─── Markdown Renderers ──────────────────────────────

const markdownComponents = {
  code({ className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    const isBlock = typeof children === 'string' && children.includes('\n');

    if (match || isBlock) {
      return <CodeBlock language={match?.[1]}>{String(children)}</CodeBlock>;
    }
    return <CodeBlock inline>{String(children)}</CodeBlock>;
  },
  table({ children }: any) {
    return (
      <div className="overflow-x-auto my-3 rounded-lg ring-1 ring-white/[0.06]">
        <table className="w-full text-sm">{children}</table>
      </div>
    );
  },
  th({ children }: any) {
    return <th className="px-3 py-2 text-left text-xs font-medium text-zinc-400 bg-white/[0.03] border-b border-white/[0.06]">{children}</th>;
  },
  td({ children }: any) {
    return <td className="px-3 py-2 text-sm border-b border-white/[0.04]">{children}</td>;
  },
};

// ─── Assistant Message ───────────────────────────────

interface AssistantMessageProps {
  message: Message;
  onRegenerate?: () => void;
  onDelete?: () => void;
}

export const AssistantMessage = memo(({ message, onRegenerate, onDelete }: AssistantMessageProps) => {
  const parsed = parseThinking(message.content);
  const cleanContent = cleanSystemNoise(parsed.content || message.content);
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
  const showThinking = parsed.thinking && !message.isStreaming;
  const prov = PROVIDER_CONFIG[message.provider || 'openclaw'];

  return (
    <div className="flex gap-3 group animate-in fade-in slide-in-from-left-2 duration-300">
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center mt-0.5 ring-1 ring-${prov.color}-500/20 bg-${prov.color}-500/5`}>
        <prov.icon size={15} weight="duotone" className={`text-${prov.color}-400`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold text-${prov.color}-400`}>{prov.label}</span>
          {message.model && (
            <span className="text-[10px] text-zinc-600 font-mono">{message.model}</span>
          )}
          {message.timestamp && (
            <span className="text-[10px] text-zinc-600">{formatTime(message.timestamp)}</span>
          )}
          {/* Actions */}
          <div className="flex items-center gap-0.5 ml-auto">
            <CopyButton text={cleanContent} />
            {onRegenerate && !message.isStreaming && (
              <button
                onClick={onRegenerate}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
                title="Regenerate"
              >
                <ArrowClockwise size={12} weight="bold" className="text-zinc-500" />
              </button>
            )}
            {onDelete && !message.isStreaming && (
              <button
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
                title="Delete"
              >
                <Trash size={12} weight="bold" className="text-zinc-500 hover:text-red-400" />
              </button>
            )}
          </div>
        </div>

        {/* Thinking */}
        {showThinking && (
          <Collapsible open={isThinkingOpen} onOpenChange={setIsThinkingOpen}>
            <CollapsibleTrigger className="w-full">
              <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-violet-500/5 hover:bg-violet-500/10 ring-1 ring-violet-500/10 transition-colors cursor-pointer w-fit">
                {isThinkingOpen
                  ? <CaretDown size={11} weight="bold" className="text-violet-400/60" />
                  : <CaretRight size={11} weight="bold" className="text-violet-400/60" />
                }
                <Brain size={11} weight="duotone" className="text-violet-400/60" />
                <span className="text-[11px] text-violet-400/60 font-medium">
                  Reasoning ({parsed.thinking!.split(/\s+/).length} words)
                </span>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="p-3 rounded-lg bg-violet-500/[0.03] ring-1 ring-violet-500/10">
                <p className="text-xs text-zinc-500 whitespace-pre-wrap font-mono leading-relaxed">
                  {parsed.thinking}
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Main content */}
        <div className="chat-markdown prose-invert">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {cleanContent}
          </ReactMarkdown>
        </div>

        {/* Cost */}
        {message.cost && !message.isStreaming && (
          <div className="flex items-center gap-1 mt-1">
            <CurrencyDollar size={10} weight="bold" className="text-amber-500/40" />
            <span className="text-[10px] text-zinc-600 font-mono">${message.cost.toFixed(4)}</span>
          </div>
        )}
      </div>
    </div>
  );
});

AssistantMessage.displayName = 'AssistantMessage';

// ─── User Message ────────────────────────────────────

interface UserMessageProps {
  message: Message;
  onEdit?: (newContent: string) => void;
  onDelete?: () => void;
}

export const UserMessage = memo(({ message, onDelete }: UserMessageProps) => (
  <div className="flex gap-3 justify-end group animate-in fade-in slide-in-from-right-2 duration-300">
    <div className="max-w-[75%] space-y-1">
      {/* Timestamp + actions */}
      <div className="flex items-center justify-end gap-1">
        <div className="flex items-center gap-0.5 mr-1">
          {onDelete && (
            <button
              onClick={onDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
              title="Delete"
            >
              <Trash size={11} weight="bold" className="text-zinc-500 hover:text-red-400" />
            </button>
          )}
          <CopyButton text={message.content} size={11} />
        </div>
        {message.timestamp && (
          <span className="text-[10px] text-zinc-600">{formatTime(message.timestamp)}</span>
        )}
      </div>
      {/* Bubble */}
      <div className="relative">
        <div className="absolute -inset-[1px] bg-gradient-to-br from-violet-500/25 via-purple-500/15 to-fuchsia-500/25 rounded-2xl rounded-br-md blur-[2px]" />
        <div className="relative bg-gradient-to-br from-violet-500/10 to-purple-500/8 backdrop-blur-sm rounded-2xl rounded-br-md px-4 py-2.5 ring-1 ring-violet-500/15">
          <div className="chat-markdown text-sm text-zinc-200 leading-relaxed">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
              {message.content}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
    {/* Avatar */}
    <div className="flex-shrink-0 w-8 h-8 rounded-lg ring-1 ring-violet-500/20 bg-violet-500/5 flex items-center justify-center mt-0.5">
      <User size={15} weight="duotone" className="text-violet-300" />
    </div>
  </div>
));

UserMessage.displayName = 'UserMessage';

// ─── Typing Indicator ────────────────────────────────

export const TypingIndicator = memo(({ provider }: { provider: Provider }) => {
  const prov = PROVIDER_CONFIG[provider];
  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ring-1 ring-${prov.color}-500/20 bg-${prov.color}-500/5`}>
        <prov.icon size={15} weight="duotone" className={`text-${prov.color}-400 animate-pulse`} />
      </div>
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.02] ring-1 ring-white/[0.06]">
        <div className="flex gap-1">
          {[0, 150, 300].map(delay => (
            <div key={delay} className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
          ))}
        </div>
        <span className="text-xs text-zinc-500 ml-1">{prov.label} is thinking...</span>
      </div>
    </div>
  );
});

TypingIndicator.displayName = 'TypingIndicator';

// ─── Date Separator ──────────────────────────────────

export const DateSeparator = memo(({ date }: { date: string }) => (
  <div className="flex items-center gap-3 py-2">
    <div className="flex-1 h-px bg-white/[0.04]" />
    <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">{date}</span>
    <div className="flex-1 h-px bg-white/[0.04]" />
  </div>
));

DateSeparator.displayName = 'DateSeparator';
