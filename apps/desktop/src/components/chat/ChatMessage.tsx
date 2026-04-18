import { useState, useEffect, useRef, memo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { UilCopy, UilCheck, UilBrain, UilAngleRight, UilAngleDown, UilDollarSign, UilStar, UilRobot, UilBolt, UilUser, UilTrashAlt, UilWindow, UilSpinner, UilSync } from "@iconscout/react-unicons";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';
import { IS_WEB } from '@/lib/platform';

type Provider = 'openrouter' | 'claude' | 'openclaw' | 'crowbyte';

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
  toolCalls: { name: string; args: string }[];
  content: string;
}

// ─── Helpers ─────────────────────────────────────────

const parseThinkingAndTools = (content: string): ParsedMessage => {
  const thinkingRegex = /<think>([\s\S]*?)<\/think>/g;
  const thinkingMatches = content.match(thinkingRegex);
  const thinking = thinkingMatches
    ? thinkingMatches.map(m => m.replace(/<\/?think>/g, '').trim()).join('\n\n')
    : undefined;

  let cleanContent = content.replace(thinkingRegex, '').trim();

  const toolCallRegex = /\n?`\[\*\] Running (\w+)\((\{[^}]*\})\)\.\.\.\`\n?/g;
  const toolCalls: { name: string; args: string }[] = [];
  let match;
  while ((match = toolCallRegex.exec(cleanContent)) !== null) {
    toolCalls.push({ name: match[1], args: match[2] });
  }
  cleanContent = cleanContent.replace(toolCallRegex, '').trim();

  return { thinking, toolCalls, content: cleanContent };
};

const hasOpenThinking = (content: string): boolean => {
  const opens = (content.match(/<think>/g) || []).length;
  const closes = (content.match(/<\/think>/g) || []).length;
  return opens > closes;
};

const getStreamingThinking = (content: string): string | undefined => {
  const lastOpen = content.lastIndexOf('<think>');
  if (lastOpen === -1) return undefined;
  const afterOpen = content.slice(lastOpen + 7);
  const closeIdx = afterOpen.indexOf('</think>');
  if (closeIdx === -1) return afterOpen.trim();
  return undefined;
};

const cleanSystemNoise = (content: string): string =>
  content
    .replace(/\n?>\s*\*Claude UilBracketsCurly v[\s\S]*?\*\n?/g, '')
    .replace(/\n?>\s*\*claude-[\s\S]*?\*\n?/g, '')
    .trim();

const formatTime = (ts?: number) => {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Static style maps — TW v4 requires statically-analyzable classes
const PROVIDER_STYLES = {
  openrouter: {
    icon: UilBolt,
    label: 'OpenRouter',
    avatar: 'ring-1 ring-cyan-500/20 bg-cyan-500/8',
    avatarIcon: 'text-cyan-400',
    nameColor: 'text-cyan-400',
  },
  claude: {
    icon: UilStar,
    label: 'Claude',
    avatar: 'ring-1 ring-violet-500/20 bg-violet-500/8',
    avatarIcon: 'text-violet-400',
    nameColor: 'text-violet-400',
  },
  openclaw: {
    icon: UilRobot,
    label: 'OpenClaw',
    avatar: 'ring-1 ring-emerald-500/20 bg-emerald-500/8',
    avatarIcon: 'text-emerald-400',
    nameColor: 'text-emerald-400',
  },
  crowbyte: {
    icon: UilBolt,
    label: 'CrowByte',
    avatar: 'ring-1 ring-zinc-700 bg-zinc-800',
    avatarIcon: 'text-zinc-300',
    nameColor: 'text-zinc-300',
  },
} as const;

// ─── UilCopy Button ─────────────────────────────────────

const CopyButton = ({ text, size = 12 }: { text: string; size?: number }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
      title="UilCopy message"
    >
      {copied
        ? <UilCheck size={size} className="text-emerald-400" />
        : <UilCopy size={size} className="text-zinc-500" />
      }
    </button>
  );
};

// ─── Streaming Thinking Box ─────────────────────────

const ThinkingBox = memo(({
  thinking,
  isStreaming,
  wordCount,
}: {
  thinking: string;
  isStreaming: boolean;
  wordCount: number;
}) => {
  const [isOpen, setIsOpen] = useState(isStreaming);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isStreaming) setIsOpen(true);
  }, [isStreaming]);

  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thinking, isStreaming]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger className="w-full">
        <div className={`flex items-center gap-1.5 py-1 px-2.5 rounded-lg transition-colors cursor-pointer w-fit ${
          isStreaming
            ? 'bg-blue-500/8 hover:bg-blue-500/12 ring-1 ring-blue-500/15'
            : 'bg-zinc-800/60 hover:bg-zinc-800 ring-1 ring-zinc-700/50'
        }`}>
          {isOpen
            ? <UilAngleDown size={11} className={isStreaming ? "text-blue-400/70" : "text-zinc-500"} />
            : <UilAngleRight size={11} className={isStreaming ? "text-blue-400/70" : "text-zinc-500"} />
          }
          {isStreaming ? (
            <UilSpinner size={11} className="text-blue-400/70 animate-spin" />
          ) : (
            <UilBrain size={11} className="text-zinc-500" />
          )}
          <span className={`text-[11px] font-medium ${isStreaming ? "text-blue-400/70" : "text-zinc-500"}`}>
            {isStreaming ? 'Thinking...' : `Reasoning (${wordCount} words)`}
          </span>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div
          ref={scrollRef}
          className={`p-3 rounded-lg overflow-y-auto transition-all ${
            isStreaming
              ? 'bg-blue-500/[0.03] ring-1 ring-blue-500/10 max-h-[200px]'
              : 'bg-zinc-900/50 ring-1 ring-zinc-800 max-h-[300px]'
          }`}
        >
          <p className="text-xs text-zinc-500 whitespace-pre-wrap font-mono leading-relaxed">
            {thinking}
            {isStreaming && (
              <span className="inline-block w-1.5 h-3.5 bg-blue-400/50 ml-0.5 animate-pulse rounded-sm" />
            )}
          </p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
ThinkingBox.displayName = 'ThinkingBox';

// ─── Tool Call Status ───────────────────────────────

const ToolCallBadge = memo(({ name, args }: { name: string; args: string }) => (
  <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-zinc-800/60 ring-1 ring-zinc-700/50 w-fit">
    <UilWindow size={11} className="text-zinc-500" />
    <span className="text-[11px] text-zinc-400 font-mono">
      {name}
    </span>
    <span className="text-[10px] text-zinc-600 font-mono truncate max-w-[200px]">
      {args}
    </span>
  </div>
));
ToolCallBadge.displayName = 'ToolCallBadge';

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
  table({ children, node }: any) {
    const copyCSV = () => {
      try {
        const rows = node?.children?.flatMap((section: any) =>
          section.children?.map((row: any) =>
            row.children?.map((cell: any) =>
              cell.children?.map((c: any) => c.value || '').join('')
            ).join(',')
          )
        ).filter(Boolean).join('\n') || '';
        navigator.clipboard.writeText(rows);
      } catch {}
    };
    return (
      <div className="my-3 rounded-xl overflow-hidden ring-1 ring-white/[0.08] bg-[#1a1a2e]">
        <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
            </div>
            <span className="text-[11px] font-mono text-zinc-500">table</span>
          </div>
          <button onClick={copyCSV} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-all">
            <UilCopy size={11} /><span>Copy CSV</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">{children}</table>
        </div>
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
  const parsed = parseThinkingAndTools(message.content);
  const cleanContent = cleanSystemNoise(parsed.content || message.content);
  const prov = PROVIDER_STYLES[message.provider || 'openclaw'];

  const isThinkingStreaming = message.isStreaming && hasOpenThinking(message.content);
  const streamingThinking = isThinkingStreaming ? getStreamingThinking(message.content) : undefined;
  const thinkingContent = streamingThinking || parsed.thinking;
  const showThinking = !!thinkingContent;
  const thinkingWordCount = thinkingContent ? thinkingContent.split(/\s+/).filter(Boolean).length : 0;

  return (
    <div className="flex gap-3 group animate-in fade-in slide-in-from-left-2 duration-300">
      {/* Avatar — clean, no underglow */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center mt-0.5 ${prov.avatar}`}>
        <prov.icon size={14} className={prov.avatarIcon} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1.5">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${prov.nameColor}`}>{prov.label}</span>
          {!IS_WEB && message.model && (
            <span className="text-[10px] text-zinc-600 font-mono">{message.model}</span>
          )}
          {message.timestamp && (
            <span className="text-[10px] text-zinc-600">{formatTime(message.timestamp)}</span>
          )}
          <div className="flex items-center gap-0.5 ml-auto">
            <CopyButton text={cleanContent} />
            {onRegenerate && !message.isStreaming && (
              <button
                onClick={onRegenerate}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
                title="Regenerate"
              >
                <UilSync size={12} className="text-zinc-500" />
              </button>
            )}
            {onDelete && !message.isStreaming && (
              <button
                onClick={onDelete}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
                title="Delete"
              >
                <UilTrashAlt size={12} className="text-zinc-500 hover:text-red-400" />
              </button>
            )}
          </div>
        </div>

        {/* Thinking Box */}
        {showThinking && (
          <ThinkingBox
            thinking={thinkingContent!}
            isStreaming={!!isThinkingStreaming}
            wordCount={thinkingWordCount}
          />
        )}

        {/* Tool Call Badges */}
        {parsed.toolCalls.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {parsed.toolCalls.map((tc, i) => (
              <ToolCallBadge key={i} name={tc.name} args={tc.args} />
            ))}
          </div>
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
            <UilDollarSign size={10} className="text-amber-500/40" />
            <span className="text-[10px] text-zinc-600 font-mono">${message.cost.toFixed(4)}</span>
          </div>
        )}
      </div>
    </div>
  );
});

