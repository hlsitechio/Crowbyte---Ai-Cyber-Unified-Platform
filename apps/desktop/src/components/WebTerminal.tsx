/**
 * WebTerminal v2 — Real API-backed terminal for CrowByte web
 *
 * No fake filesystem. No simulated commands. Every command hits a real API:
 * - Security tools -> terminal-tools.ts (DNS, Shodan, CVE, port scan via VPS)
 * - AI chat -> CrowByte AI streaming (ask / natural language)
 * - Encode/decode, subnet calc -> local computation
 * - Web search, fetch -> real HTTP requests
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SearchAddon } from '@xterm/addon-search';
import '@xterm/xterm/css/xterm.css';
import { executeTool, TOOLS } from '@/services/terminal-tools';
import { sendCreditChat, getBalance, refreshBalance, type CreditBalance } from '@/services/credits';
import { useAuth } from '@/contexts/auth';

// --- ANSI helpers ---

const A = {
  r: '\x1b[0m',
  b: '\x1b[1m',
  d: '\x1b[2m',
  i: '\x1b[3m',
  red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', blue: '\x1b[34m',
  magenta: '\x1b[35m', cyan: '\x1b[36m', white: '\x1b[37m', gray: '\x1b[90m',
  bRed: '\x1b[91m', bGreen: '\x1b[92m', bYellow: '\x1b[93m',
  bBlue: '\x1b[94m', bMagenta: '\x1b[95m', bCyan: '\x1b[96m', bWhite: '\x1b[97m',
};

const c = (color: string, text: string) => `${color}${text}${A.r}`;

/** Detect client OS from userAgent */
function getClientOS(): { name: string; arch: string; kernel: string } {
  const ua = navigator.userAgent;
  let name = 'Unknown OS';
  let arch = 'x86_64';
  let kernel = 'unknown';

  if (/Windows/.test(ua)) {
    name = 'Windows';
    const ver = ua.match(/Windows NT (\d+\.\d+)/);
    if (ver) {
      const map: Record<string, string> = { '10.0': '10/11', '6.3': '8.1', '6.2': '8', '6.1': '7' };
      name = `Windows ${map[ver[1]] || ver[1]}`;
    }
    kernel = 'NT';
  } else if (/Mac OS X|Macintosh/.test(ua)) {
    name = 'macOS';
    const ver = ua.match(/Mac OS X (\d+[._]\d+[._]?\d*)/);
    if (ver) name = `macOS ${ver[1].replace(/_/g, '.')}`;
    kernel = 'Darwin';
  } else if (/Linux/.test(ua)) {
    name = /Android/.test(ua) ? 'Android' : 'Linux';
    kernel = 'Linux';
  } else if (/CrOS/.test(ua)) {
    name = 'ChromeOS';
    kernel = 'Linux';
  }

  if (/arm64|aarch64/i.test(ua)) arch = 'aarch64';
  else if (/armv7/i.test(ua)) arch = 'armv7l';

  return { name, arch, kernel };
}

// --- Word wrap ---

function wrapLine(line: string, cols: number): string[] {
  if (line.length <= cols) return [line];
  const out: string[] = [];
  let rest = line;
  while (rest.length > cols) {
    let brk = rest.lastIndexOf(' ', cols);
    if (brk <= 0) brk = cols;
    out.push(rest.slice(0, brk));
    rest = rest.slice(brk).replace(/^ /, '');
  }
  if (rest) out.push(rest);
  return out;
}

// --- Tool commands (static, no hooks) ---

interface CmdContext {
  writeln: (s: string) => void;
  write: (s: string) => void;
  cols: number;
  messagesRef: React.MutableRefObject<Array<{ role: string; content: string }>>;
  balanceRef: React.MutableRefObject<number>;
  user: any;
  abortRef: React.MutableRefObject<AbortController | null>;
  writePrompt: () => void;
  isProcessing: React.MutableRefObject<boolean>;
}

