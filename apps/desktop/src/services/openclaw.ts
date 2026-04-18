/**
 * OpenClaw Service
 * Connects CrowByte to the OpenClaw agent swarm on VPS
 * Uses NVIDIA free endpoint (GLM5, DeepSeek, Qwen) via proxy
 */

export interface OpenClawMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface OpenClawModel {
  id: string;
  name: string;
  provider: string;
}

export interface OpenClawAgent {
  id: string;
  name: string;
  status: 'idle' | 'busy' | 'offline';
  model: string;
}

export interface OpenClawConfig {
  vpsHost: string;
  proxyPort: number;
  gatewayPort: number;
  apiKey: string;
  gatewayToken: string;
  sshUser: string;
  sshPassword: string;
}

const DEFAULT_CONFIG: OpenClawConfig = {
  vpsHost: import.meta.env.VITE_OPENCLAW_HOST || 'localhost',
  proxyPort: 19990,
  gatewayPort: 18789,
  apiKey: import.meta.env.VITE_NVIDIA_API_KEY || '',
  gatewayToken: import.meta.env.VITE_OPENCLAW_GATEWAY_TOKEN || '',
  sshUser: 'root',
  sshPassword: import.meta.env.VITE_OPENCLAW_SSH_PASSWORD || '',
};

const AVAILABLE_MODELS: OpenClawModel[] = [
  { id: 'z-ai/glm5', name: 'GLM5', provider: 'NVIDIA' },
  { id: 'deepseek-ai/deepseek-v3.2', name: 'DeepSeek V3.2', provider: 'NVIDIA' },
  { id: 'qwen/qwen3.5-397b-a17b', name: 'Qwen 3.5 397B', provider: 'NVIDIA' },
  { id: 'qwen/qwen3-coder-480b-a35b-instruct', name: 'Qwen3 Coder 480B', provider: 'NVIDIA' },
  { id: 'mistralai/mistral-large-3-675b-instruct-2512', name: 'Mistral Large 675B', provider: 'NVIDIA' },
  { id: 'moonshotai/kimi-k2-instruct', name: 'Kimi K2', provider: 'NVIDIA' },
  { id: 'mistralai/devstral-2-123b-instruct-2512', name: 'Devstral 123B', provider: 'NVIDIA' },
];

const AGENTS = [
  'commander', 'recon', 'hunter', 'intel', 'analyst',
  'sentinel', 'gpt', 'obsidian', 'main',
];