AssistantMessage.displayName = 'AssistantMessage';

// ─── UilUser Message ────────────────────────────────────

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
              <UilTrashAlt size={11} className="text-zinc-500 hover:text-red-400" />
            </button>
          )}
          <CopyButton text={message.content} size={11} />
        </div>
        {message.timestamp && (
          <span className="text-[10px] text-zinc-600">{formatTime(message.timestamp)}</span>
        )}
      </div>
      {/* Bubble — clean, no underglow blur */}
      <div className="bg-zinc-800/80 rounded-2xl rounded-br-md px-4 py-2.5 ring-1 ring-zinc-700/60">
        <div className="chat-markdown text-sm text-zinc-200 leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
    {/* Avatar */}
    <div className="flex-shrink-0 w-7 h-7 rounded-lg ring-1 ring-zinc-700 bg-zinc-800 flex items-center justify-center mt-0.5">
      <UilUser size={14} className="text-zinc-400" />
    </div>
  </div>
));

UserMessage.displayName = 'UserMessage';

// ─── Typing Indicator ────────────────────────────────

export const TypingIndicator = memo(({ provider }: { provider: Provider }) => {
  const prov = PROVIDER_STYLES[provider];
  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
      <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${prov.avatar}`}>
        <prov.icon size={14} className={`${prov.avatarIcon} animate-pulse`} />
      </div>
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900/50 ring-1 ring-zinc-800">
        <div className="flex gap-1">
          {[0, 150, 300].map(delay => (
            <div key={delay} className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
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
    <div className="flex-1 h-px bg-zinc-800" />
    <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wider">{date}</span>
    <div className="flex-1 h-px bg-zinc-800" />
  </div>
));

DateSeparator.displayName = 'DateSeparator';
