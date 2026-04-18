/**
 * MCP Client Service
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

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
      // Initialize filesystem server
      await this.connectFilesystemServer();

      // Initialize memory server
      await this.connectMemoryServer();

      this.initialized = true;
      console.log('✅ MCP servers initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize MCP servers:', error);
      throw error;
    }
  }

  /**
   * Connect to filesystem MCP server
   */
  private async connectFilesystemServer() {
    const transport = new StdioClientTransport({
      command: 'npx',
      args: [
        '-y',
        '@modelcontextprotocol/server-filesystem',
        process.cwd() // Allow access to current working directory
      ],
    });

    const client = new Client(
      {
        name: 'crowbyte-mcp-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);

    // Get available tools
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
   * Connect to memory MCP server
   */
  private async connectMemoryServer() {
    const transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-memory'],
    });

    const client = new Client(
      {
        name: 'crowbyte-mcp-client',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    await client.connect(transport);

    // Get available tools
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
   */
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
    const match = toolName.match(/^mcp_(\w+)_(.+)$/);
    if (!match) {
      throw new Error(`Invalid MCP tool name: ${toolName}`);
    }

    const [, serverName, actualToolName] = match;
    const server = this.servers.get(serverName);

    if (!server) {
      throw new Error(`MCP server not found: ${serverName}`);
    }

    try {
      console.log(`🔧 Executing MCP tool: ${toolName} with args:`, args);

      const result = await server.client.callTool({
        name: actualToolName,
        arguments: args,
      });

      console.log(`✅ MCP tool executed successfully:`, result);
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
   * Cleanup - close all MCP server connections
   */
  async cleanup() {
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
  }
}

// Export singleton instance
export const mcpClient = new MCPClientService();
export default mcpClient;
