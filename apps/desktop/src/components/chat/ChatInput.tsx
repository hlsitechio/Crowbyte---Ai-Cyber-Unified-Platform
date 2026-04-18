import { useRef, useEffect, useCallback, memo, useState } from 'react';
import { UilPlaneFly, UilSquare, UilBrain, UilCrosshair, UilPaperclip, UilMicrophone, UilBolt } from "@iconscout/react-unicons";
type Provider = 'openrouter' | 'claude' | 'openclaw' | 'crowbyte';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  provider: Provider;
  modelLabel: string;
  providerLabel: string;
}

export const ChatInput = memo(({
  value, onChange, onSend, onStop, isStreaming, disabled, provider, modelLabel, providerLabel,
}: ChatInputProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeChip, setActiveChip] = useState<string | null>(null);

  const chips = [
    { id: 'attach', icon: UilPaperclip, label: 'Attach' },
    { id: 'think',  icon: UilBrain,     label: 'Think'  },
    { id: 'fusion', icon: UilBolt,      label: 'Fusion' },
    { id: 'recon',  icon: UilCrosshair, label: 'Recon'  },
    { id: 'voice',  icon: UilMicrophone,label: 'Voice'  },
  ];

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, []);

  useEffect(() => adjustHeight(), [value, adjustHeight]);

  // Focus on mount and provider change
  useEffect(() => {
    textareaRef.current?.focus();
  }, [provider]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const charCount = value.length;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;

  const providerColors: Record<Provider, { glow: string; btn: string; btnHover: string }> = {
    openrouter: {
      glow: 'from-cyan-500/40 via-cyan-500/30 to-teal-500/40',
      btn: 'bg-cyan-600 hover:bg-cyan-500 disabled:bg-cyan-600/20',
      btnHover: 'shadow-cyan-500/20',
    },
    claude: {
      glow: 'from-violet-500/40 via-purple-500/30 to-fuchsia-500/40',
      btn: 'bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/20',
      btnHover: 'shadow-violet-500/20',
    },
    openclaw: {
      glow: 'from-emerald-500/40 via-emerald-500/30 to-teal-500/40',
      btn: 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/20',
      btnHover: 'shadow-emerald-500/20',
    },
    crowbyte: {
      glow: 'from-blue-500/40 via-blue-500/30 to-cyan-500/40',
      btn: 'bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/20',
      btnHover: 'shadow-blue-500/20',
    },
  };

  const colors = providerColors[provider];

  return (
    <div className="border-t border-white/[0.04] p-4 bg-black/20 backdrop-blur-md">
      <div className="max-w-3xl mx-auto space-y-2">
        {/* Input area */}
        <div className="relative group/input">
          {/* Glow effect on focus */}
          <div className={`absolute -inset-[1px] rounded-2xl opacity-0 group-focus-within/input:opacity-100 blur-sm transition-opacity duration-300 bg-gradient-to-r ${colors.glow}`} />

          <div className="relative flex items-end gap-2 bg-zinc-900/80 rounded-2xl ring-1 ring-white/[0.08] group-focus-within/input:ring-white/[0.12] transition-all p-2">
            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${providerLabel}...`}
              disabled={disabled}
              rows={1}
              className="flex-1 bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 resize-none outline-none px-2 py-2 min-h-[40px] max-h-[200px] leading-relaxed"
            />

            {/* Send / Stop */}
            {isStreaming ? (
              <button
                onClick={onStop}
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-500/80 hover:bg-red-500 text-white flex items-center justify-center transition-all hover:shadow-lg hover:shadow-red-500/20"
              >
                <UilSquare size={16} />
              </button>
            ) : (
              <button
                onClick={onSend}
                disabled={!value.trim() || disabled}
                className={`flex-shrink-0 w-10 h-10 rounded-xl ${colors.btn} text-white flex items-center justify-center transition-all hover:shadow-lg ${colors.btnHover} disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none`}
              >
                <UilPlaneFly size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Action chips */}
        <div className="flex items-center gap-1 px-1">
          {chips.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveChip(activeChip === id ? null : id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                activeChip === id
                  ? 'bg-white/[0.1] text-zinc-200 ring-1 ring-white/[0.15]'
                  : 'text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04]'
              }`}
            >
              <Icon size={11} />
              {label}
            </button>
          ))}
          <span className="ml-auto text-[10px] text-zinc-700 font-mono">{modelLabel}</span>
        </div>
      </div>
    </div>
  );
});

ChatInput.displayName = 'ChatInput';
