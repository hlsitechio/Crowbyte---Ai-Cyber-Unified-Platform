import { Router, Request, Response } from 'express';
import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import rateLimit from 'express-rate-limit';
// access/constants removed — not currently needed

const execAsync = promisify(exec);
const router = Router();

const toolExecuteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many tool executions. Slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Whitelist of allowed security tool binaries
// NOTE: curl intentionally excluded — it enables SSRF (arbitrary HTTP requests to internal services)
const ALLOWED_TOOLS = new Set([
  'nmap', 'nuclei', 'httpx', 'subfinder', 'ffuf', 'sqlmap', 'nikto',
  'masscan', 'katana', 'dnsx', 'naabu', 'waybackurls', 'dalfox',
  'gau', 'whois', 'dig', 'ping', 'traceroute', 'gobuster',
  'feroxbuster', 'wfuzz', 'arjun', 'amass',
]);

// Max concurrent tool executions to prevent resource exhaustion
const MAX_CONCURRENT_EXECUTIONS = 10;

// Quick scan presets
const SCAN_PRESETS: Record<string, { command: string; args: string[]; description: string }> = {
  'port-scan': {
    command: 'nmap',
    args: ['-sV', '-sC', '--top-ports', '1000', '-T4'],
    description: 'Top 1000 ports with service/version detection',
  },
  'vuln-scan': {
    command: 'nuclei',
    args: ['-severity', 'critical,high,medium', '-silent'],
    description: 'Nuclei vulnerability scan (critical/high/medium)',
  },
  'web-scan': {
    command: 'nikto',
    args: ['-Tuning', '123bde', '-timeout', '10'],
    description: 'Nikto web server scan',
  },
  'subdomain-enum': {
    command: 'subfinder',
    args: ['-silent'],
    description: 'Passive subdomain enumeration',
  },
  'dir-brute': {
    command: 'ffuf',
    args: ['-w', '/usr/share/seclists/Discovery/Web-Content/common.txt', '-mc', '200,204,301,302,307,401,403'],
    description: 'Directory brute-force with common wordlist',
  },
};

// Cache for tool availability
let toolCache: { tools: ToolInfo[]; timestamp: number } | null = null;
const TOOL_CACHE_TTL = 300_000; // 5 minutes

interface ToolInfo {
  name: string;
  path: string | null;
  version: string | null;
  available: boolean;
}

