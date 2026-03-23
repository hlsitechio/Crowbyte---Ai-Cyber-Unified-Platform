/**
 * MCP Configuration
 * Works in both Node.js and Vite/Browser contexts
 */

// Helper to get environment variable from either import.meta.env or process.env
function getEnv(key: string): string | undefined {
  // Try Vite env first (browser/Vite context)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key];
  }

  // Fallback to process.env (Node.js context)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }

  return undefined;
}

export const mcpConfig = {
  // Cloud MCP Server (mcp-cloud.ai)
  cloudUrl: getEnv('VITE_MCP_CLOUD_URL') || 'https://ai-ghost-1763329759554.server.mcp-cloud.ai/sse',
  cloudAuth: getEnv('VITE_MCP_CLOUD_AUTH') || '',

  // Enable/disable specific servers
  enableCloudSupabase: true,
  enableFilesystem: false,
  enableMemory: false,
};

export default mcpConfig;