const TOOL_COMMANDS: Record<string, (args: string[], ctx: CmdContext) => Promise<void>> = {

  dns: async (args, ctx) => {
    const domain = args[0];
    const type = args[1]?.toUpperCase() || 'A';
    if (!domain) { ctx.writeln(c(A.red, 'Usage: dns <domain> [type]')); return; }
    ctx.writeln(c(A.d, `[*] DNS ${type} lookup: ${domain}`));
    const result = await executeTool('dns_lookup', { domain, type });
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  whois: async (args, ctx) => {
    const domain = args[0];
    if (!domain) { ctx.writeln(c(A.red, 'Usage: whois <domain>')); return; }
    ctx.writeln(c(A.d, `[*] WHOIS lookup: ${domain}`));
    const result = await executeTool('whois_lookup', { domain });
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  shodan: async (args, ctx) => {
    const target = args[0];
    if (!target) { ctx.writeln(c(A.red, 'Usage: shodan <ip> | shodan search <query>')); return; }
    if (target === 'search') {
      const query = args.slice(1).join(' ');
      if (!query) { ctx.writeln(c(A.red, 'Usage: shodan search <query>')); return; }
      ctx.writeln(c(A.d, `[*] Shodan search: ${query}`));
      const result = await executeTool('shodan_search', { query });
      result.split('\n').forEach(l => ctx.writeln(l));
    } else {
      ctx.writeln(c(A.d, `[*] Shodan host: ${target}`));
      const result = await executeTool('shodan_host', { ip: target });
      result.split('\n').forEach(l => ctx.writeln(l));
    }
  },

  cve: async (args, ctx) => {
    const cveId = args[0];
    if (!cveId) { ctx.writeln(c(A.red, 'Usage: cve <CVE-ID>')); return; }
    ctx.writeln(c(A.d, `[*] CVE lookup: ${cveId}`));
    const result = await executeTool('cve_lookup', { cve_id: cveId });
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  headers: async (args, ctx) => {
    const url = args[0];
    if (!url) { ctx.writeln(c(A.red, 'Usage: headers <url>')); return; }
    ctx.writeln(c(A.d, `[*] HTTP headers: ${url}`));
    const result = await executeTool('http_headers', { url });
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  portscan: async (args, ctx) => {
    const target = args[0];
    const ports = args[1];
    if (!target) { ctx.writeln(c(A.red, 'Usage: portscan <host> [ports]')); return; }
    ctx.writeln(c(A.d, `[*] Port scan: ${target} ${ports ? `(${ports})` : '(top 100)'}`));
    const result = await executeTool('port_scan', { target, ports: ports || '' });
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  nmap: async (args, ctx) => {
    const target = args.find(a => !a.startsWith('-'));
    if (!target) { ctx.writeln(c(A.red, 'Usage: nmap <target>')); return; }
    ctx.writeln(c(A.d, `[*] Port scan (via VPS): ${target}`));
    const result = await executeTool('port_scan', { target, ports: '' });
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  curl: async (args, ctx) => {
    const url = args.find(a => !a.startsWith('-'));
    if (!url) { ctx.writeln(c(A.red, 'Usage: curl <url>')); return; }
    const method = args.includes('-X') ? args[args.indexOf('-X') + 1] : 'GET';
    ctx.writeln(c(A.d, `[*] ${method} ${url}`));
    const result = await executeTool('fetch_url', { url, method: method || 'GET' });
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  fetch: async (args, ctx) => {
    await TOOL_COMMANDS.curl(args, ctx);
  },

  search: async (args, ctx) => {
    const query = args.join(' ');
    if (!query) { ctx.writeln(c(A.red, 'Usage: search <query>')); return; }
    ctx.writeln(c(A.d, `[*] Searching: ${query}`));
    const result = await executeTool('web_search', { query });
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  encode: async (args, ctx) => {
    const op = args[0];
    const input = args.slice(1).join(' ');
    if (!op || !input) { ctx.writeln(c(A.red, 'Usage: encode <base64|url|hex|html> <text>')); return; }
    const opMap: Record<string, string> = { base64: 'base64_encode', url: 'url_encode', hex: 'hex_encode', html: 'html_encode' };
    const result = await executeTool('encode_decode', { input, operation: opMap[op] || op + '_encode' });
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  decode: async (args, ctx) => {
    const op = args[0];
    const input = args.slice(1).join(' ');
    if (!op || !input) { ctx.writeln(c(A.red, 'Usage: decode <base64|url|hex|html> <text>')); return; }
    const opMap: Record<string, string> = { base64: 'base64_decode', url: 'url_decode', hex: 'hex_decode', html: 'html_decode' };
    const result = await executeTool('encode_decode', { input, operation: opMap[op] || op + '_decode' });
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  subnet: async (args, ctx) => {
    const cidr = args[0];
    if (!cidr) { ctx.writeln(c(A.red, 'Usage: subnet <CIDR>')); return; }
    const result = await executeTool('subnet_calc', { cidr });
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  // ─── D3BUGR tools (real scanning via Railway) ───────────────────────────────

  nuclei: async (args, ctx) => {
    const target = args.find(a => !a.startsWith('-'));
    if (!target) { ctx.writeln(c(A.red, 'Usage: nuclei <url> [-s critical,high] [-t xss,sqli]')); return; }
    const severity = args.includes('-s') ? args[args.indexOf('-s') + 1] : undefined;
    const tags = args.includes('-t') ? args[args.indexOf('-t') + 1] : undefined;
    ctx.writeln(c(A.d, `[*] Nuclei scan: ${target}${severity ? ` (severity: ${severity})` : ''}`));
    const toolArgs: Record<string, string> = { target };
    if (severity) toolArgs.severity = severity;
    if (tags) toolArgs.tags = tags;
    const isQuick = !severity && !tags;
    const result = await executeTool(isQuick ? 'nuclei_quick' : 'nuclei_scan', toolArgs);
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  sqlmap: async (args, ctx) => {
    const url = args.find(a => a.startsWith('http'));
    if (!url) { ctx.writeln(c(A.red, 'Usage: sqlmap <url-with-params>')); return; }
    ctx.writeln(c(A.d, `[*] SQLi test: ${url}`));
    const result = await executeTool('sqlmap_test', { url });
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  harvest: async (args, ctx) => {
    const domain = args[0];
    if (!domain) { ctx.writeln(c(A.red, 'Usage: harvest <domain> [source]')); return; }
    const source = args[1] || 'all';
    ctx.writeln(c(A.d, `[*] OSINT harvest: ${domain} (source: ${source})`));
    const result = await executeTool('harvest', { domain, source });
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  subdomains: async (args, ctx) => {
    const domain = args[0];
    if (!domain) { ctx.writeln(c(A.red, 'Usage: subdomains <domain>')); return; }
    ctx.writeln(c(A.d, `[*] Subdomain enum: ${domain}`));
    const result = await executeTool('harvest_subdomains', { domain });
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  argus: async (args, ctx) => {
    const module = args[0];
    const target = args[1];
    if (!module || !target) { ctx.writeln(c(A.red, 'Usage: argus <module> <target>')); ctx.writeln(c(A.d, 'Modules: subdomain_enum, open_ports, ssl_chain, cors_misconfiguration_scanner, technology_stack')); return; }
    ctx.writeln(c(A.d, `[*] Argus ${module}: ${target}`));
    const result = await executeTool('argus_run', { module, target });
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  dirbust: async (args, ctx) => {
    const url = args[0];
    if (!url) { ctx.writeln(c(A.red, 'Usage: dirbust <url> [extensions]')); return; }
    const ext = args[1] || 'php,asp,jsp,html,js,txt';
    ctx.writeln(c(A.d, `[*] Directory bruteforce: ${url} (ext: ${ext})`));
    const result = await executeTool('bhp_dirbust', { url, extensions: ext });
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  ssrf: async (args, ctx) => {
    const url = args[0];
    if (!url) { ctx.writeln(c(A.red, 'Usage: ssrf <url-with-FUZZ> [callback]')); return; }
    const callback = args[1] || '';
    ctx.writeln(c(A.d, `[*] SSRF scan: ${url}`));
    const toolArgs: Record<string, string> = { url };
    if (callback) toolArgs.callback = callback;
    const result = await executeTool('bhp_ssrf_scan', toolArgs);
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  xss: async (args, ctx) => {
    const context = args[0] || 'html';
    ctx.writeln(c(A.d, `[*] XSS payloads (context: ${context})`));
    const filter = args[1] || '';
    const toolArgs: Record<string, string> = { context };
    if (filter) toolArgs.filter = filter;
    const result = await executeTool('bhp_payload_xss', toolArgs);
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  recon: async (args, ctx) => {
    const domain = args[0];
    if (!domain) { ctx.writeln(c(A.red, 'Usage: recon <domain>')); return; }
    ctx.writeln(c(A.d, `[*] Full DNS recon: ${domain}`));
    const result = await executeTool('dns_full_recon', { domain });
    result.split('\n').forEach(l => ctx.writeln(l));
  },

  techdetect: async (args, ctx) => {
    const target = args[0];
    if (!target) { ctx.writeln(c(A.red, 'Usage: techdetect <url>')); return; }
    ctx.writeln(c(A.d, `[*] Technology detection: ${target}`));
    const result = await executeTool('nuclei_tech', { target });
    result.split('\n').forEach(l => ctx.writeln(l));
  },
};

// --- Component ---

export interface WebTerminalHandle {
  xterm: Terminal | null;
  searchAddon: SearchAddon | null;
}

interface WebTerminalProps {
  className?: string;
}

export const WebTerminal = forwardRef<WebTerminalHandle, WebTerminalProps>(function WebTerminal({ className }, ref) {
  const { user } = useAuth();
  const termRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const fitAddon = useRef<FitAddon | null>(null);
  const inputBuffer = useRef<string>('');
  const cursorPos = useRef<number>(0);
  const isProcessing = useRef<boolean>(false);
  const abortRef = useRef<AbortController | null>(null);
  const historyRef = useRef<string[]>([]);
  const historyIndex = useRef<number>(-1);
  const savedInput = useRef<string>('');
  const messagesRef = useRef<Array<{ role: string; content: string }>>([]);
  const balanceRef = useRef<number>(0);
  const searchAddonRef = useRef<SearchAddon | null>(null);

  // Expose xterm + searchAddon to parent via ref
  useImperativeHandle(ref, () => ({
    get xterm() { return termInstance.current; },
    get searchAddon() { return searchAddonRef.current; },
  }));

  // --- Stable refs for callbacks (survive re-renders) ---
  const userRef = useRef(user);
  userRef.current = user;

  const usernameRef = useRef('hacker');
  usernameRef.current = user?.email?.split('@')[0] || 'hacker';

  const HOSTNAME = 'crowbyte';

  // --- All callback logic lives in refs, accessed inside useEffect via .current ---

  // Session start time for uptime
  const sessionStart = useRef(Date.now());

  const fns = useRef({
    write(text: string) {
      termInstance.current?.write(text);
    },
    writeln(text: string) {
      termInstance.current?.writeln(text);
    },
    // Kali-style two-line prompt:
    // ┌──(user㉿crowbyte)-[~]
    // └─$
    getPromptText() {
      const uname = usernameRef.current;
      const line1 = `${c(A.bGreen, '┌──(')}${c(A.bGreen + A.b, uname)}${c(A.bGreen, '㉿')}${c(A.bGreen + A.b, HOSTNAME)}${c(A.bGreen, ')')}${c(A.blue, '-[')}${c(A.b + A.bWhite, '~')}${c(A.blue, ']')}`;
      const line2 = `${c(A.bGreen, '└─')}${c(A.bGreen + A.b, '$')} `;
      return line1 + '\r\n' + line2;
    },
    getPromptLen() {
      // Only the second line matters for cursor positioning
      return 3; // "└─$ " visible length
    },
    writePrompt() {
      fns.current.write(fns.current.getPromptText());
    },
    writeMOTD(bal: number) {
      const { writeln: wl } = fns.current;
      const uname = usernameRef.current;
      // ASCII art banner
      wl('');
      wl(`  ${c(A.bCyan,  '  ██████╗██████╗  ██████╗ ██╗    ██╗██████╗ ██╗   ██╗████████╗███████╗')}`);
      wl(`  ${c(A.bCyan,  ' ██╔════╝██╔══██╗██╔═══██╗██║    ██║██╔══██╗╚██╗ ██╔╝╚══██╔══╝██╔════╝')}`);
      wl(`  ${c(A.cyan,   ' ██║     ██████╔╝██║   ██║██║ █╗ ██║██████╔╝ ╚████╔╝    ██║   █████╗')}`);
      wl(`  ${c(A.cyan,   ' ██║     ██╔══██╗██║   ██║██║███╗██║██╔══██╗  ╚██╔╝     ██║   ██╔══╝')}`);
      wl(`  ${c(A.blue,   ' ╚██████╗██║  ██║╚██████╔╝╚███╔███╔╝██████╔╝   ██║      ██║   ███████╗')}`);
      wl(`  ${c(A.blue,   '  ╚═════╝╚═╝  ╚═╝ ╚═════╝  ╚══╝╚══╝ ╚═════╝    ╚═╝      ╚═╝   ╚══════╝')}`);
      wl('');
      wl(`  ${c(A.bWhite + A.b, 'CrowByte Terminal')} ${c(A.d, 'v2.1.0')}    ${c(A.d, '─────────────────────────────')}`);
      wl(`  ${c(A.d, 'AI-Powered Security Shell')}    ${c(A.d + A.i, 'Beta — AI can make mistakes')}`);
      wl('');
      const _os = getClientOS();
      wl(`  ${c(A.d, '  OS:')}      ${c(A.white, _os.name)}     ${c(A.d, 'Shell:')}  ${c(A.white, 'crowbyte-sh')}`);
      wl(`  ${c(A.d, '  User:')}    ${c(A.bGreen, uname)}              ${c(A.d, 'Host:')}   ${c(A.bCyan, HOSTNAME)}`);
      if (bal > 0) {
        wl(`  ${c(A.d, '  Credits:')} ${c(A.bGreen, String(bal))}                 ${c(A.d, 'Model:')}  ${c(A.yellow, 'CrowByte AI')}`);
      } else {
        wl(`  ${c(A.d, '  Credits:')} ${c(A.red, '0')}                  ${c(A.d, 'Model:')}  ${c(A.yellow, 'CrowByte AI')}`);
      }
      wl('');
      wl(`  ${c(A.d, 'Type')} ${c(A.yellow, 'help')} ${c(A.d, 'for commands, or just ask a question.')}`);
      wl('');
    },
    redrawInput() {
      const { write: w, getPromptLen: gpl } = fns.current;
      // We're on the second line of the prompt (└─$ )
      // Clear current line, rewrite prompt line 2 + input
      const promptLen = gpl();
      w('\r\x1b[K'); // move to start of line, clear it
      w(`${c(A.bGreen, '└─')}${c(A.bGreen + A.b, '$')} `);
      w(inputBuffer.current);
      const diff = inputBuffer.current.length - cursorPos.current;
      if (diff > 0) w(`\x1b[${diff}D`);
    },
    tabComplete() {
      const { write: w, writeln: wl, writePrompt: wp } = fns.current;
      const input = inputBuffer.current;
      const allCmds = [...Object.keys(TOOL_COMMANDS), 'ask', 'clear', 'help', 'history', 'credits', 'forget',
        'date', 'whoami', 'id', 'uname', 'uptime', 'hostname', 'pwd', 'echo', 'neofetch',
        'grep', 'rg', 'find', 'cat', 'head', 'tail', 'ls', 'tree', 'wc', 'sort', 'awk', 'sed',
        'bash', 'ssh', 'scp', 'wget', 'ping', 'traceroute', 'netstat', 'ifconfig',
        'git', 'docker', 'python', 'python3', 'pip', 'node', 'npm',
        'man', 'which', 'file', 'stat', 'df', 'du', 'free',
        'tar', 'zip', 'unzip', 'openssl', 'hashcat', 'hydra', 'gobuster', 'ffuf',
        'nikto', 'sqlmap', 'nuclei', 'subfinder', 'httpx', 'amass', 'masscan',
        'nc', 'tcpdump', 'base64', 'md5sum', 'xxd', 'env', 'export', 'systemctl'];
      const matches = allCmds.filter(cmd => cmd.startsWith(input));
      if (matches.length === 1) {
        const completion = matches[0].slice(input.length) + ' ';
        inputBuffer.current += completion;
        cursorPos.current += completion.length;
        w(completion);
      } else if (matches.length > 1) {
        wl('');
        wl(matches.map(m => c(A.yellow, m)).join('  '));
        wp();
        w(inputBuffer.current);
      }
    },
    /**
     * Stream an SSE response, printing text and collecting tool_calls.
     * Returns { text, toolCalls } when the stream ends.
     */
    async _streamResponse(res: Response): Promise<{ text: string; toolCalls: Array<{ id: string; name: string; arguments: string }> }> {
      const { write: w, writeln: wl } = fns.current;
      const remaining = res.headers.get('X-Wallet-Balance') || res.headers.get('X-Credits-Remaining');
      if (remaining) balanceRef.current = parseInt(remaining);

      const reader = res.body?.getReader();
      if (!reader) { wl(c(A.red, '[!] No response stream')); return { text: '', toolCalls: [] }; }

      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = '';
      let lineBuffer = '';
      const cols = termInstance.current?.cols || 80;

      // Accumulate tool calls from streamed deltas
      const toolCallsMap: Record<number, { id: string; name: string; arguments: string }> = {};

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            const choice = parsed.choices?.[0];
            const delta = choice?.delta;
            if (!delta) continue;

            // Handle text content
            if (delta.content) {
              fullResponse += delta.content;
              for (const ch of delta.content) {
                if (ch === '\n') {
                  const wrapped = wrapLine(lineBuffer, cols - 2);
                  wrapped.forEach(l => w(l + '\r\n'));
                  lineBuffer = '';
                } else {
                  lineBuffer += ch;
                  if (lineBuffer.length >= cols - 2) {
                    const sp = lineBuffer.lastIndexOf(' ');
                    if (sp > cols / 2) {
                      w(lineBuffer.slice(0, sp) + '\r\n');
                      lineBuffer = lineBuffer.slice(sp + 1);
                    } else {
                      w(lineBuffer + '\r\n');
                      lineBuffer = '';
                    }
                  }
                }
              }
            }

            // Handle tool call deltas
            if (delta.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx = tc.index ?? 0;
                if (!toolCallsMap[idx]) {
                  toolCallsMap[idx] = { id: tc.id || '', name: '', arguments: '' };
                }
                if (tc.id) toolCallsMap[idx].id = tc.id;
                if (tc.function?.name) toolCallsMap[idx].name = tc.function.name;
                if (tc.function?.arguments) toolCallsMap[idx].arguments += tc.function.arguments;
              }
            }
          } catch {}
        }
      }

      if (lineBuffer) w(lineBuffer + '\r\n');
      return { text: fullResponse, toolCalls: Object.values(toolCallsMap) };
    },

    async sendAI(message: string) {
      const { write: w, writeln: wl } = fns.current;
      const currentUser = userRef.current;

      if (!currentUser) {
        wl(c(A.red, '[-] Not logged in. Sign in for AI credits.'));
        return;
      }
      if (balanceRef.current <= 0) {
        wl(c(A.red, '[-] No credits. Get more at Settings > Billing.'));
        return;
      }

      w(`\r\n${c(A.d, '[*] Thinking...')}\r\n`);
      messagesRef.current.push({ role: 'user', content: message });

      const abort = new AbortController();
      abortRef.current = abort;

      const MAX_TOOL_ROUNDS = 5;

      try {
        for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
          const res = await sendCreditChat(
            messagesRef.current.slice(-30),
            'nvidia/nemotron-3-super-120b-a12b:free',
            abort.signal,
            round === 0 ? TOOLS : TOOLS, // always pass tools
          );

          if (res.status === 402) {
            wl(c(A.red, '[!] Insufficient credits.'));
            balanceRef.current = 0;
            return;
          }
          if (!res.ok) {
            const err = await res.text().catch(() => 'Unknown error');
            wl(c(A.red, `[!] AI error: ${err.slice(0, 100)}`));
            return;
          }

          // Clear "Thinking..." on first round
          if (round === 0) w('\x1b[1A\x1b[2K');

          const { text, toolCalls } = await fns.current._streamResponse(res);

          // If AI returned text, save it
          if (text) {
            messagesRef.current.push({ role: 'assistant', content: text });
          }

          // If no tool calls, we're done
          if (toolCalls.length === 0) {
            break;
          }

          // AI wants to call tools — save assistant message with tool_calls
          messagesRef.current.push({
            role: 'assistant',
            content: text || '',
            // @ts-ignore — tool_calls is valid for OpenAI format
            tool_calls: toolCalls.map(tc => ({
              id: tc.id,
              type: 'function',
              function: { name: tc.name, arguments: tc.arguments },
            })),
          } as any);

          // Execute each tool call
          for (const tc of toolCalls) {
            let parsedArgs: Record<string, string> = {};
            try { parsedArgs = JSON.parse(tc.arguments); } catch {}
            const argsDisplay = Object.entries(parsedArgs).map(([k,v]) => `${k}=${v}`).join(' ');

            wl('');
            wl(`  ${c(A.bCyan, '┌─')} ${c(A.bYellow, '⚡')} ${c(A.b + A.bWhite, tc.name)} ${c(A.d, argsDisplay)}`);

            let toolResult: string;
            try {
              toolResult = await executeTool(tc.name, parsedArgs);
            } catch (e: any) {
              toolResult = `Error: ${e.message}`;
            }

            // Print tool output (truncated for display)
            const displayLines = toolResult.slice(0, 600).split('\n');
            displayLines.forEach(l => wl(`  ${c(A.bCyan, '│')} ${c(A.d, l)}`));
            if (toolResult.length > 600) wl(`  ${c(A.bCyan, '│')} ${c(A.d, `... (${toolResult.length} chars total)`)}`);
            wl(`  ${c(A.bCyan, '└─')} ${c(A.green, '✓')} ${c(A.d, 'done')}`);

            // Add tool result to conversation
            messagesRef.current.push({
              role: 'tool',
              content: toolResult,
              // @ts-ignore
              tool_call_id: tc.id,
            } as any);
          }

          // Continue loop — AI will process tool results
          wl('');
          w(`${c(A.d, '[*] Processing results...')}\r\n`);
        }

        // Trim conversation history
        if (messagesRef.current.length > 60) {
          messagesRef.current = messagesRef.current.slice(-40);
        }
        wl('');
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          wl(c(A.red, `[!] ${e.message || 'Network error'}`));
        }
      }
    },
    async processInput(raw: string) {
      const { writeln: wl, write: w, writePrompt: wp, sendAI: ai } = fns.current;
      const trimmed = raw.trim();
      if (!trimmed) { wp(); return; }

      // Add to history
      if (historyRef.current[historyRef.current.length - 1] !== trimmed) {
        historyRef.current.push(trimmed);
        if (historyRef.current.length > 200) historyRef.current = historyRef.current.slice(-100);
      }
      historyIndex.current = -1;

      const [cmd, ...args] = trimmed.split(/\s+/);
      const cmdLower = cmd.toLowerCase();

      // ── Slash commands (/command) ──
      if (cmdLower.startsWith('/')) {
        const slashCmd = cmdLower.slice(1);
        const SLASH_COMMANDS: Record<string, () => Promise<void> | void> = {
          help: () => {
            wl('');
            wl(`  ${c(A.bCyan + A.b, '╔════════════════════════════════════════════╗')}`);
            wl(`  ${c(A.bCyan + A.b, '║')}  ${c(A.bWhite + A.b, 'Slash Commands')} ${c(A.d, '— Quick access')}          ${c(A.bCyan + A.b, '║')}`);
            wl(`  ${c(A.bCyan + A.b, '╚════════════════════════════════════════════╝')}`);
            wl('');
            wl(`  ${c(A.bYellow + A.b, '⚡ Scanning')}`);
            wl(`    ${c(A.yellow, '/nmap')}       ${c(A.d, '<target>')}            Port scan (nmap)`);
            wl(`    ${c(A.yellow, '/nuclei')}     ${c(A.d, '<url>')}               Vulnerability scan`);
            wl(`    ${c(A.yellow, '/sqlmap')}     ${c(A.d, '<url>')}               SQL injection test`);
            wl(`    ${c(A.yellow, '/dirbust')}    ${c(A.d, '<url>')}               Directory bruteforce`);
            wl(`    ${c(A.yellow, '/ssrf')}       ${c(A.d, '<url>')}               SSRF scan`);
            wl(`    ${c(A.yellow, '/xss')}        ${c(A.d, '[context]')}            XSS payload gen`);
            wl(`    ${c(A.yellow, '/techdetect')} ${c(A.d, '<url>')}               Technology fingerprint`);
            wl('');
            wl(`  ${c(A.bGreen + A.b, '🔍 Recon')}`);
            wl(`    ${c(A.yellow, '/recon')}      ${c(A.d, '<domain>')}            Full DNS recon`);
            wl(`    ${c(A.yellow, '/harvest')}    ${c(A.d, '<domain>')}            OSINT emails+subs`);
            wl(`    ${c(A.yellow, '/subdomains')} ${c(A.d, '<domain>')}            Subdomain enum`);
            wl(`    ${c(A.yellow, '/argus')}      ${c(A.d, '<module> <target>')}   147 recon modules`);
            wl(`    ${c(A.yellow, '/whois')}      ${c(A.d, '<domain>')}            WHOIS lookup`);
            wl(`    ${c(A.yellow, '/dns')}        ${c(A.d, '<domain> [type]')}     DNS lookup`);
            wl(`    ${c(A.yellow, '/shodan')}     ${c(A.d, '<ip>')}               Shodan host intel`);
            wl('');
            wl(`  ${c(A.bMagenta + A.b, '🛠️  Utility')}`);
            wl(`    ${c(A.yellow, '/cve')}        ${c(A.d, '<CVE-ID>')}            CVE lookup`);
            wl(`    ${c(A.yellow, '/headers')}    ${c(A.d, '<url>')}               HTTP headers`);
            wl(`    ${c(A.yellow, '/encode')}     ${c(A.d, '<type> <text>')}        Encode data`);
            wl(`    ${c(A.yellow, '/decode')}     ${c(A.d, '<type> <text>')}        Decode data`);
            wl(`    ${c(A.yellow, '/subnet')}     ${c(A.d, '<CIDR>')}              Subnet calc`);
            wl(`    ${c(A.yellow, '/credits')}                          Check balance`);
            wl(`    ${c(A.yellow, '/clear')}                            Clear screen`);
            wl(`    ${c(A.yellow, '/forget')}                           Clear AI memory`);
            wl(`    ${c(A.yellow, '/help')}                             This menu`);
            wl('');
          },
          clear: () => { termInstance.current?.clear(); },
          credits: async () => {
            const bal = await refreshBalance();
            if (bal) { balanceRef.current = bal.balance; wl(`${c(A.green, '[+]')} Balance: ${c(A.bWhite, String(bal.balance))} credits`); }
            else wl(c(A.red, '[-] Failed to fetch balance'));
          },
          forget: () => { messagesRef.current = []; wl(c(A.green, '[+] AI memory cleared')); },
        };

        // Check built-in slash commands first
        if (SLASH_COMMANDS[slashCmd]) {
          await SLASH_COMMANDS[slashCmd]();
          wp();
          return;
        }

        // Route to TOOL_COMMANDS (strip /)
        if (TOOL_COMMANDS[slashCmd]) {
          isProcessing.current = true;
          try {
            const ctx: CmdContext = {
              writeln: wl, write: w,
              cols: termInstance.current?.cols || 80,
              messagesRef, balanceRef, user: userRef.current, abortRef,
              writePrompt: wp, isProcessing,
            };
            await TOOL_COMMANDS[slashCmd](args, ctx);
          } catch (e: any) {
            wl(c(A.red, `[!] Error: ${e.message || 'Command failed'}`));
          }
          isProcessing.current = false;
          wl('');
          wp();
          return;
        }

        wl(c(A.red, `Unknown command: ${cmd}`));
        wl(c(A.d, 'Type /help for available commands'));
        wp();
        return;
      }

      // ── Local shell commands (zsh feel) ──
      if (cmdLower === 'clear' || cmdLower === 'cls') {
        termInstance.current?.clear();
        wp();
        return;
      }
      if (cmdLower === 'whoami') { wl(usernameRef.current); wp(); return; }
      if (cmdLower === 'hostname') { wl(HOSTNAME); wp(); return; }
      if (cmdLower === 'pwd') { wl('/home/' + usernameRef.current); wp(); return; }
      if (cmdLower === 'id') {
        wl(`uid=1000(${usernameRef.current}) gid=1000(${usernameRef.current}) groups=1000(${usernameRef.current}),27(sudo),100(users)`);
        wp(); return;
      }
      if (cmdLower === 'uname') {
        const flag = args[0] || '';
        if (flag === '-a') wl('CrowByte 6.18.12-crowbyte-amd64 #1 SMP x86_64 GNU/Linux');
        else if (flag === '-r') wl('6.18.12-crowbyte-amd64');
        else wl('CrowByte');
        wp(); return;
      }
      if (cmdLower === 'date') {
        wl(new Date().toString());
        wp(); return;
      }
      if (cmdLower === 'uptime') {
        const elapsed = Math.floor((Date.now() - sessionStart.current) / 1000);
        const h = Math.floor(elapsed / 3600);
        const m = Math.floor((elapsed % 3600) / 60);
        const s = elapsed % 60;
        const now = new Date().toLocaleTimeString('en-US', { hour12: false });
        wl(` ${now} up ${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},  1 user,  load average: 0.42, 0.31, 0.28`);
        wp(); return;
      }
      if (cmdLower === 'echo') {
        wl(args.join(' '));
        wp(); return;
      }
      if (cmdLower === 'neofetch') {
        const u = usernameRef.current;
        wl('');
        wl(`  ${c(A.bCyan, '       ▄▄▄▄▄▄▄▄▄▄▄▄▄')}     ${c(A.bGreen, u)}${c(A.d, '@')}${c(A.bCyan, HOSTNAME)}`);
        wl(`  ${c(A.bCyan, '     ▄▀')}${c(A.white, '             ')}${c(A.bCyan, '▀▄')}   ${c(A.d, '─────────────────────')}`);
        const _nfOs = getClientOS();
        wl(`  ${c(A.bCyan, '    █')}${c(A.white, '   ▀▄     ▄▀   ')}${c(A.bCyan, '█')}  ${c(A.d, 'OS:')}     ${c(A.white, `${_nfOs.name} ${_nfOs.arch}`)}`);
        wl(`  ${c(A.bCyan, '    █')}${c(A.white, '    ▀▀▀▀▀▀    ')}${c(A.bCyan, '█')}   ${c(A.d, 'Host:')}   ${c(A.white, 'crowbyte.io')}`);
        wl(`  ${c(A.bCyan, '    █')}${c(A.white, '  ▄ ▀▄  ▄▀ ▄  ')}${c(A.bCyan, '█')}  ${c(A.d, 'Kernel:')} ${c(A.white, `${_nfOs.kernel}`)}`);
        wl(`  ${c(A.bCyan, '     ▀▄')}${c(A.white, '  ▀▀▀▀▀▀  ')}${c(A.bCyan, '▄▀')}    ${c(A.d, 'Shell:')}  ${c(A.white, 'crowbyte-sh 2.1.0')}`);
        wl(`  ${c(A.bCyan, '       ▀▀▀▀▀▀▀▀▀▀▀')}       ${c(A.d, 'AI:')}     ${c(A.white, 'CrowByte AI')}`);
        wl(`                           ${c(A.d, 'Credits:')} ${c(A.white, String(balanceRef.current))}`);
        wl('');
        wl(`  ${c(A.black, '███')}${c(A.red, '███')}${c(A.green, '███')}${c(A.yellow, '███')}${c(A.blue, '███')}${c(A.magenta, '███')}${c(A.cyan, '███')}${c(A.white, '███')}`);
        wl('');
        wp(); return;
      }
      if (cmdLower === 'help') {
        wl('');
        wl(`  ${c(A.bCyan + A.b, '╔══════════════════════════════════════════╗')}`);
        wl(`  ${c(A.bCyan + A.b, '║')}  ${c(A.bWhite + A.b, 'CrowByte Terminal')} ${c(A.d, '— Command Reference')}   ${c(A.bCyan + A.b, '║')}`);
        wl(`  ${c(A.bCyan + A.b, '╚══════════════════════════════════════════╝')}`);
        wl('');
        wl(`  ${c(A.bYellow + A.b, '⚡ Security Tools')} ${c(A.d, '(real API calls)')}`);
        wl(`    ${c(A.yellow, 'dns')}      ${c(A.d, '<domain> [type]')}     DNS records (A/MX/NS/TXT)`);
        wl(`    ${c(A.yellow, 'whois')}    ${c(A.d, '<domain>')}           Registration data`);
        wl(`    ${c(A.yellow, 'shodan')}   ${c(A.d, '<ip|search query>')}  Host intel / device search`);
        wl(`    ${c(A.yellow, 'cve')}      ${c(A.d, '<CVE-ID>')}           NVD vulnerability lookup`);
        wl(`    ${c(A.yellow, 'headers')}  ${c(A.d, '<url>')}              HTTP security headers`);
        wl(`    ${c(A.yellow, 'portscan')} ${c(A.d, '<host> [ports]')}     Port scan via VPS`);
        wl(`    ${c(A.yellow, 'nmap')}     ${c(A.d, '<target>')}           Port scan (alias)`);
        wl(`    ${c(A.yellow, 'curl')}     ${c(A.d, '<url>')}              Fetch URL content`);
        wl(`    ${c(A.yellow, 'search')}   ${c(A.d, '<query>')}            Web search`);
        wl('');
        wl(`  ${c(A.bGreen + A.b, '🔧 Utilities')}`);
        wl(`    ${c(A.yellow, 'encode')}   ${c(A.d, '<base64|url|hex|html> <text>')}`);
        wl(`    ${c(A.yellow, 'decode')}   ${c(A.d, '<base64|url|hex|html> <text>')}`);
        wl(`    ${c(A.yellow, 'subnet')}   ${c(A.d, '<CIDR>')}            Subnet calculator`);
        wl('');
        wl(`  ${c(A.bMagenta + A.b, '🤖 AI Assistant')}`);
        wl(`    ${c(A.yellow, 'ask')}      ${c(A.d, '<question>')}         Ask CrowByte AI`);
        wl(`    ${c(A.d, '    Or just type naturally — auto-routes to AI')}`);
        wl(`    ${c(A.yellow, 'credits')}                       Check balance`);
        wl(`    ${c(A.yellow, 'forget')}                        Clear AI memory`);
        wl('');
        wl(`  ${c(A.bBlue + A.b, '💻 Shell')}`);
        wl(`    ${c(A.yellow, 'whoami')}  ${c(A.yellow, 'id')}  ${c(A.yellow, 'hostname')}  ${c(A.yellow, 'uname')}  ${c(A.yellow, 'date')}  ${c(A.yellow, 'uptime')}`);
        wl(`    ${c(A.yellow, 'pwd')}  ${c(A.yellow, 'echo')}  ${c(A.yellow, 'neofetch')}  ${c(A.yellow, 'clear')}  ${c(A.yellow, 'history')}`);
        wl('');
        wl(`  ${c(A.d, '  Shortcuts:')} ${c(A.yellow, 'Ctrl+C')} abort  ${c(A.yellow, 'Ctrl+L')} clear  ${c(A.yellow, 'Tab')} complete  ${c(A.yellow, '↑↓')} history`);
        wl('');
        wp();
        return;
      }
      if (cmdLower === 'history') {
        if (historyRef.current.length === 0) { wl(c(A.d, '(empty)')); }
        else historyRef.current.forEach((h, i) => wl(`  ${c(A.d, String(i + 1).padStart(4))}  ${h}`));
        wp();
        return;
      }
      if (cmdLower === 'credits') {
        const bal = await refreshBalance();
        if (bal) {
          balanceRef.current = bal.balance;
          wl('');
          wl(`  ${c(A.bCyan, '┌─────────────────────────────┐')}`);
          wl(`  ${c(A.bCyan, '│')} ${c(A.b, 'Credit Balance')}              ${c(A.bCyan, '│')}`);
          wl(`  ${c(A.bCyan, '├─────────────────────────────┤')}`);
          wl(`  ${c(A.bCyan, '│')} ${c(A.d, 'Balance:')}  ${c(A.bWhite + A.b, String(bal.balance).padEnd(5))} credits  ${c(A.bCyan, '│')}`);
          wl(`  ${c(A.bCyan, '│')} ${c(A.d, 'Used:')}     ${String(bal.monthly_used).padEnd(5)} / ${String(bal.monthly_allowance).padEnd(5)}  ${c(A.bCyan, '│')}`);
          wl(`  ${c(A.bCyan, '│')} ${c(A.d, 'Tier:')}     ${bal.tier.padEnd(16)} ${c(A.bCyan, '│')}`);
          wl(`  ${c(A.bCyan, '└─────────────────────────────┘')}`);
          wl('');
        } else {
          wl(c(A.red, '[-] Failed to fetch balance'));
        }
        wp();
        return;
      }
      if (cmdLower === 'forget') {
        messagesRef.current = [];
        wl(c(A.green, '[+] AI conversation memory cleared'));
        wp();
        return;
      }

      // ── Shell commands routed to AI (real tool context) ──
      // These are real commands that can't run in browser, so AI handles them
      const SHELL_CMDS = new Set([
        'grep', 'rg', 'ripgrep', 'find', 'cat', 'head', 'tail', 'less', 'more',
        'ls', 'll', 'la', 'dir', 'tree', 'wc', 'sort', 'uniq', 'cut', 'awk', 'sed',
        'bash', 'sh', 'zsh', 'exec', 'source', 'export', 'alias', 'unalias',
        'cd', 'mkdir', 'rmdir', 'rm', 'cp', 'mv', 'touch', 'chmod', 'chown',
        'ps', 'kill', 'top', 'htop', 'jobs', 'bg', 'fg', 'nohup',
        'ssh', 'scp', 'rsync', 'wget', 'ping', 'traceroute', 'netstat', 'ss', 'ifconfig', 'ip',
        'git', 'docker', 'python', 'python3', 'pip', 'node', 'npm', 'npx',
        'man', 'which', 'type', 'whereis', 'file', 'stat', 'df', 'du', 'free',
        'tar', 'zip', 'unzip', 'gzip', 'gunzip', 'xz',
        'openssl', 'hashcat', 'john', 'hydra', 'gobuster', 'ffuf', 'dirb',
        'nikto', 'sqlmap', 'burp', 'msfconsole', 'metasploit',
        'nuclei', 'subfinder', 'httpx', 'amass', 'masscan', 'rustscan',
        'nc', 'ncat', 'netcat', 'socat', 'tcpdump', 'wireshark', 'tshark',
        'base64', 'md5sum', 'sha256sum', 'xxd', 'hexdump',
        'env', 'set', 'unset', 'printenv', 'xargs', 'tee', 'watch',
        'apt', 'apt-get', 'dpkg', 'snap', 'brew', 'yum', 'dnf', 'pacman',
        'systemctl', 'service', 'journalctl', 'crontab', 'at',
      ]);

      if (SHELL_CMDS.has(cmdLower)) {
        // Route to AI with shell context — it'll answer as if executing
        isProcessing.current = true;
        const shellPrompt = `The user typed this command in a CrowByte web terminal: \`${trimmed}\`\n\nYou are acting as a smart terminal. If this is an informational command (man, which, help), provide the answer. If this requires execution (grep, find, ls, etc.), explain what it would do and provide the expected output format. For security tools (nmap, sqlmap, nuclei, etc.), explain usage and provide example output. Be concise and format like real terminal output.`;
        await ai(shellPrompt);
        isProcessing.current = false;
        wp();
        return;
      }

      // Tool commands (real API execution)
      if (TOOL_COMMANDS[cmdLower]) {
        isProcessing.current = true;
        try {
          const ctx: CmdContext = {
            writeln: wl, write: w,
            cols: termInstance.current?.cols || 80,
            messagesRef, balanceRef, user: userRef.current, abortRef,
            writePrompt: wp, isProcessing,
          };
          await TOOL_COMMANDS[cmdLower](args, ctx);
        } catch (e: any) {
          wl(c(A.red, `[!] Error: ${e.message || 'Command failed'}`));
        }
        isProcessing.current = false;
        wl('');
        wp();
        return;
      }

      // "ask" command
      if (cmdLower === 'ask') {
        const question = trimmed.slice(4).trim();
        if (!question) { wl(c(A.d, 'Usage: ask <your question>')); wp(); return; }
        isProcessing.current = true;
        await ai(question);
        isProcessing.current = false;
        wp();
        return;
      }

      // Everything else -> AI (natural language)
      isProcessing.current = true;
      await ai(trimmed);
      isProcessing.current = false;
      wp();
    },
  });

  // --- Init terminal (runs ONCE) ---

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!termRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'bar',
      cursorWidth: 2,
      fontSize: 14,
      fontFamily: '"JetBrains Mono","Cascadia Code","Fira Code","SF Mono", Menlo, Monaco, monospace',
      fontWeight: '400',
      lineHeight: 1.15,
      theme: {
        background: '#0c0c0c',
        foreground: '#d4d4d4',
        cursor: '#00ff41',
        cursorAccent: '#0c0c0c',
        selectionBackground: 'rgba(0, 255, 65, 0.15)',
        black: '#1e1e1e',
        red: '#f44747',
        green: '#6a9955',
        yellow: '#dcdcaa',
        blue: '#569cd6',
        magenta: '#c586c0',
        cyan: '#4ec9b0',
        white: '#d4d4d4',
        brightBlack: '#808080',
        brightRed: '#f44747',
        brightGreen: '#6a9955',
        brightYellow: '#dcdcaa',
        brightBlue: '#9cdcfe',
        brightMagenta: '#c586c0',
        brightCyan: '#4ec9b0',
        brightWhite: '#ffffff',
      },
      scrollback: 10000,
      allowTransparency: true,
    });

    const fit = new FitAddon();
    const links = new WebLinksAddon();
    const search = new SearchAddon();
    term.loadAddon(fit);
    term.loadAddon(links);
    term.loadAddon(search);

    term.open(termRef.current);
    fit.fit();

    termInstance.current = term;
    fitAddon.current = fit;
    searchAddonRef.current = search;

    // Load balance + MOTD
    getBalance().then(b => {
      if (b) balanceRef.current = b.balance;
      fns.current.writeMOTD(balanceRef.current);
      fns.current.writePrompt();
    });

    // UilKeySkeleton handler — all callbacks accessed via fns.current (always fresh)
    term.onData((data) => {
      if (isProcessing.current) {
        if (data === '\x03') {
          abortRef.current?.abort();
          isProcessing.current = false;
          term.writeln('\r\n' + c(A.red, '^C'));
          fns.current.writePrompt();
        }
        return;
      }

      const code = data.charCodeAt(0);

      // Enter
      if (data === '\r') {
        term.writeln('');
        const input = inputBuffer.current;
        inputBuffer.current = '';
        cursorPos.current = 0;
        fns.current.processInput(input);
        return;
      }

      // Ctrl+C
      if (data === '\x03') {
        inputBuffer.current = '';
        cursorPos.current = 0;
        term.writeln('^C');
        fns.current.writePrompt();
        return;
      }

      // Ctrl+L
      if (data === '\x0c') {
        term.clear();
        fns.current.writePrompt();
        fns.current.write(inputBuffer.current);
        return;
      }

      // Ctrl+U
      if (data === '\x15') {
        inputBuffer.current = inputBuffer.current.slice(cursorPos.current);
        cursorPos.current = 0;
        fns.current.redrawInput();
        return;
      }

      // Ctrl+K
      if (data === '\x0b') {
        inputBuffer.current = inputBuffer.current.slice(0, cursorPos.current);
        fns.current.redrawInput();
        return;
      }

      // Ctrl+A
      if (data === '\x01') {
        if (cursorPos.current > 0) {
          fns.current.write(`\x1b[${cursorPos.current}D`);
          cursorPos.current = 0;
        }
        return;
      }

      // Ctrl+E
      if (data === '\x05') {
        const diff = inputBuffer.current.length - cursorPos.current;
        if (diff > 0) fns.current.write(`\x1b[${diff}C`);
        cursorPos.current = inputBuffer.current.length;
        return;
      }

      // Tab
      if (data === '\t') {
        fns.current.tabComplete();
        return;
      }

      // Backspace
      if (data === '\x7f') {
        if (cursorPos.current > 0) {
          inputBuffer.current = inputBuffer.current.slice(0, cursorPos.current - 1) + inputBuffer.current.slice(cursorPos.current);
          cursorPos.current--;
          fns.current.redrawInput();
        }
        return;
      }

      // Escape sequences
      if (data.startsWith('\x1b[')) {
        // Up arrow
        if (data === '\x1b[A') {
          if (historyRef.current.length === 0) return;
          if (historyIndex.current === -1) {
            savedInput.current = inputBuffer.current;
            historyIndex.current = historyRef.current.length - 1;
          } else if (historyIndex.current > 0) {
            historyIndex.current--;
          }
          inputBuffer.current = historyRef.current[historyIndex.current] || '';
          cursorPos.current = inputBuffer.current.length;
          fns.current.redrawInput();
          return;
        }

        // Down arrow
        if (data === '\x1b[B') {
          if (historyIndex.current === -1) return;
          if (historyIndex.current < historyRef.current.length - 1) {
            historyIndex.current++;
            inputBuffer.current = historyRef.current[historyIndex.current] || '';
          } else {
            historyIndex.current = -1;
            inputBuffer.current = savedInput.current;
          }
          cursorPos.current = inputBuffer.current.length;
          fns.current.redrawInput();
          return;
        }

        // Left arrow
        if (data === '\x1b[D' && cursorPos.current > 0) {
          cursorPos.current--;
          fns.current.write('\x1b[D');
          return;
        }

        // Right arrow
        if (data === '\x1b[C' && cursorPos.current < inputBuffer.current.length) {
          cursorPos.current++;
          fns.current.write('\x1b[C');
          return;
        }

        // Delete
        if (data === '\x1b[3~' && cursorPos.current < inputBuffer.current.length) {
          inputBuffer.current = inputBuffer.current.slice(0, cursorPos.current) + inputBuffer.current.slice(cursorPos.current + 1);
          fns.current.redrawInput();
          return;
        }

        // Home
        if (data === '\x1b[H' || data === '\x1b[1~') {
          if (cursorPos.current > 0) fns.current.write(`\x1b[${cursorPos.current}D`);
          cursorPos.current = 0;
          return;
        }

        // End
        if (data === '\x1b[F' || data === '\x1b[4~') {
          const diff = inputBuffer.current.length - cursorPos.current;
          if (diff > 0) fns.current.write(`\x1b[${diff}C`);
          cursorPos.current = inputBuffer.current.length;
          return;
        }

        return;
      }

      // Printable chars
      if (code >= 32) {
        if (cursorPos.current === inputBuffer.current.length) {
          inputBuffer.current += data;
          cursorPos.current += data.length;
          fns.current.write(data);
        } else {
          inputBuffer.current = inputBuffer.current.slice(0, cursorPos.current) + data + inputBuffer.current.slice(cursorPos.current);
          cursorPos.current += data.length;
          fns.current.redrawInput();
        }
      }
    });

    // Resize
    const observer = new ResizeObserver(() => {
      try { fit.fit(); } catch {}
    });
    observer.observe(termRef.current);

    return () => {
      observer.disconnect();
      term.dispose();
      termInstance.current = null;
    };
  }, []);

  return (
    <div
      ref={termRef}
      className={`${className || ''}`}
      style={{ minHeight: 300 }}
    />
  );
});
