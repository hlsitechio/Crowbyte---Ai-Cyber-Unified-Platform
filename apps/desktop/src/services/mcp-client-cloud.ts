/**
 * MCP Client Service - Cloud Version
 * Connects to cloud-hosted MCP servers (mcp-cloud.ai) and local MCP servers
 * Exposes their tools for Venice.ai function calling
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { mcpConfig } from '../config/mcp-config.js';

interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

interface MCPServer {
  name: string;
  client: Client;
  transport: StdioClientTransport;
  tools: MCPTool[];
}

class MCPClientService {
  private servers: Map<string, MCPServer> = new Map();
  private initialized = false;

  /**
   * Initialize MCP servers
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize cloud-hosted Supabase MCP server
      if (mcpConfig.enableCloudSupabase) {
        await this.connectCloudSupabaseServer();
      }

      // Initialize filesystem server (optional - can disable if not needed)
      // await this.connectFilesystemServer();

      // Initialize memory server (optional - can disable if not needed)
      // await this.connectMemoryServer();

      this.initialized = true;
      console.log('✅ MCP servers initialized successfully');
      console.log(`📊 Total servers connected: ${this.servers.size}`);
    } catch (error) {
      console.error('❌ Failed to initialize MCP servers:', error);
      throw error;
    }
  }

  /**
   * Connect to cloud-hosted Supabase MCP server via mcp-cloud.ai
   */
  private async connectCloudSupabaseServer() {
    const mcpCloudUrl = mcpConfig.cloudUrl;
    const mcpCloudAuth = mcpConfig.cloudAuth;

    if (!mcpCloudUrl || !mcpCloudAuth) {
      console.warn('⚠️  MCP Cloud credentials not configured');
      return;
    }

    try {
      const transport = new StdioClientTransport({
        command: 'npx',
        args: [
          'mcp-remote',
          '--header',
          `Authorization:${mcpCloudAuth}`,
          mcpCloudUrl,
        ],
      });

      const client = new Client(
        {
          name: 'ghost-ai-terminal',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await client.connect(transport);

      // Get available tools
      const toolsList = await client.listTools();

      this.servers.set('supabase', {
        name: 'supabase',
        client,
        transport,
        tools: toolsList.tools as MCPTool[],
      });

      console.log(`🗄️  Cloud Supabase MCP server connected with ${toolsList.tools.length} tools`);
      console.log(`📡 Connected to: ${mcpCloudUrl}`);
    } catch (error) {
      console.error('❌ Failed to connect to Cloud Supabase MCP server:', error);
      throw error;
    }
  }

  /**
   * Connect to filesystem MCP server (local)
   */
  private async connectFilesystemServer() {
    const transport = new StdioClientTransport({
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-filesystem',
        process.cwd(),
      ],
    });

    const client = new Client(
      {
        name: 'ghost-ai-terminal',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);

    const toolsList = await client.listTools();

    this.servers.set('filesystem', {
      name: 'filesystem',
      client,
      transport,
      tools: toolsList.tools as MCPTool[],
    });

    console.log(`📁 Filesystem MCP server connected with ${toolsList.tools.length} tools`);
  }

  /**
   * Connect to memory MCP server (local)
   */
  private async connectMemoryServer() {
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
    });

    const client = new Client(
      {
        name: 'ghost-ai-terminal',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);

    const toolsList = await client.listTools();

    this.servers.set('memory', {
      name: 'memory',
      client,
      transport,
      tools: toolsList.tools as MCPTool[],
    });

    console.log(`🧠 Memory MCP server connected with ${toolsList.tools.length} tools`);
  }

  /**
   * Get all available tools from all MCP servers in Venice.ai function calling format
   */
  getVeniceTools(): any[] {
    const tools: any[] = [];

    for (const [serverName, server] of this.servers.entries()) {
      for (const tool of server.tools) {
        tools.push({
          type: 'function',
          function: {
            name: `mcp_${serverName}_${tool.name}`,
            description: `[MCP ${serverName.toUpperCase()}] ${tool.description}`,
            parameters: tool.inputSchema,
          },
        });
      }
    }

    return tools;
  }

  /**
   * Execute an MCP tool call
   */
  async executeTool(toolName: string, args: any): Promise<any> {
    // Parse tool name to get server and actual tool name
    // Format: mcp_<servername>_<toolname>
    // Server name is alphanumeric only (no underscores)
    const match = toolName.match(/^mcp_([a-z]+)_(.+)$/);
    if (!match) {
      throw new Error(`Invalid MCP tool name: ${toolName}`);
    }

    const [, serverName, actualToolName] = match;
    const server = this.servers.get(serverName);

    if (!server) {
      throw new Error(`MCP server not found: ${serverName}`);
    }

    try {
      console.log(`🔧 Executing MCP tool: ${toolName}`);
      console.log(`📝 Arguments:`, args);

      const result = await server.client.callTool({
        name: actualToolName,
        arguments: args,
      });

      console.log(`✅ MCP tool executed successfully`);
      console.log(`📦 Result:`, result);

      return result;
    } catch (error) {
      console.error(`❌ Failed to execute MCP tool ${toolName}:`, error);
      throw error;
    }
  }

  /**
   * Get list of all available MCP tools
   */
  getToolsList(): { server: string; tools: MCPTool[] }[] {
    const list: { server: string; tools: MCPTool[] }[] = [];

    for (const [serverName, server] of this.servers.entries()) {
      list.push({
        server: serverName,
        tools: server.tools,
      });
    }

    return list;
  }

  /**
   * Get server statistics
   */
  getStats() {
    const stats = {
      totalServers: this.servers.size,
      servers: [] as { name: string; toolCount: number; tools: string[] }[],
      totalTools: 0,
    };

    for (const [serverName, server] of this.servers.entries()) {
      stats.servers.push({
        name: serverName,
        toolCount: server.tools.length,
        tools: server.tools.map(t => t.name),
      });
      stats.totalTools += server.tools.length;
    }

    return stats;
  }

  /**
   * Cleanup - close all MCP server connections
   */
  async cleanup() {
    console.log('🧹 Cleaning up MCP connections...');

    for (const [name, server] of this.servers.entries()) {
      try {
        await server.client.close();
        console.log(`🔌 Disconnected from ${name} MCP server`);
      } catch (error) {
        console.error(`Failed to disconnect from ${name}:`, error);
      }
    }

    this.servers.clear();
    this.initialized = false;
    console.log('✅ All MCP connections closed');
  }
}

// Export singleton instance
export const mcpClient = new MCPClientService();
export default mcpClient;