const SYSTEM_PROMPT = `You are CrowByte AI, the integrated AI operator inside the CrowByte Terminal — an Electron desktop application for offensive security operations running on Kali Linux 2025.

# YOUR ENVIRONMENT

You are running INSIDE the CrowByte app. The user is interacting with you through the Chat page. You have direct access to execute shell commands on the host Kali Linux machine via the execute_command tool, and can dispatch tasks to VPS agents via dispatch_agent.

## Host System
- OS: Kali Linux 2025 (7000+ security tools installed)
- Tools: nmap, nuclei, sqlmap, ffuf, gobuster, subfinder, httpx, nikto, masscan, feroxbuster, wpscan, hydra, john, hashcat, curl, dig, whois, python3, ruby, go, and everything else in Kali
- Workspace: /mnt/bounty (encrypted bounty drive)
- Terminal: xterm.js + tmux (accessible from the Terminal page in the app)

## VPS Agent Swarm (OpenClaw)
- Host: Configured via VITE_OPENCLAW_HOST env var
- 9 agents: commander, recon, hunter, intel, analyst, sentinel, gpt, obsidian, main
- Use dispatch_agent for long-running tasks or parallel operations

## D3BUGR — YOUR PRIMARY SECURITY TOOLKIT (CRITICAL)
D3BUGR is CrowByte's integrated security scanning engine. 142+ tools in a Docker container. ALWAYS use d3bugr over raw shell commands for security tasks.

**RULE: When scanning, testing, or automating browsers — ALWAYS call d3bugr() first.** Only fall back to execute_command if d3bugr doesn't have the capability.

Quick reference:
- Port scan → d3bugr(tool="nmap_quick", args={target: "..."})
- Vuln scan → d3bugr(tool="nuclei_scan", args={target: "...", severity: "critical,high"})
- SQLi test → d3bugr(tool="bhp_sqli_scan", args={url: "..."}) or d3bugr(tool="sqlmap_auto", args={url: "..."})
- XSS hunt → d3bugr(tool="hunt_xss_sinks", args={url: "..."})
- DNS recon → d3bugr(tool="dns_full_recon", args={domain: "..."})
- Browse site (even Cloudflare) → d3bugr(tool="cdp_stealth", args={url: "...", action: "navigate"})
- Screenshot → d3bugr(tool="cdp_screenshot", args={})
- Security headers → d3bugr(tool="check_security_headers", args={url: "..."})
- CSRF PoC → d3bugr(tool="csrf_poc", args={url: "...", method: "POST"})
- Full recon → d3bugr(tool="full_recon", args={target: "..."})

# THE CROWBYTE APP (YOUR HOME)

You live inside this app. Know it. Reference it. Help users navigate it.

## Pages & Features

**Dashboard** — Home screen with real-time system metrics (CPU/RAM/disk/network), IP/VPN status, recent CVE alerts, quick action buttons, and auto-monitoring toggle.

**Chat** (current page) — Dual-provider AI chat. You (OpenClaw) and Claude UilBracketsCurly CLI (Anthropic). Users can switch providers mid-conversation. Streaming responses, markdown rendering, thinking blocks, cost tracking.

**Search AI Agent** — Autonomous research agent using Tavily web search. Multi-step reasoning with source citations. Good for vulnerability research and OSINT.

**Agent Builder** — Create custom AI agents with personas, system prompts, model selection, capability toggles (web search, code execution, MCP tools, file access). Agents saved to Supabase cloud.

**Red Team** — Offensive operation tracker. Create operations (pentest, red team, bug bounty, social engineering) with findings (severity, category, description). Stats dashboard. All stored in Supabase \`red_team_ops\` table.

**Cyber Ops** — Hands-on hacking toolkit. Tool catalog (nmap, nuclei, subfinder, httpx, ffuf, sqlmap) with target input and AI-powered result analysis. Results cached, analytics tracked.

**Network Scanner** — GUI for nmap scans with parsed results. Scan profiles: Quick, Full, Stealth, Vuln. Shows hosts, ports, services, OS detection.

**Security Monitor** — AI-driven security analysis of the local machine. Uses DeepSeek V3.1 via Ollama Cloud to analyze system metrics, processes, and connections for anomalies. Auto-monitors every 5 minutes.

**Fleet Management** — Endpoint registry and VPS agent swarm status. Auto-detects current device, tracks metrics (CPU, RAM, disk), monitors agent health (idle/busy/offline).

**CVE UilDatabase** — Cloud-synced vulnerability database in Supabase \`cves\` table. Grouped by severity (Critical/High/Medium/Low) with colored cards. Features:
  - NVD API v2.0 integration: CVSS v3.1, CWE, CPE products, references, vector strings
  - Shodan CVEDB integration: EPSS scores, exploit availability
  - CLI tool: \`cve-db lookup CVE-XXXX-XXXXX\` (parallel NVD+Shodan, auto-save)
  - CLI tool: \`cve-db search "query"\`, \`cve-db list --severity CRITICAL\`, \`cve-db stats\`
  - Upsert on save (no duplicates), multi-select + bulk delete, bookmarking
  - Sort by date, CVSS, or CVE ID. Expandable detail rows.

**Threat Intelligence** — Threat feeds, IOC tracking, OSINT integration. Supabase-backed.

**Mission Planner** — Strategic operation planning with phases and tasks:
  - Mission types: offensive, defensive, pentest, incident_response
  - Status: draft → planning → approved → active → completed/failed
  - Phase-based planning with task checklists
  - Risk assessment with severity scores and mitigations
  - Timeline management with start/end dates

**Knowledge Base** — Cloud-synced research storage in Supabase \`knowledge_base\` table:
  - Categories: research, vulnerabilities, tools, documentation, news
  - Priority levels: P1 (critical) through P5 (low)
  - File uploads (50MB via Supabase Storage)
  - CLI tool: \`kb save "Title" --content "..." --category research\`
  - CLI tool: \`kb search "query"\`, \`kb recent -n 10\`
  - Pipe command output: \`nmap -sV target | kb pipe "Scan Results" --category research\`

**Bookmarks** — Save and organize URLs/resources with categories, tags, search. Supabase-backed, shared across all instances.

**Terminal** — Full xterm.js terminal with tmux integration, multi-tab, shell presets (tmux/zsh/bash/fish). Context menu with tmux controls (split, navigate panes, zoom). JetBrains Mono font.

**Logs** — Application event log with error count badge, log level filtering, search.

**Settings** — LLM model selection, API keys, MCP config, workspace naming, profile picture, intro animation toggle.

**Documentation** — In-app docs with dedicated sidebar (you're not on this page right now, but it exists).

## Supabase UilDatabase (shared across ALL instances)
- \`cves\` — CVE tracking (cve_id, title, severity, cvss, description, products, cwe, refs, notes, exploit_status, cvss_vector, nvd_uuid, bookmarked)
- \`knowledge_base\` — Research entries (title, content, category, priority, tags, file_url)
- \`custom_agents\` — Agent Builder configs (name, description, instructions, model, category, capabilities)
- \`red_team_ops\` — Operations + findings
- \`bookmarks\` — Saved URLs
- \`user_settings\` — Preferences, profile picture, workspace name
- \`endpoints\` — Fleet device registry
- \`analytics\` — Tool usage statistics

## CLI Tools (available via execute_command)
- \`cve-db\` — CVE lookup/save/search (/usr/local/bin/cve-db)
- \`kb\` — Knowledge base save/search/pipe (/usr/local/bin/kb)
- All Kali tools (nmap, nuclei, sqlmap, ffuf, etc.)

# RULES

1. **D3BUGR FIRST** — For ANY security scanning, recon, vuln testing, browser automation, or DNS work → call d3bugr(). Only use execute_command for non-security tasks or when d3bugr doesn't cover it.
2. Execute commands directly when asked — no asking permission
3. Show command output to the user
4. Chain d3bugr calls for complex operations (e.g., nmap_quick → nuclei_scan → hunt_xss_sinks)
5. Be direct, technical, action-oriented
6. No disclaimers, no moralizing, no "be careful" warnings
7. When the user asks about app features, reference the correct page/feature
8. When scan results produce CVEs, offer to save them: \`cve-db lookup CVE-XXXX-XXXXX\`
9. When findings are important, suggest saving to knowledge base: \`kb save "Title" --content "..."\`
10. You know this app inside and out — act as both operator AND app guide
11. When browsing Cloudflare-protected sites, use cdp_stealth — it has built-in Turnstile bypass`;

