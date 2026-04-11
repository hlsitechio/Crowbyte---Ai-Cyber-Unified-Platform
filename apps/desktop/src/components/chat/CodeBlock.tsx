import { useState, memo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { UilCopy, UilCheck, UilWindow } from "@iconscout/react-unicons";
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

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group/code relative my-3 rounded-xl overflow-hidden ring-1 ring-white/[0.06] bg-[#1e1e2e]">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/[0.03] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <UilWindow size={12} className="text-zinc-500" />
          <span className="text-[11px] font-mono text-zinc-500" style={{ color: langColor }}>
            {lang}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-all"
        >
          {copied ? (
            <>
              <UilCheck size={12} className="text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <UilCopy size={12} />
              <span className="opacity-0 group-hover/code:opacity-100 transition-opacity">UilCopy</span>
            </>
          )}
        </button>
      </div>

      {/* UilBracketsCurly body */}
      <SyntaxHighlighter
        language={lang === 'text' ? undefined : lang}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '1em 1.25em',
          background: 'transparent',
          fontSize: '0.8em',
          lineHeight: 1.6,
        }}
        codeTagProps={{
          style: {
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          },
        }}
        showLineNumbers={code.split('\n').length > 5}
        lineNumberStyle={{ color: '#3f3f5060', fontSize: '0.75em', paddingRight: '1em' }}
        wrapLines
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
});

CodeBlock.displayName = 'CodeBlock';