async function findToolPath(name: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(`which ${name}`, { timeout: 3000 });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function getToolVersion(name: string): Promise<string | null> {
  // Different tools use different version flags
  const versionFlags = ['--version', '-version', '-V', 'version'];

  for (const flag of versionFlags) {
    try {
      const { stdout, stderr } = await execAsync(`${name} ${flag} 2>&1`, { timeout: 5000 });
      const output = (stdout || stderr).trim();
      // Extract first line, cap at 200 chars
      const firstLine = output.split('\n')[0].slice(0, 200);
      if (firstLine && !firstLine.toLowerCase().includes('unknown') && !firstLine.toLowerCase().includes('error')) {
        return firstLine;
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function getAvailableTools(): Promise<ToolInfo[]> {
  if (toolCache && Date.now() - toolCache.timestamp < TOOL_CACHE_TTL) {
    return toolCache.tools;
  }

  const tools = await Promise.all(
    Array.from(ALLOWED_TOOLS).map(async (name) => {
      const path = await findToolPath(name);
      const version = path ? await getToolVersion(name) : null;
      return { name, path, version, available: path !== null };
    }),
  );

  toolCache = { tools, timestamp: Date.now() };
  return tools;
}

function validateCommand(command: string): boolean {
  // Extract the base binary name (handle paths like /usr/bin/nmap)
  const binary = command.split('/').pop()?.split(' ')[0] ?? '';
  return ALLOWED_TOOLS.has(binary);
}

function sanitizeArgs(args: string[]): string[] {
  // Block shell metacharacters in all args — there is no safe exception for flag-looking args
  return args.map(arg => {
    if (/[;&|`$(){}]/.test(arg)) {
      throw new Error(`Unsafe argument rejected: ${arg}`);
    }
    return arg;
  });
}

// Active tool executions keyed by ID, for WebSocket streaming
export const activeExecutions = new Map<string, {
  process: ReturnType<typeof spawn>;
  output: string[];
  exitCode: number | null;
  startedAt: number;
}>();

// POST /api/tools/execute
router.post('/execute', toolExecuteLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    // Enforce concurrent execution limit
    if (activeExecutions.size >= MAX_CONCURRENT_EXECUTIONS) {
      res.status(429).json({
        error: `Too many concurrent executions (max ${MAX_CONCURRENT_EXECUTIONS}). Wait for running tasks to complete.`,
        running: activeExecutions.size,
      });
      return;
    }

    const { command, args = [], timeout = 300000 } = req.body;

    if (!command || typeof command !== 'string') {
      res.status(400).json({ error: 'command is required and must be a string' });
      return;
    }

    if (!validateCommand(command)) {
      res.status(403).json({
        error: `Command '${command}' is not in the allowed tools whitelist`,
        allowed: Array.from(ALLOWED_TOOLS),
      });
      return;
    }

    // After validating the command is in ALLOWED_TOOLS, resolve to the FULL binary path
    const binaryName = command.split('/').pop()?.split(' ')[0] ?? '';
    const resolvedPath = await findToolPath(binaryName);
    if (!resolvedPath) {
      res.status(404).json({ error: `Tool '${binaryName}' is whitelisted but not found on system` });
      return;
    }

    if (!Array.isArray(args)) {
      res.status(400).json({ error: 'args must be an array of strings' });
      return;
    }

    const cleanArgs = sanitizeArgs(args);
    const maxTimeout = Math.min(timeout, 600_000); // cap at 10 minutes

    const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Use resolved absolute path, not user-supplied command
    const child = spawn(resolvedPath, cleanArgs, {
      timeout: maxTimeout,
      env: { ...process.env, TERM: 'xterm-256color' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const execution = {
      process: child,
      output: [] as string[],
      exitCode: null as number | null,
      startedAt: Date.now(),
    };

    activeExecutions.set(executionId, execution);

    child.stdout?.on('data', (data: Buffer) => {
      execution.output.push(data.toString());
    });

    child.stderr?.on('data', (data: Buffer) => {
      execution.output.push(data.toString());
    });

    child.on('close', (code) => {
      execution.exitCode = code;
      // Auto-cleanup after 5 minutes
      setTimeout(() => activeExecutions.delete(executionId), 300_000);
    });

    child.on('error', (err) => {
      execution.output.push(`[error] ${err.message}\n`);
      execution.exitCode = -1;
    });

    // If client wants streaming, return the ID immediately
    // They can connect via WebSocket with this ID
    if (req.query.stream === 'true') {
      res.json({
        executionId,
        command,
        args: cleanArgs,
        message: 'Execution started. Connect to WebSocket with this executionId for streaming output.',
      });
      return;
    }

    // Otherwise, wait for completion
    await new Promise<void>((resolve) => {
      child.on('close', () => resolve());
      child.on('error', () => resolve());
    });

    const output = execution.output.join('');
    activeExecutions.delete(executionId);

    res.json({
      command,
      args: cleanArgs,
      exitCode: execution.exitCode,
      output,
      duration: Date.now() - execution.startedAt,
    });
  } catch (err: any) {
    console.error('[tools] execute error:', err);
    res.status(500).json({ error: err.message || 'Execution failed' });
  }
});

// GET /api/tools/available
router.get('/available', async (_req: Request, res: Response): Promise<void> => {
  try {
    const tools = await getAvailableTools();

    res.json({
      total: tools.length,
      available: tools.filter(t => t.available).length,
      tools,
    });
  } catch (err) {
    console.error('[tools] available error:', err);
    res.status(500).json({ error: 'Failed to enumerate tools' });
  }
});

// Validate that a scan target looks like a hostname, IP address, IP range, or URL.
// This prevents obvious shell injection targets and garbage input.
const TARGET_PATTERN = /^[a-zA-Z0-9._\-/:[\]]+$/;

function validateTarget(target: string): boolean {
  return typeof target === 'string' &&
    target.length > 0 &&
    target.length <= 500 &&
    TARGET_PATTERN.test(target);
}

// POST /api/tools/scan — quick scan presets
router.post('/scan', toolExecuteLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    // Enforce concurrent execution limit
    if (activeExecutions.size >= MAX_CONCURRENT_EXECUTIONS) {
      res.status(429).json({
        error: `Too many concurrent executions (max ${MAX_CONCURRENT_EXECUTIONS}). Wait for running tasks to complete.`,
        running: activeExecutions.size,
      });
      return;
    }

    const { preset, target } = req.body;

    if (!preset || !target) {
      res.status(400).json({
        error: 'preset and target are required',
        availablePresets: Object.keys(SCAN_PRESETS),
      });
      return;
    }

    if (!validateTarget(target)) {
      res.status(400).json({ error: 'Invalid target: must be a valid hostname, IP address, CIDR range, or URL' });
      return;
    }

    const scanPreset = SCAN_PRESETS[preset];
    if (!scanPreset) {
      res.status(400).json({
        error: `Unknown preset '${preset}'`,
        availablePresets: Object.entries(SCAN_PRESETS).map(([key, val]) => ({
          name: key,
          description: val.description,
        })),
      });
      return;
    }

    // Check if the tool is installed
    const toolPath = await findToolPath(scanPreset.command);
    if (!toolPath) {
      res.status(404).json({
        error: `Tool '${scanPreset.command}' is not installed on this system`,
      });
      return;
    }

    // Build the full args array with target appended appropriately
    let fullArgs: string[];
    switch (scanPreset.command) {
      case 'nmap':
      case 'masscan':
        fullArgs = [...scanPreset.args, target];
        break;
      case 'nuclei':
        fullArgs = [...scanPreset.args, '-u', target];
        break;
      case 'nikto':
        fullArgs = [...scanPreset.args, '-h', target];
        break;
      case 'subfinder':
        fullArgs = [...scanPreset.args, '-d', target];
        break;
      case 'ffuf':
        fullArgs = [...scanPreset.args, '-u', `${target}/FUZZ`];
        break;
      default:
        fullArgs = [...scanPreset.args, target];
    }

    const executionId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const child = spawn(scanPreset.command, fullArgs, {
      timeout: 600_000,
      env: { ...process.env, TERM: 'xterm-256color' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const execution = {
      process: child,
      output: [] as string[],
      exitCode: null as number | null,
      startedAt: Date.now(),
    };

    activeExecutions.set(executionId, execution);

    child.stdout?.on('data', (data: Buffer) => {
      execution.output.push(data.toString());
    });

    child.stderr?.on('data', (data: Buffer) => {
      execution.output.push(data.toString());
    });

    child.on('close', (code) => {
      execution.exitCode = code;
      setTimeout(() => activeExecutions.delete(executionId), 300_000);
    });

    child.on('error', (err) => {
      execution.output.push(`[error] ${err.message}\n`);
      execution.exitCode = -1;
    });

    res.json({
      executionId,
      preset,
      command: scanPreset.command,
      args: fullArgs,
      description: scanPreset.description,
      target,
      message: 'Scan started. Poll /api/tools/execution/:id or connect via WebSocket for streaming.',
    });
  } catch (err: any) {
    console.error('[tools] scan error:', err);
    res.status(500).json({ error: err.message || 'Scan failed' });
  }
});

// GET /api/tools/execution/:id — poll execution status
router.get('/execution/:id', (req: Request, res: Response): void => {
  const execId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const execution = activeExecutions.get(execId);

  if (!execution) {
    res.status(404).json({ error: 'Execution not found or expired' });
    return;
  }

  res.json({
    id: execId,
    running: execution.exitCode === null,
    exitCode: execution.exitCode,
    output: execution.output.join(''),
    duration: Date.now() - execution.startedAt,
  });
});

export default router;
