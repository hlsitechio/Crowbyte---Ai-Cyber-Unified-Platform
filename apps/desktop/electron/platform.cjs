/**
 * Platform Abstraction Layer
 * Handles OS-specific paths, tools, shells, and defaults.
 * Shared between Linux and Windows builds.
 */

const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const fs = require('fs');

const IS_WIN = process.platform === 'win32';
const IS_LINUX = process.platform === 'linux';
const IS_MAC = process.platform === 'darwin';

// ---------------------------------------------------------------------------
// Utility: check if a binary exists on PATH or at a known location
// ---------------------------------------------------------------------------
function which(bin) {
  try {
    if (IS_WIN) {
      return execFileSync('where', [bin], { encoding: 'utf8', stdio: 'pipe' }).split('\n')[0].trim();
    }
    return execFileSync('which', [bin], { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return null;
  }
}

function existsAt(p) {
  try { return fs.existsSync(p) ? p : null; } catch { return null; }
}

function resolve(bin, ...knownPaths) {
  for (const p of knownPaths) {
    const found = existsAt(p);
    if (found) return found;
  }
  return which(bin);
}

// ---------------------------------------------------------------------------
// Platform info
// ---------------------------------------------------------------------------
const platform = {
  isWindows: IS_WIN,
  isLinux: IS_LINUX,
  isMac: IS_MAC,
  os: process.platform,
  arch: process.arch,
  home: os.homedir(),
  sep: path.sep,
  tempDir: os.tmpdir(),
};

// ---------------------------------------------------------------------------
// Default working directory
// ---------------------------------------------------------------------------
function defaultCwd() {
  if (IS_WIN) {
    return os.homedir();
  }
  const bounty = '/mnt/bounty/Claude';
  return existsAt(bounty) ? bounty : os.homedir();
}

// ---------------------------------------------------------------------------
// Shell configuration
// ---------------------------------------------------------------------------
function defaultShell() {
  if (IS_WIN) return { shell: 'powershell.exe', args: ['-NoLogo', '-NoProfile'] };
  if (which('tmux')) return { shell: '/usr/bin/tmux', args: ['new-session'] };
  if (existsAt('/bin/zsh')) return { shell: '/bin/zsh', args: ['-i', '-l'] };
  return { shell: '/bin/bash', args: ['-i', '-l'] };
}

function shellEnv(extra = {}) {
  const cleanEnv = { ...process.env };
  delete cleanEnv.CLAUDECODE;
  delete cleanEnv.CLAUDE_CODE;
  delete cleanEnv.CLAUDE_CODE_SESSION;
  delete cleanEnv.CLAUDE_CODE_ENTRYPOINT;

  const base = {
    ...cleanEnv,
    TERM: 'xterm-256color',
    COLORTERM: 'truecolor',
    FORCE_COLOR: '3',
    LANG: process.env.LANG || 'en_US.UTF-8',
    HOME: os.homedir(),
  };

  if (IS_WIN) {
    base.SHELL = 'powershell.exe';
  } else {
    base.SHELL = which('zsh') || '/bin/bash';
  }

  return { ...base, ...extra };
}

// ---------------------------------------------------------------------------
// Terminal multiplexer
// Linux: tmux (real multiplexer, splits, sessions)
// Windows: No tmux — app manages multiple PTY instances as tab/split UI
// ---------------------------------------------------------------------------
const multiplexer = {
  available: IS_WIN ? false : !!which('tmux'),
  name: IS_WIN ? null : 'tmux',
  bin: IS_WIN ? null : (which('tmux') || '/usr/bin/tmux'),
  usesAppSplits: IS_WIN,
};

// ---------------------------------------------------------------------------
// Security tools — resolved per platform
// ---------------------------------------------------------------------------
function resolveTools() {
  const tools = {};

  if (IS_WIN) {
    tools.nmap = resolve('nmap',
      'C:\\Program Files (x86)\\Nmap\\nmap.exe',
      'C:\\Program Files\\Nmap\\nmap.exe'
    );
    tools.nuclei = resolve('nuclei',
      path.join(os.homedir(), 'go', 'bin', 'nuclei.exe'),
      path.join(os.homedir(), '.pdtm', 'go', 'bin', 'nuclei.exe')
    );
    tools.httpx = resolve('httpx',
      path.join(os.homedir(), 'go', 'bin', 'httpx.exe'),
      path.join(os.homedir(), '.pdtm', 'go', 'bin', 'httpx.exe')
    );
    tools.subfinder = resolve('subfinder',
      path.join(os.homedir(), 'go', 'bin', 'subfinder.exe')
    );
    tools.ffuf = resolve('ffuf',
      path.join(os.homedir(), 'go', 'bin', 'ffuf.exe')
    );
    tools.sqlmap = resolve('sqlmap',
      path.join(os.homedir(), 'sqlmap', 'sqlmap.py')
    );
    tools.python = resolve('python', 'python.exe') || resolve('python3', 'python3.exe');
    tools.git = resolve('git', 'C:\\Program Files\\Git\\bin\\git.exe');
    tools.curl = resolve('curl', 'C:\\Windows\\System32\\curl.exe');
    tools.node = resolve('node');
    tools.claude = resolve('claude');
    // Windows Terminal as tmux alternative
    tools.wt = resolve('wt', path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'WindowsApps', 'wt.exe'));
  } else {
    tools.nmap = resolve('nmap', '/usr/bin/nmap');
    tools.nuclei = resolve('nuclei', '/usr/local/bin/nuclei', path.join(os.homedir(), 'go/bin/nuclei'));
    tools.httpx = resolve('httpx', '/usr/local/bin/httpx', path.join(os.homedir(), 'go/bin/httpx'));
    tools.subfinder = resolve('subfinder', '/usr/local/bin/subfinder');
    tools.ffuf = resolve('ffuf', '/usr/local/bin/ffuf');
    tools.sqlmap = resolve('sqlmap', '/usr/bin/sqlmap', '/usr/share/sqlmap/sqlmap.py');
    tools.python = resolve('python3', '/usr/bin/python3');
    tools.git = resolve('git', '/usr/bin/git');
    tools.curl = resolve('curl', '/usr/bin/curl');
    tools.node = resolve('node');
    tools.claude = resolve('claude');
    tools.msfconsole = resolve('msfconsole', '/usr/bin/msfconsole');
    tools.gobuster = resolve('gobuster', '/usr/bin/gobuster');
    tools.dirb = resolve('dirb', '/usr/bin/dirb');
    tools.nikto = resolve('nikto', '/usr/bin/nikto');
    tools.whatweb = resolve('whatweb', '/usr/bin/whatweb');
    tools.wpscan = resolve('wpscan', '/usr/bin/wpscan');
    tools.hydra = resolve('hydra', '/usr/bin/hydra');
    tools.john = resolve('john', '/usr/bin/john');
    tools.hashcat = resolve('hashcat', '/usr/bin/hashcat');
    tools.tmux = resolve('tmux', '/usr/bin/tmux');
    tools.htop = resolve('htop', '/usr/bin/htop');
  }

  return tools;
}

// ---------------------------------------------------------------------------
// Wordlist paths
// ---------------------------------------------------------------------------
function wordlistPaths() {
  if (IS_WIN) {
    const base = path.join(os.homedir(), 'wordlists');
    return {
      dirCommon: path.join(base, 'dirb', 'common.txt'),
      subdomains: path.join(base, 'subdomains-top1million-5000.txt'),
      passwords: path.join(base, 'rockyou.txt'),
      base,
    };
  }
  return {
    dirCommon: '/usr/share/wordlists/dirb/common.txt',
    subdomains: '/usr/share/seclists/Discovery/DNS/subdomains-top1million-5000.txt',
    passwords: '/usr/share/wordlists/rockyou.txt',
    base: '/usr/share/wordlists',
  };
}

// ---------------------------------------------------------------------------
// Supabase platform marker — tags data per OS
// ---------------------------------------------------------------------------
function platformTag() {
  return IS_WIN ? 'windows' : 'linux';
}

// ---------------------------------------------------------------------------
// Credential storage paths
// ---------------------------------------------------------------------------
function credentialDir() {
  if (IS_WIN) {
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'CrowByte');
  }
  return path.join(os.homedir(), '.config', 'crowbyte');
}

// ---------------------------------------------------------------------------
// Extension directory (Chrome extensions for WebContentsView)
// ---------------------------------------------------------------------------
function extensionDir(appRoot) {
  return path.join(appRoot, 'extensions');
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------
module.exports = {
  platform,
  defaultCwd,
  defaultShell,
  shellEnv,
  multiplexer,
  resolveTools,
  wordlistPaths,
  platformTag,
  credentialDir,
  extensionDir,
  which,
  resolve,
  IS_WIN,
  IS_LINUX,
  IS_MAC,
};