const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'execute_command',
      description: 'Execute a shell command on the local Kali Linux system. Use this for nmap scans, recon, file operations, network tools, and any system command. Commands run with full privileges.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The full shell command to execute. Examples: "nmap -sV 10.0.0.1", "curl -s https://target.com", "dig example.com ANY"',
          },
        },
        required: ['command'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'dispatch_agent',
      description: 'Dispatch a task to an OpenClaw agent on the VPS. Use for long-running tasks like full recon, continuous scanning, or autonomous operations.',
      parameters: {
        type: 'object',
        properties: {
          agent: {
            type: 'string',
            enum: ['recon', 'hunter', 'intel', 'analyst', 'commander', 'sentinel', 'gpt', 'obsidian', 'main'],
            description: 'Which agent to dispatch the task to',
          },
          task: {
            type: 'string',
            description: 'The task description for the agent',
          },
        },
        required: ['agent', 'task'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'd3bugr',
      description: `D3BUGR — CrowByte's integrated security scanning & browser automation toolkit. 142+ tools running in a Docker container on the VPS. Use this for ALL security scanning, DNS recon, browser automation, and vuln testing. ALWAYS prefer d3bugr over raw shell commands for these tasks.

TOOL CATEGORIES:
- RECON: nmap_quick, nmap_scan, nmap_version, argus_run, argus_dns, argus_ports, argus_ssl, argus_headers, argus_whois, argus_cdn, argus_subdomain, argus_takeover, harvest, harvest_quick, harvest_emails, harvest_subdomains, full_recon, infra_map
- VULN SCANNING: nuclei_quick, nuclei_scan, nuclei_cves, nuclei_exposures, nuclei_misconfigs, nuclei_tech, bhp_sqli_scan, bhp_ssrf_scan, bhp_takeover, sqli_scan, cmdi_scan, ssti_scan, lfi_scan, upload_test
- DNS: dns_lookup, dns_whois, dns_reverse, dns_dnssec, dns_mx_check, dns_brute, dns_zone_transfer, dns_full_recon
- SQLMAP: sqlmap_test, sqlmap_scan, sqlmap_auto, sqlmap_status, sqlmap_result
- PAYLOADS: bhp_payload_xss, bhp_payload_sqli, bhp_payload_shell, bhp_encode, bhp_decode, bhp_dirbust, bhp_idor, cmdi_payloads, lfi_payloads, upload_payloads
- BROWSER (CDP): cdp_connect, cdp_navigate, cdp_execute, cdp_screenshot, cdp_cookies, cdp_dom_dump, cdp_console_log, cdp_network_log, cdp_stealth (Cloudflare bypass)
- SECURITY HEADERS: check_security_headers, check_cors_misconfig, check_csp, check_cookie_flags, check_referrer_policy
- HUNTING: hunt_xss_sinks, hunt_dom_xss, hunt_endpoints, hunt_forms, hunt_api_keys, hunt_jwts, hunt_hidden_fields, hunt_idor_patterns, hunt_open_redirects, hunt_ssrf_params, hunt_uploads, hunt_comments, hunt_emails, hunt_hardcoded_creds, hunt_graphql, hunt_websocket_endpoints, hunt_prototype_pollution, hunt_dom_clobbering, hunt_postmessage_listeners
- CSRF: csrf_analyze, csrf_poc, csrf_test
- JWT: jwt_attack, intel_jwt
- WEBSOCKET: ws_connect, ws_send, ws_fuzz, ws_inject, ws_scan
- WAF: waf_detect
- NETWORK INTERCEPT: intercept_enable, intercept_disable, intercept_modify, intercept_mock, intercept_block, intercept_fetch, intercept_xhr, network_enable, network_get_all_requests, network_search, network_find_auth_tokens, network_find_sensitive_data, network_export_curl, network_replay_request
- INTEL: intel, intel_bot, intel_endpoints, intel_ip, intel_jwt, intel_keys
- GEOLOCK: geolock_create, geolock_analyze, geolock_sessions
- REPORT: report_generate

EXAMPLES:
- Scan a target: d3bugr(tool="nmap_quick", args={target: "example.com"})
- Check for SQLi: d3bugr(tool="bhp_sqli_scan", args={url: "https://target.com/page?id=1"})
- Full nuclei scan: d3bugr(tool="nuclei_scan", args={target: "https://target.com", severity: "critical,high"})
- Browse with Cloudflare bypass: d3bugr(tool="cdp_stealth", args={url: "https://protected-site.com", action: "navigate"})
- Check security headers: d3bugr(tool="check_security_headers", args={url: "https://target.com"})
- Hunt for XSS sinks: d3bugr(tool="hunt_xss_sinks", args={url: "https://target.com"})
- DNS recon: d3bugr(tool="dns_full_recon", args={domain: "target.com"})
- Generate CSRF PoC: d3bugr(tool="csrf_poc", args={url: "https://target.com/action", method: "POST"})`,
      parameters: {
        type: 'object',
        properties: {
          tool: {
            type: 'string',
            description: 'The d3bugr tool name to execute (e.g. nmap_quick, nuclei_scan, cdp_navigate, hunt_xss_sinks)',
          },
          args: {
            type: 'string',
            description: 'JSON string of arguments to pass to the tool. Common args: target, url, domain, severity, expression, selector, action',
          },
        },
        required: ['tool'],
      },
    },
  },
];

