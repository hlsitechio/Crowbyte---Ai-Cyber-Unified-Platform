import { useState, memo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { UilCopy, UilCheck, UilWindow, UilExpandAlt, UilTimes, UilEye } from "@iconscout/react-unicons";
interface CodeBlockProps {
  language?: string;
  children: string;
  inline?: boolean;
}

const LANG_ALIASES: Record<string, string> = {
  js: 'javascript', ts: 'typescript', py: 'python', rb: 'ruby',
  sh: 'bash', shell: 'bash', zsh: 'bash', yml: 'yaml',
  dockerfile: 'docker', md: 'markdown', txt: 'text',
};

const LANG_COLORS: Record<string, string> = {
  javascript: '#f7df1e', typescript: '#3178c6', python: '#3776ab',
  rust: '#dea584', go: '#00add8', bash: '#4eaa25', sql: '#e38c00',
  html: '#e34f26', css: '#264de4', json: '#292929', yaml: '#cb171e',
  ruby: '#cc342d', java: '#b07219', cpp: '#f34b7d', c: '#555555',
};

export const CodeBlock = memo(({ language, children, inline }: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [preview, setPreview] = useState(false);
  const code = String(children).replace(/\n$/, '');

  if (inline) {
    return (
      <code className="bg-violet-500/12 text-violet-300 px-1.5 py-0.5 rounded text-[0.82em] font-mono">
        {code}
      </code>
    );
  }

  const lang = LANG_ALIASES[language?.toLowerCase() || ''] || language?.toLowerCase() || 'text';
  const langColor = LANG_COLORS[lang] || '#71717a';
  const lineCount = code.split('\n').length;
  const isHtml = lang === 'html';

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inner = (
    <div className={`group/code relative rounded-xl overflow-hidden ring-1 ring-white/[0.08] bg-[#1a1a2e] ${expanded ? '' : 'my-3'}`}>
      {/* Canvas header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/[0.03] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-[11px] font-mono font-medium" style={{ color: langColor }}>{lang}</span>
          <span className="text-[10px] text-zinc-600">{lineCount} lines</span>
        </div>
        <div className="flex items-center gap-0.5">
          {isHtml && (
            <button onClick={() => setPreview(v => !v)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-all">
              <UilEye size={11} />
              <span>{preview ? 'Code' : 'Preview'}</span>
            </button>
          )}
          <button onClick={handleCopy} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-all">
            {copied ? <><UilCheck size={11} className="text-emerald-400" /><span className="text-emerald-400">Copied</span></> : <><UilCopy size={11} /><span>Copy</span></>}
          </button>
          <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1 px-2 py-1 rounded text-[10px] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-all">
            {expanded ? <UilTimes size={11} /> : <UilExpandAlt size={11} />}
          </button>
        </div>
      </div>

      {/* Preview or code */}
      {isHtml && preview ? (
        <iframe
          srcDoc={code}
          sandbox="allow-scripts"
          className="w-full h-[400px] bg-white"
          title="HTML preview"
        />
      ) : (
        <SyntaxHighlighter
          language={lang === 'text' ? undefined : lang}
          style={oneDark}
          customStyle={{ margin: 0, padding: '1em 1.25em', background: 'transparent', fontSize: '0.8em', lineHeight: 1.6 }}
          codeTagProps={{ style: { fontFamily: "'JetBrains Mono', 'Fira Code', monospace" } }}
          showLineNumbers={lineCount > 5}
          lineNumberStyle={{ color: '#3f3f5060', fontSize: '0.75em', paddingRight: '1em' }}
          wrapLines
        >
          {code}
        </SyntaxHighlighter>
      )}
    </div>
  );

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
        <div className="w-full max-w-5xl max-h-[90vh] overflow-auto rounded-2xl shadow-2xl shadow-black/60">
          {inner}
        </div>
      </div>
    );
  }

  return inner;
});

CodeBlock.displayName = 'CodeBlock';
