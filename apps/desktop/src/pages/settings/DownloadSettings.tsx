import { useState } from 'react';
import { UilWindows, UilApple, UilLinux, UilDownloadAlt, UilExternalLinkAlt, UilCopy, UilCheck, UilCodeBranch as UilTerminal } from "@iconscout/react-unicons";

const VERSION = "2.2.0";
const STORAGE_BASE = "https://gvskdopsigtflbbylyto.supabase.co/storage/v1/object/public/releases";

const ONE_LINERS = [
  {
    platform: "Windows",
    icon: UilWindows,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    shell: "PowerShell",
    command: "iex (irm https://crowbyte.io/install.ps1)",
  },
  {
    platform: "macOS / Linux",
    icon: UilTerminal,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    shell: "bash",
    command: "curl -fsSL https://crowbyte.io/install.sh | bash",
  },
  {
    platform: "npm / Node.js",
    icon: UilTerminal,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    shell: "any terminal",
    command: "npx crowbyte@latest",
  },
];

const installers = [
  {
    platform: "Windows",
    icon: UilWindows,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    files: [
      { label: "Installer (.exe)", filename: `CrowByte-Setup-${VERSION}.exe`, recommended: true },
      { label: "MSI Package", filename: `CrowByte-${VERSION}-x64.msi`, recommended: false },
    ],
  },
  {
    platform: "macOS",
    icon: UilApple,
    color: "text-zinc-300",
    bg: "bg-white/[0.04]",
    border: "border-white/[0.08]",
    files: [
      { label: "Universal (.dmg)", filename: `CrowByte-${VERSION}.dmg`, recommended: true },
    ],
  },
  {
    platform: "Linux",
    icon: UilLinux,
    color: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/20",
    files: [
      { label: "AppImage", filename: `CrowByte-${VERSION}.AppImage`, recommended: true },
      { label: "Debian (.deb)", filename: `crowbyte_${VERSION}_amd64.deb`, recommended: false },
    ],
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for Electron file:// origin
      const el = document.createElement('textarea');
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={copy}
      className="flex-shrink-0 p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-all"
      title="Copy to clipboard"
    >
      {copied ? <UilCheck size={14} className="text-emerald-400" /> : <UilCopy size={14} />}
    </button>
  );
}

export default function DownloadSettings() {
  const download = (filename: string) => {
    window.open(`${STORAGE_BASE}/${filename}`, "_blank");
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold text-white">Download Desktop App</h2>
        <p className="text-xs text-zinc-500 mt-1">
          Current version: <span className="font-mono text-zinc-400">v{VERSION}</span>
          {" · "}
          <a
            href="https://crowbyte.io/changelog"
            target="_blank"
            rel="noreferrer"
            className="text-violet-400 hover:text-violet-300 transition-colors inline-flex items-center gap-0.5"
          >
            Changelog <UilExternalLinkAlt size={10} />
          </a>
        </p>
      </div>

      {/* One-liner install commands */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Quick Install — One Command</h3>
        {ONE_LINERS.map(({ platform, icon: Icon, color, bg, border, shell, command }) => (
          <div key={platform} className={`rounded-xl border ${border} ${bg} p-4`}>
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={color} />
              <span className="text-sm font-medium text-white">{platform}</span>
              <span className="text-[10px] text-zinc-500 font-mono ml-auto">{shell}</span>
            </div>
            <div className="flex items-center gap-2 bg-black/40 rounded-lg px-3 py-2 border border-white/[0.06]">
              <span className="text-zinc-500 font-mono text-xs select-none">$</span>
              <code className="flex-1 text-xs font-mono text-zinc-200 select-all">{command}</code>
              <CopyButton text={command} />
            </div>
          </div>
        ))}
      </div>

      {/* Manual downloads */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Manual Download</h3>
        {installers.map(({ platform, icon: Icon, color, bg, border, files }) => (
          <div key={platform} className={`rounded-xl border ${border} ${bg} p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <Icon size={18} className={color} />
              <span className="text-sm font-medium text-white">{platform}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {files.map(({ label, filename, recommended }) => (
                <button
                  key={filename}
                  onClick={() => download(filename)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    recommended
                      ? "bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/30"
                      : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-400 border border-white/[0.06]"
                  }`}
                >
                  <UilDownloadAlt size={13} />
                  {label}
                  {recommended && (
                    <span className="text-[9px] bg-violet-500/30 text-violet-300 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide">
                      Recommended
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-amber-500/[0.06] border border-amber-500/20 px-4 py-3 text-xs text-amber-400/80 leading-relaxed">
        <strong className="text-amber-400">Note:</strong> Downloads require an active Pro subscription. Make sure you're signed in with your CrowByte account. On Windows, if SmartScreen warns you, click "More info → Run anyway" — the app is code-signed but not yet Microsoft-certified.
      </div>
    </div>
  );
}