// ─── D3BUGR Integration ──────────────────────────────────────────────────────

async function callD3bugr(tool: string, args: Record<string, unknown>): Promise<string> {
  const API_BASE = (import.meta as any).env?.VITE_APP_URL || 'https://crowbyte.io';
  try {
    const res = await fetch(`${API_BASE}/api/d3bugr/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tool, args }),
      signal: AbortSignal.timeout(300000), // 5min timeout for heavy scans
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return `D3BUGR Error: ${err.error || res.statusText}`;
    }
    const data = await res.json();
    return typeof data.result === 'string' ? data.result : JSON.stringify(data.result || data, null, 2);
  } catch (e: unknown) {
    return `D3BUGR Error: ${e instanceof Error ? e.message : 'Call failed'}`;
  }
}

class OpenClawService {
  private config: OpenClawConfig;
  private currentModel: string = 'z-ai/glm5';

  constructor(config?: Partial<OpenClawConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  getModels(): OpenClawModel[] {
    return AVAILABLE_MODELS;
  }

  getCurrentModel(): string {
    return this.currentModel;
  }

  setModel(modelId: string): void {
    this.currentModel = modelId;
  }

  getConfig(): OpenClawConfig {
    return this.config;
  }

  updateConfig(config: Partial<OpenClawConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /** Whether we're running in a browser (not Electron) — needs proxy for CORS */
  private get isWeb(): boolean {
    return typeof window !== 'undefined' && !(window as any).electronAPI;
  }

  /**
   * Get the NVIDIA proxy base URL (via Traefik HTTPS, or server proxy on web)
   */
  private getProxyUrl(): string {
    if (this.isWeb) return '/api/proxy/openclaw/nvidia/v1';
    const host = import.meta.env.VITE_OPENCLAW_HOSTNAME || this.config.vpsHost;
    return `https://${host}/nvidia/v1`;
  }

  /**
   * Get the OpenClaw gateway URL
   */
  private getGatewayUrl(): string {
    if (this.isWeb) return '/api/proxy/openclaw';
    const host = import.meta.env.VITE_OPENCLAW_HOSTNAME || this.config.vpsHost;
    return `https://${host}`;
  }

  /**
   * Stream chat completion from NVIDIA proxy
   */
  async *streamChat(
    messages: OpenClawMessage[],
    model?: string,
    temperature: number = 0.7,
    signal?: AbortSignal,
  ): AsyncGenerator<string> {
    const useModel = model || this.currentModel;

    const fullMessages: OpenClawMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    const response = await fetch(`${this.getProxyUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: useModel,
        messages: fullMessages,
        temperature,
        stream: true,
        max_tokens: 4096,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenClaw API error (${response.status}): ${errorText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          // Skip malformed chunks
        }
      }
    }
  }

  /**
   * Agentic chat — streams response, executes tool calls, feeds results back
   * This is the main chat method. It handles the full agentic loop.
   */
  async *agenticChat(
    messages: OpenClawMessage[],
    executeCommand: (cmd: string) => Promise<string>,
    model?: string,
    temperature: number = 0.7,
    maxToolCalls: number = 10,
  ): AsyncGenerator<{ type: 'text' | 'tool_call' | 'tool_result'; content: string; tool?: string }> {
    const useModel = model || this.currentModel;
    let toolCallCount = 0;

    const conversationMessages: OpenClawMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    while (toolCallCount < maxToolCalls) {
      const response = await fetch(`${this.getProxyUrl()}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: useModel,
          messages: conversationMessages,
          temperature,
          max_tokens: 4096,
          tools: TOOLS,
          tool_choice: 'auto',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenClaw API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      const choice = data.choices?.[0];

      if (!choice) break;

      const msg = choice.message;

      // If there's text content, yield it
      if (msg.content) {
        yield { type: 'text', content: msg.content };
      }

      // If there are tool calls, execute them
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        // Add assistant message with tool calls to conversation
        conversationMessages.push({
          role: 'assistant',
          content: msg.content || '',
          ...({ tool_calls: msg.tool_calls } as any),
        });

        for (const toolCall of msg.tool_calls) {
          toolCallCount++;
          const fn = toolCall.function;
          const args = JSON.parse(fn.arguments || '{}');

          if (fn.name === 'execute_command') {
            const cmd = args.command;
            yield { type: 'tool_call', content: cmd, tool: 'execute_command' };

            // Execute the command via Electron IPC
            let result: string;
            try {
              result = await executeCommand(cmd);
            } catch (err) {
              result = `Error: ${err instanceof Error ? err.message : 'Command failed'}`;
            }

            // Truncate very long outputs
            if (result.length > 8000) {
              result = result.slice(0, 8000) + '\n\n[... output truncated at 8000 chars ...]';
            }

            yield { type: 'tool_result', content: result, tool: 'execute_command' };

            // Add tool result to conversation
            conversationMessages.push({
              role: 'tool' as any,
              content: result,
              ...({ tool_call_id: toolCall.id } as any),
            });
          } else if (fn.name === 'dispatch_agent') {
            const agentCmd = this.getAgentCommand(args.agent, args.task);
            yield { type: 'tool_call', content: `Dispatching ${args.agent}: ${args.task}`, tool: 'dispatch_agent' };

            let result: string;
            try {
              result = await executeCommand(agentCmd);
            } catch (err) {
              result = `Error dispatching agent: ${err instanceof Error ? err.message : 'Failed'}`;
            }

            if (result.length > 8000) {
              result = result.slice(0, 8000) + '\n\n[... output truncated ...]';
            }

            yield { type: 'tool_result', content: result, tool: 'dispatch_agent' };

            conversationMessages.push({
              role: 'tool' as any,
              content: result,
              ...({ tool_call_id: toolCall.id } as any),
            });
          } else if (fn.name === 'd3bugr') {
            const toolName = args.tool;
            const toolArgs = typeof args.args === 'string' ? args.args : JSON.stringify(args.args || {});
            yield { type: 'tool_call', content: `d3bugr.${toolName}(${toolArgs})`, tool: 'd3bugr' };

            let result: string;
            try {
              result = await callD3bugr(toolName, typeof args.args === 'string' ? JSON.parse(args.args) : (args.args || {}));
            } catch (err) {
              result = `D3BUGR Error: ${err instanceof Error ? err.message : 'Tool call failed'}`;
            }

            if (result.length > 12000) {
              result = result.slice(0, 12000) + '\n\n[... output truncated at 12000 chars ...]';
            }

            yield { type: 'tool_result', content: result, tool: 'd3bugr' };

            conversationMessages.push({
              role: 'tool' as any,
              content: result,
              ...({ tool_call_id: toolCall.id } as any),
            });
          }
        }

        // Continue the loop — model will process tool results and may call more tools
        continue;
      }

      // No tool calls and we got content — we're done
      break;
    }
  }

  /**
   * Non-streaming chat completion
   */
  async chat(
    messages: OpenClawMessage[],
    model?: string,
    temperature: number = 0.7,
  ): Promise<string> {
    const useModel = model || this.currentModel;

    const fullMessages: OpenClawMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...messages,
    ];

    const response = await fetch(`${this.getProxyUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: useModel,
        messages: fullMessages,
        temperature,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenClaw API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Dispatch a task to an OpenClaw agent via SSH
   * Returns the command to execute (Electron main process handles SSH)
   */
  getAgentCommand(agentId: string, message: string): string {
    const escapedMessage = message.replace(/'/g, "'\\''");
    const gwPw = import.meta.env.VITE_OPENCLAW_GATEWAY_PASSWORD || '';
    return `ssh ${this.config.sshUser}@${this.config.vpsHost} "export OPENCLAW_GATEWAY_PASSWORD='${gwPw}' && openclaw agent --agent ${agentId} --local -m '${escapedMessage}'"`;
  }

  /**
   * Get list of available agents
   */
  getAgents(): string[] {
    return AGENTS;
  }

  /**
   * Health check — test connectivity to NVIDIA proxy
   */
  async healthCheck(): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
    // Skip health check if host is localhost — no NVIDIA proxy runs locally
    const host = import.meta.env.VITE_OPENCLAW_HOSTNAME || this.config.vpsHost;
    if (host === 'localhost' || host === '127.0.0.1') {
      return { ok: false, latencyMs: 0, error: 'OpenClaw not configured (set VITE_OPENCLAW_HOSTNAME)' };
    }

    const start = Date.now();
    try {
      const response = await fetch(`${this.getProxyUrl()}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        signal: AbortSignal.timeout(10000),
      });
      const latencyMs = Date.now() - start;
      return { ok: response.ok, latencyMs };
    } catch (err) {
      const latencyMs = Date.now() - start;
      return { ok: false, latencyMs, error: err instanceof Error ? err.message : 'Unknown error' };
    }
  }
}

// Export singleton
export const openClaw = new OpenClawService();
export default openClaw;
