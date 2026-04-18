/**
 * MCP Server Configuration for CrowByte App
 *
 * IMPORTANT: This is COMPLETELY SEPARATE from Claude CLI's MCP config.
 *
 * - Claude CLI uses: C:\Users\{username}\.claude.json
 * - CrowByte App uses: This file + environment variables
 *
 * To add MCPs to Claude CLI: `claude mcp add <name> <command/url>`
 * To add MCPs to CrowByte: Edit this file and restart the app
 */

export interface MCPServerConfig {
  name: string;
  description: string;
  type: 'http' | 'sse' | 'stdio';

  // For HTTP/SSE servers
  url?: string;
  headers?: Record<string, string>;

  // For STDIO servers (local Node.js scripts)
  command?: string;
  args?: string[];
  env?: Record<string, string>;

  // Status tracking
  enabled: boolean;
  category: 'database' | 'ai' | 'security' | 'productivity' | 'communication' | 'custom';
}

/**
 * MCP Servers available to CrowByte
 * These are used by the app's AI features, NOT by Claude CLI
 */
export const MCP_SERVERS: MCPServerConfig[] = [
  // === DATABASE ===
  {
    name: 'supabase',
    description: 'Supabase database operations - tables, RLS, migrations',
    type: 'http',
    url: `https://mcp.supabase.com/mcp?project_ref=${import.meta.env.VITE_SUPABASE_PROJECT_REF || ''}&features=docs,account,database,debugging,development,functions,branching,storage`,
    enabled: true,
    category: 'database',
  },

  // === SECURITY (CVE/Vulnerability) ===
  {
    name: 'nvd',
    description: 'NVD CVE vulnerability database search',
    type: 'stdio',
    command: 'node',
    args: ['G:/ai_ghost_chat/nvd-mcp-server/index.js'],
    env: {
      NVD_API_KEY: import.meta.env.VITE_NVD_API_KEY || '',
    },
    enabled: true,
    category: 'security',
  },

  // === PRODUCTIVITY/AUTOMATION ===
  {
    name: 'make',
    description: 'Make.com automation scenarios',
    type: 'sse',
    url: import.meta.env.VITE_MAKE_MCP_URL || '',
    enabled: true,
    category: 'productivity',
  },
  {
    name: 'netlify',
    description: 'Netlify deployment and hosting',
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@netlify/mcp'],
    env: {
      NETLIFY_AUTH_TOKEN: import.meta.env.VITE_NETLIFY_AUTH_TOKEN || '',
    },
    enabled: true,
    category: 'productivity',
  },

  // === COMMUNICATION ===
  {
    name: 'resend',
    description: 'Email sending via Resend API',
    type: 'stdio',
    command: 'node',
    args: ['G:/ai_ghost_chat/mcp-send-email/build/index.js'],
    env: {
      RESEND_API_KEY: import.meta.env.VITE_RESEND_API_KEY || '',
    },
    enabled: true,
    category: 'communication',
  },

  // === AI/KNOWLEDGE ===
  {
    name: 'byterover',
    description: 'ByteRover knowledge storage and retrieval',
    type: 'http',
    url: 'https://mcp.byterover.dev/v2/mcp',
    enabled: true,
    category: 'ai',
  },
  {
    type: 'http',
    enabled: false, // Enable when API key is configured
    category: 'ai',
  },
];

/**
 * Get enabled MCP servers by category
 */
export function getServersByCategory(category: MCPServerConfig['category']): MCPServerConfig[] {
  return MCP_SERVERS.filter(s => s.enabled && s.category === category);
}

/**
 * Get all enabled MCP servers
 */
export function getEnabledServers(): MCPServerConfig[] {
  return MCP_SERVERS.filter(s => s.enabled);
}

/**
 * Get MCP server by name
 */
export function getServerByName(name: string): MCPServerConfig | undefined {
  return MCP_SERVERS.find(s => s.name === name);
}

/**
 * Check if an MCP server is available (enabled and properly configured)
 */
export function isServerAvailable(name: string): boolean {
  const server = getServerByName(name);
  if (!server || !server.enabled) return false;

  if (server.type === 'http' || server.type === 'sse') {
    return !!server.url;
  }

  if (server.type === 'stdio') {
    return !!server.command;
  }

  return false;
}
