import { memo } from 'react';
import { UilStar, UilRobot, UilBolt, UilWindow, UilShield, UilBug, UilGlobe, UilBracketsCurly } from "@iconscout/react-unicons";
type Provider = 'openrouter' | 'claude' | 'openclaw' | 'crowbyte';

interface EmptyStateProps {
  provider: Provider;
  onSendPrompt: (prompt: string) => void;
}

const SUGGESTIONS: Record<Provider, { icon: typeof UilWindow; text: string; prompt: string }[]> = {
  openrouter: [
    { icon: UilShield, text: 'Audit my CORS headers', prompt: 'Audit the CORS configuration of my Express server for security misconfigurations' },
    { icon: UilBug, text: 'Analyze a vulnerability', prompt: 'Explain this vulnerability and suggest remediation:\n\n' },
    { icon: UilBracketsCurly, text: 'Write a security tool', prompt: 'Write a Python script that checks for common misconfigurations in HTTP security headers' },
    { icon: UilGlobe, text: 'OSINT a domain', prompt: 'What information can you gather about the domain example.com using passive OSINT techniques?' },
  ],
  claude: [
    { icon: UilShield, text: 'Audit my CORS headers', prompt: 'Audit the CORS configuration of my Express server for security misconfigurations' },
    { icon: UilBug, text: 'Find vulns in this code', prompt: 'Review the following code for security vulnerabilities:\n\n```\n// paste code here\n```' },
    { icon: UilWindow, text: 'Recon a target', prompt: 'Run full recon on the target domain including subdomain enumeration, port scanning, and technology detection' },
    { icon: UilBracketsCurly, text: 'Write an exploit PoC', prompt: 'Write a proof of concept exploit for the following vulnerability:' },
  ],
  openclaw: [
    { icon: UilGlobe, text: 'Scan for subdomains', prompt: 'Run subfinder and httpx to enumerate and probe subdomains for the target' },
    { icon: UilShield, text: 'Check VPS security', prompt: 'Run a security audit on the VPS — check open ports, running services, and potential misconfigurations' },
    { icon: UilBug, text: 'Run nuclei scan', prompt: 'Run nuclei with critical and high severity templates against the target' },
    { icon: UilWindow, text: 'Deploy an agent', prompt: 'Dispatch the recon agent to perform full reconnaissance on the target domain' },
  ],
  crowbyte: [
    { icon: UilShield, text: 'Explain a CVE', prompt: 'Explain CVE-2024-XXXXX — what is the vulnerability, how is it exploited, and what is the remediation?' },
    { icon: UilBug, text: 'Analyze a WAF bypass', prompt: 'Help me bypass a WAF that blocks common XSS payloads. The filter seems to block <script> tags and event handlers.' },
    { icon: UilBracketsCurly, text: 'Write a payload', prompt: 'Generate an XSS payload that bypasses common sanitization filters' },
    { icon: UilGlobe, text: 'OSINT a domain', prompt: 'What information can you gather about the domain example.com using passive OSINT techniques?' },
  ],
};

// Static style maps — TW v4 needs statically-analyzable classes
const PROVIDER_STYLES = {
  openrouter: {
    icon: UilBolt,
    label: 'OpenRouter',
    desc: 'Multi-model AI — Qwen, DeepSeek, Llama, Gemini, free & paid models',
    iconBox: 'bg-cyan-500/8 ring-1 ring-cyan-500/15',
    iconColor: 'text-cyan-400',
    cardHover: 'hover:bg-cyan-500/5 hover:ring-cyan-500/15',
    suggestionIcon: 'bg-cyan-500/5 ring-1 ring-cyan-500/10',
    suggestionIconColor: 'text-cyan-400/60 group-hover/card:text-cyan-400',
  },
  claude: {
    icon: UilStar,
    label: 'Claude UilBracketsCurly',
    desc: 'Full MCP access — 344 tools, all permissions, .env-unfiltered workspace',
    iconBox: 'bg-violet-500/8 ring-1 ring-violet-500/15',
    iconColor: 'text-violet-400',
    cardHover: 'hover:bg-violet-500/5 hover:ring-violet-500/15',
    suggestionIcon: 'bg-violet-500/5 ring-1 ring-violet-500/10',
    suggestionIconColor: 'text-violet-400/60 group-hover/card:text-violet-400',
  },
  openclaw: {
    icon: UilRobot,
    label: 'OpenClaw',
    desc: 'VPS agent swarm — 9 agents, command execution, NVIDIA models',
    iconBox: 'bg-emerald-500/8 ring-1 ring-emerald-500/15',
    iconColor: 'text-emerald-400',
    cardHover: 'hover:bg-emerald-500/5 hover:ring-emerald-500/15',
    suggestionIcon: 'bg-emerald-500/5 ring-1 ring-emerald-500/10',
    suggestionIconColor: 'text-emerald-400/60 group-hover/card:text-emerald-400',
  },
  crowbyte: {
    icon: UilBolt,
    label: 'CrowByte AI',
    desc: 'Cybersecurity AI assistant — fast, free, no limits',
    iconBox: 'bg-zinc-800 ring-1 ring-zinc-700',
    iconColor: 'text-zinc-300',
    cardHover: 'hover:bg-zinc-800/60 hover:ring-zinc-600',
    suggestionIcon: 'bg-zinc-800/80 ring-1 ring-zinc-700/60',
    suggestionIconColor: 'text-zinc-500 group-hover/card:text-zinc-300',
  },
} as const;

export const EmptyState = memo(({ provider, onSendPrompt }: EmptyStateProps) => {
  const meta = PROVIDER_STYLES[provider];
  const suggestions = SUGGESTIONS[provider];

  return (
    <div className="flex flex-col items-center justify-center h-full py-16 animate-in fade-in duration-500">
      {/* Icon — clean, no underglow */}
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 ${meta.iconBox}`}>
        <meta.icon size={26} className={meta.iconColor} />
      </div>

      {/* Title */}
      <h2 className="text-lg font-semibold text-zinc-100 mb-1 tracking-tight">{meta.label}</h2>
      <p className="text-xs text-zinc-500 text-center max-w-md mb-8">{meta.desc}</p>

      {/* Suggested prompts */}
      <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={() => onSendPrompt(s.prompt)}
            className={`group/card flex items-center gap-3 p-3 rounded-xl text-left transition-all duration-200
              bg-white/[0.02] ring-1 ring-white/[0.06] ${meta.cardHover}`}
          >
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${meta.suggestionIcon}`}>
              <s.icon size={14} className={meta.suggestionIconColor} />
            </div>
            <span className="text-xs text-zinc-400 group-hover/card:text-zinc-200 transition-colors leading-tight">
              {s.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

EmptyState.displayName = 'EmptyState';
