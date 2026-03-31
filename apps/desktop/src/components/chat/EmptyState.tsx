import { memo } from 'react';
import { Sparkle, Robot, Lightning, Terminal, Shield, Bug, Globe, Code } from '@phosphor-icons/react';

type Provider = 'claude' | 'openclaw' | 'crowbyte';

interface EmptyStateProps {
  provider: Provider;
  onSendPrompt: (prompt: string) => void;
}

const SUGGESTIONS: Record<Provider, { icon: typeof Terminal; text: string; prompt: string }[]> = {
  claude: [
    { icon: Shield, text: 'Audit my CORS headers', prompt: 'Audit the CORS configuration of my Express server for security misconfigurations' },
    { icon: Bug, text: 'Find vulns in this code', prompt: 'Review the following code for security vulnerabilities:\n\n```\n// paste code here\n```' },
    { icon: Terminal, text: 'Recon a target', prompt: 'Run full recon on the target domain including subdomain enumeration, port scanning, and technology detection' },
    { icon: Code, text: 'Write an exploit PoC', prompt: 'Write a proof of concept exploit for the following vulnerability:' },
  ],
  openclaw: [
    { icon: Globe, text: 'Scan for subdomains', prompt: 'Run subfinder and httpx to enumerate and probe subdomains for the target' },
    { icon: Shield, text: 'Check VPS security', prompt: 'Run a security audit on the VPS — check open ports, running services, and potential misconfigurations' },
    { icon: Bug, text: 'Run nuclei scan', prompt: 'Run nuclei with critical and high severity templates against the target' },
    { icon: Terminal, text: 'Deploy an agent', prompt: 'Dispatch the recon agent to perform full reconnaissance on the target domain' },
  ],
  crowbyte: [
    { icon: Shield, text: 'Explain a CVE', prompt: 'Explain CVE-2024-XXXXX — what is the vulnerability, how is it exploited, and what is the remediation?' },
    { icon: Bug, text: 'Analyze a WAF bypass', prompt: 'Help me bypass a WAF that blocks common XSS payloads. The filter seems to block <script> tags and event handlers.' },
    { icon: Code, text: 'Write a payload', prompt: 'Generate an XSS payload that bypasses common sanitization filters' },
    { icon: Globe, text: 'OSINT a domain', prompt: 'What information can you gather about the domain example.com using passive OSINT techniques?' },
  ],
};

const PROVIDER_META: Record<Provider, { icon: typeof Sparkle; label: string; desc: string; color: string }> = {
  claude: {
    icon: Sparkle,
    label: 'Claude Code',
    desc: 'Full MCP access — 344 tools, all permissions, .env-unfiltered workspace',
    color: 'violet',
  },
  openclaw: {
    icon: Robot,
    label: 'OpenClaw',
    desc: 'VPS agent swarm — 9 agents, command execution, NVIDIA models',
    color: 'emerald',
  },
  crowbyte: {
    icon: Lightning,
    label: 'CrowByte AI',
    desc: 'Cybersecurity AI assistant — fast, free, no limits',
    color: 'blue',
  },
};

export const EmptyState = memo(({ provider, onSendPrompt }: EmptyStateProps) => {
  const meta = PROVIDER_META[provider];
  const suggestions = SUGGESTIONS[provider];

  return (
    <div className="flex flex-col items-center justify-center h-full py-16 animate-in fade-in duration-500">
      {/* Icon */}
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 ring-1 ring-${meta.color}-500/15 bg-${meta.color}-500/5`}>
        <meta.icon size={32} weight="duotone" className={`text-${meta.color}-400`} />
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold text-zinc-200 mb-1">{meta.label}</h2>
      <p className="text-xs text-zinc-600 text-center max-w-md mb-8">{meta.desc}</p>

      {/* Suggested prompts */}
      <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSendPrompt(s.prompt)}
            className={`group/card flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200
              bg-white/[0.02] hover:bg-${meta.color}-500/5
              ring-1 ring-white/[0.06] hover:ring-${meta.color}-500/20`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-${meta.color}-500/5 ring-1 ring-${meta.color}-500/10`}>
              <s.icon size={14} weight="duotone" className={`text-${meta.color}-400/60 group-hover/card:text-${meta.color}-400`} />
            </div>
            <span className="text-xs text-zinc-400 group-hover/card:text-zinc-300 transition-colors leading-tight">
              {s.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

EmptyState.displayName = 'EmptyState';
