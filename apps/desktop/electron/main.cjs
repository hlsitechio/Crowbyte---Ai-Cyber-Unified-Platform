/**
 * Electron Main Process
 * Handles MCP servers, Venice.ai API, and IPC communication
 */

// Suppress EPIPE errors (broken pipe when Vite disconnects)
process.stdout.on('error', (err) => { if (err.code === 'EPIPE') return; });
process.stderr.on('error', (err) => { if (err.code === 'EPIPE') return; });
process.on('uncaughtException', (err) => {
  if (err.code === 'EPIPE' || err.message?.includes('EPIPE')) return;
  console.error('[!] Uncaught:', err);
});

// Suppress sourcemap warnings for MCP SDK (missing source files)
process.on('warning', (warning) => {
  if (warning.message && warning.message.includes('Sourcemap')) {
    return; // Suppress sourcemap warnings
  }
  console.warn(warning);
});

const { app, BrowserWindow, ipcMain, Menu, safeStorage, WebContentsView, session } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const os = require('os');
const plat = require('./platform.cjs');
let pty;
try {
  pty = require('node-pty');
} catch (e) {
  console.warn('node-pty not available, falling back to child_process.spawn for terminals');
}
// MCP SDK is ESM-only — graceful fallback if require() fails (Docker/Windows CJS)
let Client, StdioClientTransport;
try {
  ({ Client } = require('@modelcontextprotocol/sdk/client/index.js'));
  ({ StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js'));
} catch (e) {
  console.warn('[!] MCP SDK not available (ESM-only module in CJS context) — MCP features disabled');
  Client = null;
  StdioClientTransport = null;
}

// Disable hardware acceleration to prevent GPU errors (if app is available)
if (app && typeof app.disableHardwareAcceleration === 'function') {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
  app.commandLine.appendSwitch('disable-gpu-program-cache');
}

// Terminal process management
const terminalProcesses = new Map();

// MCP Client Service
class MCPClientService {
  constructor() {
    this.servers = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    if (!Client || !StdioClientTransport) {
      console.warn('[i] MCP SDK unavailable — skipping MCP server initialization');
      this.initialized = true;
      return;
    }

    console.log('🚀 Initializing MCP servers in parallel...\n');
    const startTime = Date.now();

    // Initialize all servers in parallel with individual error handling
    const results = await Promise.allSettled([
      this.connectMonitorServer(),
      this.connectTavilyServer(),
      this.connectFilesystemServer(),
      this.connectMemoryServer(),
    ]);

    // Log results
    const serverNames = ['PC Monitor (Binary)', 'Tavily (NPX)', 'Filesystem (NPX)', 'Memory (NPX)'];
    let successCount = 0;
    let failedServers = [];

    console.log('\n📊 MCP Server Initialization Results:\n');
    console.log('═'.repeat(60));

    results.forEach((result, index) => {
      const serverName = serverNames[index];
      if (result.status === 'fulfilled') {
        console.log(`✅ ${serverName.padEnd(25)} - CONNECTED`);
        successCount++;
      } else {
        console.error(`❌ ${serverName.padEnd(25)} - FAILED`);
        console.error(`   Error: ${result.reason.message}`);
        failedServers.push(serverName);
      }
    });

    console.log('═'.repeat(60));
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✨ Initialization complete: ${successCount}/4 servers connected in ${duration}s\n`);

    if (failedServers.length > 0) {
      console.warn(`⚠️  Warning: ${failedServers.length} server(s) failed to connect:`);
      failedServers.forEach(server => console.warn(`   - ${server}`));
      console.warn(`   The app will continue with available servers.\n`);
    }

    this.initialized = true;
  }

  async connectMonitorServer() {
    try {
      const monitorBinaryPath = path.join(__dirname, '../bin/mcp-monitor');
      // Skip on Linux if binary doesn't exist
      const fs = require('fs');
      if (!fs.existsSync(monitorBinaryPath)) {
        console.log('⚠️  Monitor MCP binary not found, skipping');
        return;
      }

      const transport = new StdioClientTransport({
        command: monitorBinaryPath,
        args: [],
      });

      const client = new Client(
        {
          name: 'crowbyte',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await client.connect(transport);
      const toolsList = await client.listTools();

      this.servers.set('monitor', {
        name: 'monitor',
        client,
        transport,
        tools: toolsList.tools,
      });

      return { success: true, tools: toolsList.tools.length };
    } catch (error) {
      throw new Error(`PC Monitor connection failed: ${error.message}`);
    }
  }

  async connectTavilyServer() {
    try {
      const transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', 'tavily-mcp@0.1.3'],
        env: {
          ...process.env,
          TAVILY_API_KEY: process.env.TAVILY_API_KEY || '',
        },
      });

      const client = new Client(
        {
          name: 'crowbyte',
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      await client.connect(transport);
      const toolsList = await client.listTools();

      this.servers.set('tavily', {
        name: 'tavily',
        client,
        transport,
        tools: toolsList.tools,
      });

      return { success: true, tools: toolsList.tools.length };
    } catch (error) {
      throw new Error(`Tavily (NPX) connection failed: ${error.message}`);
    }
  }

  async connectFilesystemServer() {
    try {
      const transport = new StdioClientTransport({
        command: 'npx',
        args: [
          '-y',
          '@modelcontextprotocol/server-filesystem',
          '/mnt/bounty',
          '/home/rainkode',
          process.cwd()
        ],
      });

      const client = new Client(
        {
          name: 'crowbyte',
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
        tools: toolsList.tools,
      });

      return { success: true, tools: toolsList.tools.length };
    } catch (error) {
      throw new Error(`Filesystem (NPX) connection failed: ${error.message}`);
    }
  }

  async connectMemoryServer() {
    try {
      const transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-memory'],
      });

      const client = new Client(
        {
          name: 'crowbyte',
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
        tools: toolsList.tools,
      });

      return { success: true, tools: toolsList.tools.length };
    } catch (error) {
      throw new Error(`Memory (NPX) connection failed: ${error.message}`);
    }
  }

  getVeniceTools() {
    const tools = [];

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
   * Get only monitoring tools (for CrowByte Security)
   */
  getMonitoringTools() {
    const tools = [];
    const monitorServer = this.servers.get('monitor');

    if (monitorServer) {
      for (const tool of monitorServer.tools) {
        tools.push({
          type: 'function',
          function: {
            name: `mcp_monitor_${tool.name}`,
            description: tool.description || `Monitor tool: ${tool.name}`,
            parameters: tool.inputSchema,
          },
        });
      }
    }

    return tools;
  }

  async executeTool(toolName, args) {
    // Fix: Use [^_]+ instead of \w+ to avoid capturing underscores in server name
    // Example: mcp_monitor_get_cpu_info → server='monitor', tool='get_cpu_info'
    const match = toolName.match(/^mcp_([^_]+)_(.+)$/);
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

  getToolsList() {
    const list = [];

    for (const [serverName, server] of this.servers.entries()) {
      list.push({
        server: serverName,
        tools: server.tools,
      });
    }

    return list;
  }

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

// Venice.ai Service
class VeniceAIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.venice.ai/api/v1';
    this.mcpInitialized = false;
  }

  async initializeMCP() {
    if (this.mcpInitialized) return;

    try {
      // await mcpClient.initialize(); // Disabled - MCP loads on-demand
      this.mcpInitialized = true;
      console.log('✅ MCP initialized for Venice.ai');
    } catch (error) {
      console.error('❌ Failed to initialize MCP:', error);
      throw error;
    }
  }

  async *createMCPStreamingChat(request) {
    if (!this.apiKey) {
      throw new Error('Venice.ai API key not configured');
    }

    if (!this.mcpInitialized) {
      await this.initializeMCP();
    }

    const mcpTools = mcpClient.getVeniceTools();
    console.log(`🔧 Available MCP tools: ${mcpTools.length}`);

    // Use native fetch instead of OpenAI SDK
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        tools: mcpTools.length > 0 ? mcpTools : undefined,
        tool_choice: mcpTools.length > 0 ? 'auto' : undefined,
        temperature: request.temperature || 0.7,
        stream: true,
        venice_parameters: {
          enable_web_search: 'auto',
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Venice.ai API error: ${error}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let toolCalls = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || line.startsWith(':')) continue;
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const chunk = JSON.parse(data);
          const delta = chunk.choices[0]?.delta;

          if (delta?.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              if (toolCall.index !== undefined) {
                if (!toolCalls[toolCall.index]) {
                  toolCalls[toolCall.index] = {
                    id: toolCall.id || '',
                    type: 'function',
                    function: { name: '', arguments: '' },
                  };
                }

                if (toolCall.function?.name) {
                  toolCalls[toolCall.index].function.name = toolCall.function.name;
                }
                if (toolCall.function?.arguments) {
                  toolCalls[toolCall.index].function.arguments += toolCall.function.arguments;
                }
              }
            }
          }

          if (delta?.content) {
            yield delta.content;
          }
        } catch (e) {
          // Ignore parse errors for partial chunks
        }
      }
    }

    if (toolCalls.length > 0) {
      yield '\n\n🔧 Executing tools...\n\n';

      for (const toolCall of toolCalls) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await mcpClient.executeTool(toolCall.function.name, args);

          yield `\n**Tool: ${toolCall.function.name}**\n`;

          // MCP returns results in a specific format with content array
          if (result.content && Array.isArray(result.content)) {
            for (const item of result.content) {
              if (item.type === 'text') {
                yield `${item.text}\n`;
              } else if (item.type === 'image') {
                yield `[Image: ${item.mimeType}]\n`;
              } else {
                yield `${JSON.stringify(item, null, 2)}\n`;
              }
            }
          } else {
            yield `${JSON.stringify(result, null, 2)}\n`;
          }
          yield `\n`;
        } catch (error) {
          yield `\n**Tool Error: ${toolCall.function.name}**\n`;
          yield `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\n`;
        }
      }
    }
  }

  async *createStreamingChatCompletion(request) {
    if (!this.apiKey) {
      throw new Error('Venice.ai API key not configured');
    }

    // Remove mcpEnabled from request - it's our custom parameter
    const { mcpEnabled, ...apiRequest } = request;

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        ...apiRequest,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Venice.ai API error: ${error}`);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  getMCPTools() {
    if (!this.mcpInitialized) {
      return [];
    }
    return mcpClient.getToolsList();
  }
}

// Global instances
const mcpClient = new MCPClientService();
let veniceAI = null;
let mainWindow = null;

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true, // Keep web security enabled
      webviewTag: true, // Enable <webview> for embedded browser panel
      // Allow fetch to external IP services
      allowRunningInsecureContent: false,
    },
    backgroundColor: '#000000',
    icon: path.join(__dirname, '../public/icon.png'),
    frame: false, // Remove window decorations
    titleBarStyle: 'hidden',
  });

  // Browser panel session is now managed by BrowserManager (see bottom of file)

  // Set Content Security Policy for the main app renderer
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          true // Always use permissive CSP — we're a security tool, not a web app
            ? // Development/Runtime: Allow localhost + all IP services + AI services + VNC
              "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* data: blob:; " +
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; " +
              "style-src 'self' 'unsafe-inline' http://localhost:* https://fonts.googleapis.com; " +
              "img-src 'self' data: blob: http://localhost:* https:; " +
              "frame-src 'self' https://*.hstgr.cloud; " +
              "connect-src 'self' http://localhost:* ws://localhost:* wss://localhost:* " +
              "https://api.ipify.org https://api64.ipify.org https://ipinfo.io " +
              "https://api.my-ip.io https://icanhazip.com https://ipecho.net " +
              "https://ifconfig.me https://ident.me https://wtfismyip.com " +
              "https://ipapi.co https://check.torproject.org " +
              "https://api.venice.ai https://ollama.ai https://*.supabase.co wss://*.supabase.co " +
              "https://*.hstgr.cloud " +
              "wss://*.hstgr.cloud:* " +
              "https://integrate.api.nvidia.com http://" + (process.env.VITE_VPS_IP || '127.0.0.1') + ":*; " +
              "font-src 'self' data: https://fonts.gstatic.com;"
            : // Production: Same access
              "default-src 'self'; " +
              "script-src 'self'; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "img-src 'self' data: blob: https:; " +
              "connect-src 'self' " +
              "https://api.ipify.org https://api64.ipify.org https://ipinfo.io " +
              "https://api.my-ip.io https://icanhazip.com https://ipecho.net " +
              "https://ifconfig.me https://ident.me https://wtfismyip.com " +
              "https://ipapi.co https://check.torproject.org " +
              "https://api.venice.ai https://ollama.ai https://*.supabase.co " +
              "https://*.hstgr.cloud " +
              "https://integrate.api.nvidia.com http://" + (process.env.VITE_VPS_IP || '127.0.0.1') + ":*; " +
              "font-src 'self' data: https://fonts.gstatic.com;"
        ]
      }
    });
  });

  // Load the app - always use dev server for now
  mainWindow.loadURL('http://localhost:8081');
  // Dev tools can be opened manually with Ctrl+Shift+I if needed

  // Production mode (commented out for now)
  // if (process.env.NODE_ENV === 'development') {
  //   mainWindow.loadURL('http://localhost:8082');
  // } else {
  //   mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  // }

  // Setup context menu (right-click menu)
  mainWindow.webContents.on('context-menu', (event, params) => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Inspect Element',
        click: () => {
          mainWindow.webContents.inspectElement(params.x, params.y);
        }
      },
      {
        label: 'Open DevTools',
        accelerator: 'Ctrl+Shift+I',
        click: () => {
          mainWindow.webContents.toggleDevTools();
        }
      },
      { type: 'separator' },
      {
        label: 'Reload',
        accelerator: 'Ctrl+R',
        click: () => {
          mainWindow.webContents.reload();
        }
      },
      {
        label: 'Force Reload',
        accelerator: 'Ctrl+Shift+R',
        click: () => {
          mainWindow.webContents.reloadIgnoringCache();
        }
      }
    ]);

    contextMenu.popup();
  });

  // Keyboard shortcuts for DevTools
  mainWindow.webContents.on('before-input-event', (event, input) => {
    // Ctrl+Shift+I or F12 to toggle DevTools
    if ((input.control && input.shift && input.key.toLowerCase() === 'i') || input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
    }
    // Ctrl+Shift+C for inspect element mode
    else if (input.control && input.shift && input.key.toLowerCase() === 'c') {
      mainWindow.webContents.toggleDevTools();
      mainWindow.webContents.devToolsWebContents?.executeJavaScript('DevToolsAPI.enterInspectElementMode()');
    }
  });

  // Handle OAuth redirects (GitHub, etc.)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    console.log('🔄 Navigation detected:', url);

    // If it's a localhost URL with OAuth tokens, allow navigation
    if (url.startsWith('http://localhost:8081') &&
        (url.includes('access_token') || url.includes('code='))) {
      console.log('✅ OAuth redirect detected, allowing navigation');
      // Let the navigation proceed - React Router will handle it
      return;
    }
  });

  // Handle external OAuth window redirects
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    console.log('🌐 External window open attempt:', url);

    // If OAuth redirect, load in main window instead
    if (url.startsWith('http://localhost:8081') &&
        (url.includes('access_token') || url.includes('code='))) {
      console.log('✅ Loading OAuth redirect in main window');
      mainWindow.loadURL(url);
      return { action: 'deny' };
    }

    // For other external URLs (like GitHub OAuth), open in external browser
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ─── Deep Link Protocol Handler ──────────────────────────────────────
const PROTOCOL = 'crowbyte';

// Register as default protocol handler (crowbyte://)
if (process.defaultApp) {
  // Dev mode — register with path to electron + script
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  // Production — register normally
  app.setAsDefaultProtocolClient(PROTOCOL);
}

// Single instance lock — prevent multiple windows, forward deep links
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, commandLine) => {
    // Windows/Linux: deep link URL is in commandLine args
    const deepUrl = commandLine.find(arg => arg.startsWith(`${PROTOCOL}://`));
    if (deepUrl) handleDeepLink(deepUrl);
    // Focus existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// macOS: open-url event fires when protocol link is clicked
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

function handleDeepLink(url) {
  // Parse crowbyte://route/path?params
  try {
    const parsed = new URL(url);
    const route = parsed.hostname + parsed.pathname; // e.g. "launch", "dashboard", "findings"
    console.log(`[*] Deep link: ${url} → route: ${route}`);

    if (mainWindow) {
      // Navigate to the requested route
      const hash = route === 'launch' ? '#/dashboard' : `#/${route}`;
      mainWindow.webContents.executeJavaScript(`window.location.hash = '${hash}'`);
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  } catch (err) {
    console.error('[!] Deep link parse error:', err.message);
  }
}

// App lifecycle
app.whenReady().then(async () => {
  // Disable GPU cache to prevent cache errors
  app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
  app.commandLine.appendSwitch('disable-gpu-program-cache');

  // Accept self-signed certs for VPS remote control (noVNC over WSS)
  session.defaultSession.setCertificateVerifyProc((_request, callback) => {
    callback(0); // 0 = accept
  });

  console.log('\n' + '='.repeat(70));
  console.log('🔧 CrowByte Terminal - Electron App Starting');
  console.log('='.repeat(70) + '\n');

  // Initialize MCP servers before creating window
  // await mcpClient.initialize(); // Disabled - MCP loads on-demand

  console.log('🪟 Creating application window...\n');
  createWindow();

  // Initialize browser manager (needs app.ready + mainWindow)
  browserMgr.init();
  console.log('🌐 Browser manager initialized (WebContentsView + extensions)');

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    mcpClient.cleanup();
    app.quit();
  }
});

app.on('before-quit', async () => {
  await mcpClient.cleanup();
});

// IPC Handlers

// Initialize Venice.ai with API key
ipcMain.handle('init-venice', async (event, apiKey) => {
  try {
    veniceAI = new VeniceAIService(apiKey);
    return { success: true };
  } catch (error) {
    console.error('Failed to initialize Venice.ai:', error);
    return { success: false, error: error.message };
  }
});

// Start streaming chat (with or without MCP)
ipcMain.handle('stream-chat', async (event, request) => {
  try {
    if (!veniceAI) {
      throw new Error('Venice.ai not initialized');
    }

    const streamGenerator = request.mcpEnabled
      ? veniceAI.createMCPStreamingChat(request)
      : veniceAI.createStreamingChatCompletion(request);

    // Stream chunks back to renderer
    for await (const chunk of streamGenerator) {
      event.sender.send('chat-stream-chunk', chunk);
    }

    event.sender.send('chat-stream-end');
    return { success: true };
  } catch (error) {
    console.error('Stream chat error:', error);
    event.sender.send('chat-stream-error', error.message);
    return { success: false, error: error.message };
  }
});

// Get MCP tools list
ipcMain.handle('get-mcp-tools', async () => {
  try {
    if (!veniceAI) {
      return { success: false, tools: [] };
    }
    const tools = veniceAI.getMCPTools();
    return { success: true, tools };
  } catch (error) {
    console.error('Failed to get MCP tools:', error);
    return { success: false, tools: [], error: error.message };
  }
});

// Get monitoring tools (for CrowByte Security)
ipcMain.handle('get-monitoring-tools', async () => {
  try {
    const tools = mcpClient.getMonitoringTools();
    return { success: true, tools };
  } catch (error) {
    console.error('Failed to get monitoring tools:', error);
    return { success: false, tools: [], error: error.message };
  }
});

// Get MCP status
ipcMain.handle('get-mcp-status', async () => {
  try {
    return {
      success: true,
      initialized: mcpClient.initialized,
      servers: Array.from(mcpClient.servers.keys()),
      toolCount: mcpClient.getVeniceTools().length,
    };
  } catch (error) {
    return {
      success: false,
      initialized: false,
      servers: [],
      toolCount: 0,
    };
  }
});

// Quit application
ipcMain.handle('quit-app', async () => {
  app.quit();
});

// Window controls
ipcMain.handle('minimize-window', async () => {
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('maximize-window', async () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('close-window', async () => {
  if (mainWindow) {
    mainWindow.close();
  }
});

// ============ PC Monitoring IPC Handlers ============

// Generic MCP call handler for pc-monitor tools
ipcMain.handle('mcp-call', async (event, toolName, args) => {
  try {
    const fullToolName = `mcp_monitor_${toolName}`;
    const result = await mcpClient.executeTool(fullToolName, args);
    return { success: true, data: result };
  } catch (error) {
    console.error(`MCP call error (${toolName}):`, error);
    return { success: false, error: error.message };
  }
});

// ============ Filesystem MCP Handlers ============

// List available filesystem tools
ipcMain.handle('list-filesystem-tools', async () => {
  try {
    const filesystemServer = mcpClient.servers.get('filesystem');
    if (!filesystemServer) {
      return { success: false, tools: [], error: 'Filesystem server not connected' };
    }

    const tools = filesystemServer.tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.inputSchema,
    }));

    console.log(`📁 Available filesystem tools: ${tools.map(t => t.name).join(', ')}`);
    return { success: true, tools };
  } catch (error) {
    console.error('Failed to list filesystem tools:', error);
    return { success: false, tools: [], error: error.message };
  }
});

// Call filesystem MCP tools - Access to C:\ and G:\ drives
ipcMain.handle('mcp-filesystem-call', async (event, toolName, args) => {
  try {
    console.log(`📁 Filesystem MCP call: ${toolName}`, args);
    const fullToolName = `mcp_filesystem_${toolName}`;
    const result = await mcpClient.executeTool(fullToolName, args);
    console.log(`✅ Filesystem result:`, result);
    return { success: true, data: result };
  } catch (error) {
    console.error(`❌ Filesystem MCP error (${toolName}):`, error);
    return { success: false, error: error.message };
  }
});

// ============ Terminal IPC Handlers ============

// Get available shell types based on OS
ipcMain.handle('get-available-shells', async () => {
  const { execSync } = require('child_process');
  const shells = [];
  const platform = os.platform();

  if (platform === 'win32') {
    shells.push(
      { id: 'powershell', name: 'PowerShell', path: 'powershell.exe', icon: 'terminal' },
      { id: 'cmd', name: 'Command Prompt', path: 'cmd.exe', icon: 'terminal' },
    );
    try {
      execSync('wsl --list', { encoding: 'utf8', stdio: 'pipe' });
      shells.push({ id: 'wsl', name: 'WSL (Ubuntu)', path: 'wsl.exe', icon: 'terminal' });
    } catch {}
  } else {
    // Linux/macOS shells — tmux first (default)
    try { execSync('which tmux', { stdio: 'pipe' }); shells.push({ id: 'tmux', name: 'tmux', path: '/usr/bin/tmux', icon: 'terminal' }); } catch {}
    shells.push(
      { id: 'zsh', name: 'Zsh', path: '/bin/zsh', icon: 'terminal' },
      { id: 'bash', name: 'Bash', path: '/bin/bash', icon: 'terminal' },
    );

    // Quick-launch presets
    try { execSync('which claude', { stdio: 'pipe' }); shells.push({ id: 'claude', name: 'Claude Code', path: 'claude', icon: 'brain', preset: true }); } catch {}
    try { execSync('which python3', { stdio: 'pipe' }); shells.push({ id: 'python', name: 'Python 3', path: 'python3', icon: 'code', preset: true }); } catch {}
    try { execSync('which node', { stdio: 'pipe' }); shells.push({ id: 'node', name: 'Node.js', path: 'node', icon: 'code', preset: true }); } catch {}
    try { execSync('which msfconsole', { stdio: 'pipe' }); shells.push({ id: 'msf', name: 'Metasploit', path: 'msfconsole', icon: 'swords', preset: true }); } catch {}
    shells.push({ id: 'ssh-vps', name: 'SSH → VPS', path: 'ssh', icon: 'server', preset: true, args: [`root@${process.env.VITE_VPS_IP || 'localhost'}`] });
    try { execSync('which htop', { stdio: 'pipe' }); shells.push({ id: 'htop', name: 'htop', path: 'htop', icon: 'activity', preset: true }); } catch {}
  }

  return shells;
});

// Create a new terminal session — uses node-pty for real PTY (interactive programs work)
ipcMain.handle('create-terminal', async (event, { terminalId, shellType, cwd, cols, rows }) => {
  try {
    const { execSync } = require('child_process');
    const platform = os.platform();
    let shell, args = [];

    // Generate unique tmux session name per terminal tab
    const tmuxSessionName = `cb-${terminalId.slice(-6)}`;

    if (platform === 'win32') {
      switch (shellType) {
        case 'powershell': shell = 'powershell.exe'; args = ['-NoLogo']; break;
        case 'cmd': shell = 'cmd.exe'; args = ['/Q']; break;
        case 'wsl': shell = 'wsl.exe'; args = []; break;
        default: shell = 'cmd.exe'; args = ['/Q'];
      }
    } else {
      switch (shellType) {
        case 'tmux': shell = '/usr/bin/tmux'; args = ['new-session', '-s', tmuxSessionName]; break;
        case 'zsh': shell = '/bin/zsh'; args = ['-i', '-l']; break;
        case 'bash': shell = '/bin/bash'; args = ['-i', '-l']; break;
        case 'sh': shell = '/bin/sh'; args = ['-i']; break;
        case 'claude': shell = execSync('which claude', { encoding: 'utf8' }).trim(); args = []; break;
        case 'python': shell = '/usr/bin/python3'; args = []; break;
        case 'node': shell = execSync('which node', { encoding: 'utf8' }).trim(); args = []; break;
        case 'msf': shell = execSync('which msfconsole', { encoding: 'utf8' }).trim(); args = ['-q']; break;
        case 'ssh-vps': shell = '/usr/bin/ssh'; args = [`root@${process.env.VITE_VPS_IP || 'localhost'}`]; break;
        case 'htop': shell = execSync('which htop', { encoding: 'utf8' }).trim(); args = []; break;
        default: shell = '/usr/bin/tmux'; args = ['new-session', '-s', tmuxSessionName];
      }
    }

    const termCols = cols || 120;
    const termRows = rows || 30;
    const termCwd = cwd || plat.defaultCwd();

    const env = plat.shellEnv();

    let termProcess;

    if (pty) {
      // Real PTY — full interactive support (claude, vim, htop, etc.)
      termProcess = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: termCols,
        rows: termRows,
        cwd: termCwd,
        env,
      });

      termProcess._isPty = true;

      termProcess.onData((data) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('terminal-output', { terminalId, data });
        }
      });

      termProcess.onExit(({ exitCode }) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('terminal-exit', { terminalId, code: exitCode });
        }
        terminalProcesses.delete(terminalId);
      });
    } else {
      // Fallback to child_process.spawn (no resize, limited interactive support)
      termProcess = spawn(shell, args, {
        cwd: termCwd,
        env,
        shell: false,
        windowsHide: true,
      });

      termProcess._isPty = false;

      termProcess.stdout.on('data', (data) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('terminal-output', { terminalId, data: data.toString('utf8') });
        }
      });

      termProcess.stderr.on('data', (data) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('terminal-output', { terminalId, data: data.toString('utf8') });
        }
      });

      termProcess.on('exit', (code) => {
        if (!event.sender.isDestroyed()) {
          event.sender.send('terminal-exit', { terminalId, code });
        }
        terminalProcesses.delete(terminalId);
      });
    }

    terminalProcesses.set(terminalId, termProcess);
    console.log(`🖥️  Terminal ${terminalId}: ${shell} ${args.join(' ')} [PTY: ${!!pty}]`);

    return { success: true, terminalId, isPty: !!pty };
  } catch (error) {
    console.error(`Failed to create terminal ${terminalId}:`, error);
    return { success: false, error: error.message };
  }
});

// Send input to terminal
ipcMain.handle('terminal-input', async (event, { terminalId, data }) => {
  try {
    const proc = terminalProcesses.get(terminalId);
    if (!proc) return { success: false, error: 'Terminal not found' };

    if (proc._isPty) {
      proc.write(data);
    } else {
      proc.stdin.write(data);
    }
    return { success: true };
  } catch (error) {
    console.error(`Failed to write to terminal ${terminalId}:`, error);
    return { success: false, error: error.message };
  }
});

// Resize terminal — real resize with node-pty
ipcMain.handle('terminal-resize', async (event, { terminalId, cols, rows }) => {
  try {
    const proc = terminalProcesses.get(terminalId);
    if (!proc) return { success: false, error: 'Terminal not found' };

    if (proc._isPty && typeof proc.resize === 'function') {
      proc.resize(cols, rows);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Close terminal
ipcMain.handle('close-terminal', async (event, { terminalId }) => {
  try {
    const proc = terminalProcesses.get(terminalId);
    if (!proc) return { success: false, error: 'Terminal not found' };

    if (proc._isPty) {
      proc.kill();
    } else {
      proc.kill('SIGTERM');
    }
    terminalProcesses.delete(terminalId);

    console.log(`🗑️  Closed terminal ${terminalId}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to close terminal ${terminalId}:`, error);
    return { success: false, error: error.message };
  }
});

// Run nmap scan
ipcMain.handle('run-nmap', async (event, { target, scanType }) => {
  return new Promise((resolve) => {
    try {
      // Determine nmap path based on platform
      const nmapPath = process.platform === 'win32'
        ? 'nmap'  // Assume nmap is in PATH on Windows
        : 'nmap';  // Assume installed on Linux/Mac

      // Define scan arguments for different scan types
      const scanArgs = {
        'quick': ['-T4', '-F', target],
        'intense': ['-T4', '-A', '-v', target],
        'stealth': ['-sS', '-T2', target],
        'ping': ['-sn', target],
        'vuln': ['--script', 'vuln', target],
        'full': ['-p-', target],
      };

      const args = scanArgs[scanType] || scanArgs.quick;

      console.log(`🔍 Running nmap scan: ${nmapPath} ${args.join(' ')}`);

      const nmap = spawn(nmapPath, args, {
        windowsHide: true,
        shell: false
      });

      let output = '';
      let errorOutput = '';

      nmap.stdout.on('data', (data) => {
        output += data.toString();
      });

      nmap.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      nmap.on('error', (error) => {
        console.error('Nmap execution error:', error);
        resolve({
          success: false,
          error: `Failed to execute nmap: ${error.message}\n\nMake sure nmap is installed and in your system PATH.`
        });
      });

      nmap.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Nmap scan completed successfully`);
          resolve({ success: true, output: output || 'Scan completed with no output.' });
        } else {
          console.error(`❌ Nmap scan failed with code ${code}`);
          resolve({
            success: false,
            error: errorOutput || `Nmap exited with code ${code}`
          });
        }
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        if (!nmap.killed) {
          nmap.kill();
          resolve({ success: false, error: 'Scan timed out after 5 minutes' });
        }
      }, 300000);

    } catch (error) {
      console.error('Nmap handler error:', error);
      resolve({ success: false, error: error.message });
    }
  });
});

// Execute arbitrary shell command (CyberOps)
ipcMain.handle('execute-command', async (event, command) => {
  return new Promise((resolve) => {
    try {
      console.log(`🔧 Executing command: ${command}`);

      // Parse the command to extract the program and arguments
      // Simple parsing - split on spaces but respect quotes
      const args = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      const program = args.shift();

      if (!program) {
        return resolve('Error: No command provided');
      }

      // Remove quotes from arguments
      const cleanArgs = args.map(arg => arg.replace(/^"|"$/g, ''));

      const childProcess = spawn(program, cleanArgs, {
        shell: true,
        windowsHide: true,
        env: {
          ...process.env,
          FORCE_COLOR: '0', // Disable colors for cleaner output
        },
      });

      let output = '';
      let errorOutput = '';

      childProcess.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(text);
      });

      childProcess.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        console.error(text);
      });

      childProcess.on('error', (error) => {
        console.error('Command execution error:', error);
        const errorMsg = `❌ Failed to execute command: ${error.message}\n\nPossible issues:\n- Command not found or not installed\n- Insufficient permissions\n- Invalid command syntax\n\nCommand attempted: ${command}`;
        resolve(errorMsg);
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Command completed successfully`);
          const result = output || 'Command completed with no output.';
          resolve(result);
        } else {
          console.error(`❌ Command failed with exit code ${code}`);
          const result = `Exit code: ${code}\n\n${errorOutput || output || 'No output'}`;
          resolve(result);
        }
      });

      // Timeout after 10 minutes for long-running commands
      setTimeout(() => {
        if (!childProcess.killed) {
          childProcess.kill();
          resolve('⏱️ Command timed out after 10 minutes');
        }
      }, 600000);

    } catch (error) {
      console.error('Command handler error:', error);
      resolve(`Error: ${error.message}`);
    }
  });
});

// Claude Code CLI streaming handler
// Spawns claude -p with stream-json output, emits events line-by-line to renderer
let claudeProcess = null;

ipcMain.handle('claude-chat', async (event, { prompt, model, sessionId, maxBudget }) => {
  // Kill any existing Claude process
  if (claudeProcess && !claudeProcess.killed) {
    claudeProcess.kill();
    claudeProcess = null;
  }

  return new Promise((resolve) => {
    try {
      const claudePath = '/mnt/bounty/Claude/claude';
      const args = [
        '-p', '--output-format', 'stream-json', '--verbose',
        '--dangerously-skip-permissions',
        '--model', model || 'sonnet',
      ];
      if (maxBudget) {
        args.push('--max-budget-usd', String(maxBudget));
      }
      if (sessionId) {
        args.push('--resume', sessionId);
      }

      console.log(`🤖 Claude CLI: claude ${args.join(' ')}`);

      const env = { ...process.env };
      delete env.CLAUDECODE; // Prevent nested session detection

      claudeProcess = spawn(claudePath, args, {
        shell: false,
        windowsHide: true,
        cwd: '/mnt/bounty/Claude/.env-unfiltered',
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // Send the prompt to stdin
      claudeProcess.stdin.write(prompt + '\n');
      claudeProcess.stdin.end();

      let buffer = '';

      claudeProcess.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            // Send each NDJSON event to renderer
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('claude-stream-event', parsed);
            }
          } catch (e) {
            // Not valid JSON, skip
          }
        }
      });

      claudeProcess.stderr.on('data', (data) => {
        console.error('Claude stderr:', data.toString());
      });

      claudeProcess.on('error', (error) => {
        console.error('Claude process error:', error);
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('claude-stream-error', error.message);
        }
        resolve({ ok: false, error: error.message });
      });

      claudeProcess.on('close', (code) => {
        // Flush remaining buffer
        if (buffer.trim()) {
          try {
            const parsed = JSON.parse(buffer);
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('claude-stream-event', parsed);
            }
          } catch (e) {}
        }

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('claude-stream-end', { code });
        }
        claudeProcess = null;
        resolve({ ok: code === 0, exitCode: code });
      });

      // 10 minute timeout
      setTimeout(() => {
        if (claudeProcess && !claudeProcess.killed) {
          claudeProcess.kill();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('claude-stream-error', 'Claude CLI timed out after 10 minutes');
          }
        }
      }, 600000);

    } catch (error) {
      console.error('Claude handler error:', error);
      resolve({ ok: false, error: error.message });
    }
  });
});

ipcMain.handle('claude-stop', async () => {
  if (claudeProcess && !claudeProcess.killed) {
    claudeProcess.kill();
    claudeProcess = null;
    return { ok: true };
  }
  return { ok: false, error: 'No active Claude process' };
});

// Run system command (for DNS detection, network diagnostics)
ipcMain.handle('run-command', async (event, command, args = []) => {
  return new Promise((resolve) => {
    try {
      console.log(`🔧 Running command: ${command} ${args.join(' ')}`);

      const childProcess = spawn(command, args, {
        shell: true,
        windowsHide: true,
        env: {
          ...process.env,
          FORCE_COLOR: '0',
        },
      });

      let output = '';
      let errorOutput = '';

      childProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      childProcess.on('error', (error) => {
        console.error('Command execution error:', error);
        resolve({
          success: false,
          error: error.message,
          output: '',
        });
      });

      childProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Command completed successfully: ${command}`);
          resolve({
            success: true,
            output: output.trim(),
            error: null,
          });
        } else {
          console.error(`❌ Command failed with exit code ${code}`);
          resolve({
            success: false,
            output: output.trim(),
            error: errorOutput.trim() || `Exit code: ${code}`,
          });
        }
      });

      // Timeout after 30 seconds for DNS/network commands
      setTimeout(() => {
        if (!childProcess.killed) {
          childProcess.kill();
          resolve({
            success: false,
            output: '',
            error: 'Command timed out after 30 seconds',
          });
        }
      }, 30000);

    } catch (error) {
      console.error('Command handler error:', error);
      resolve({
        success: false,
        error: error.message,
        output: '',
      });
    }
  });
});

// Tor check proxy (avoid CORS)
ipcMain.handle('check-tor', async () => {
  try {
    const https = require('https');

    return new Promise((resolve) => {
      const req = https.request('https://check.torproject.org/api/ip', {
        method: 'GET',
        timeout: 5000,
      }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ success: true, data: parsed });
          } catch (error) {
            resolve({ success: false, error: 'Invalid JSON response' });
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ Tor check error:', error.message);
        resolve({ success: false, error: error.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Request timed out' });
      });

      req.end();
    });
  } catch (error) {
    console.error('❌ Tor check handler error:', error);
    return { success: false, error: error.message };
  }
});

// NVD CVE API proxy (avoid CORS and rate limiting)
ipcMain.handle('fetch-cves', async (event, year) => {
  try {
    const https = require('https');

    // Calculate last 30 days instead of full year (more reliable)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // NVD API v2.0 requires ISO 8601 format without milliseconds
    const startDateStr = startDate.toISOString().split('.')[0] + 'Z';
    const endDateStr = endDate.toISOString().split('.')[0] + 'Z';

    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${startDateStr}&pubEndDate=${endDateStr}&resultsPerPage=10`;

    console.log(`🔍 Fetching recent CVEs from NVD (last 30 days)...`);
    console.log(`📅 Date range: ${startDateStr} to ${endDateStr}`);

    return new Promise((resolve) => {
      const req = https.request(url, {
        method: 'GET',
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) CrowByt/1.0',
          'Accept': 'application/json',
        },
      }, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode === 200) {
            try {
              const parsed = JSON.parse(data);
              console.log(`✅ Fetched ${parsed.vulnerabilities?.length || 0} CVEs from NVD`);
              resolve({ success: true, data: parsed });
            } catch (error) {
              console.error('❌ Failed to parse CVE JSON:', error);
              console.error('Response data:', data.substring(0, 200));
              resolve({ success: false, error: 'Invalid JSON response' });
            }
          } else if (res.statusCode === 403) {
            console.error('❌ NVD API rate limit exceeded (403)');
            resolve({ success: false, error: 'Rate limit exceeded' });
          } else if (res.statusCode === 404) {
            console.error('❌ NVD API endpoint not found (404) - API may have changed');
            console.error('Response:', data);
            resolve({ success: false, error: 'API endpoint not found' });
          } else {
            console.error(`❌ NVD API returned status ${res.statusCode}`);
            console.error('Response:', data);
            resolve({ success: false, error: `HTTP ${res.statusCode}` });
          }
        });
      });

      req.on('error', (error) => {
        console.error('❌ CVE fetch error:', error.message);
        resolve({ success: false, error: error.message });
      });

      req.on('timeout', () => {
        req.destroy();
        console.error('❌ CVE fetch timed out after 15 seconds');
        resolve({ success: false, error: 'Request timed out' });
      });

      req.end();
    });
  } catch (error) {
    console.error('❌ CVE fetch handler error:', error);
    return { success: false, error: error.message };
  }
});

// ============================================================================
// CREDENTIAL STORAGE - Secure storage for "Remember Me" functionality
// ============================================================================

// Store encrypted credentials for a device
ipcMain.handle('store-credentials', async (event, { deviceId, email, encryptedPassword }) => {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('⚠️  Encryption not available on this system');
      return { success: false, error: 'Encryption not available' };
    }

    // Double encrypt: Browser encrypts, then Electron encrypts
    const buffer = safeStorage.encryptString(encryptedPassword);
    const base64 = buffer.toString('base64');

    // Store in localStorage-like structure (will use Electron's storage)
    const credentials = {
      deviceId,
      email,
      encryptedPassword: base64,
      timestamp: Date.now(),
    };

    // Store in app's user data directory
    const fs = require('fs');
    const storePath = path.join(app.getPath('userData'), 'credentials.json');

    let allCredentials = {};
    if (fs.existsSync(storePath)) {
      const data = fs.readFileSync(storePath, 'utf8');
      allCredentials = JSON.parse(data);
    }

    allCredentials[deviceId] = credentials;
    fs.writeFileSync(storePath, JSON.stringify(allCredentials, null, 2));

    console.log(`✅ Stored credentials for device: ${deviceId.substring(0, 8)}...`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to store credentials:', error);
    return { success: false, error: error.message };
  }
});

// Retrieve stored credentials for a device
ipcMain.handle('get-credentials', async (event, deviceId) => {
  try {
    const fs = require('fs');
    const storePath = path.join(app.getPath('userData'), 'credentials.json');

    if (!fs.existsSync(storePath)) {
      return { success: false, error: 'No stored credentials' };
    }

    const data = fs.readFileSync(storePath, 'utf8');
    const allCredentials = JSON.parse(data);

    const credentials = allCredentials[deviceId];
    if (!credentials) {
      return { success: false, error: 'No credentials for this device' };
    }

    // Decrypt the password
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('⚠️  Encryption not available on this system');
      return { success: false, error: 'Encryption not available' };
    }

    const buffer = Buffer.from(credentials.encryptedPassword, 'base64');
    const decryptedPassword = safeStorage.decryptString(buffer);

    console.log(`✅ Retrieved credentials for device: ${deviceId.substring(0, 8)}...`);
    return {
      success: true,
      credentials: {
        email: credentials.email,
        encryptedPassword: decryptedPassword, // Still encrypted by browser
        timestamp: credentials.timestamp,
      },
    };
  } catch (error) {
    console.error('❌ Failed to retrieve credentials:', error);
    return { success: false, error: error.message };
  }
});

// Delete stored credentials for a device
ipcMain.handle('delete-credentials', async (event, deviceId) => {
  try {
    const fs = require('fs');
    const storePath = path.join(app.getPath('userData'), 'credentials.json');

    if (!fs.existsSync(storePath)) {
      return { success: true }; // Nothing to delete
    }

    const data = fs.readFileSync(storePath, 'utf8');
    const allCredentials = JSON.parse(data);

    delete allCredentials[deviceId];
    fs.writeFileSync(storePath, JSON.stringify(allCredentials, null, 2));

    console.log(`🗑️  Deleted credentials for device: ${deviceId.substring(0, 8)}...`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to delete credentials:', error);
    return { success: false, error: error.message };
  }
});

// Check if credentials exist for a device
ipcMain.handle('has-credentials', async (event, deviceId) => {
  try {
    const fs = require('fs');
    const storePath = path.join(app.getPath('userData'), 'credentials.json');

    if (!fs.existsSync(storePath)) {
      return { success: true, hasCredentials: false };
    }

    const data = fs.readFileSync(storePath, 'utf8');
    const allCredentials = JSON.parse(data);

    return { success: true, hasCredentials: !!allCredentials[deviceId] };
  } catch (error) {
    console.error('❌ Failed to check credentials:', error);
    return { success: false, error: error.message };
  }
});

// ============================================================================
// APP SETTINGS - User preferences (intro animation, etc.)
// ============================================================================

// Get app settings
ipcMain.handle('get-app-settings', async () => {
  try {
    const fs = require('fs');
    const settingsPath = path.join(app.getPath('userData'), 'app-settings.json');

    if (!fs.existsSync(settingsPath)) {
      // Default settings
      return {
        success: true,
        settings: {
          showIntroAnimation: true,
          rememberMe: false,
        },
      };
    }

    const data = fs.readFileSync(settingsPath, 'utf8');
    const settings = JSON.parse(data);

    return { success: true, settings };
  } catch (error) {
    console.error('❌ Failed to get app settings:', error);
    return { success: false, error: error.message };
  }
});

// Save app settings
ipcMain.handle('save-app-settings', async (event, settings) => {
  try {
    const fs = require('fs');
    const settingsPath = path.join(app.getPath('userData'), 'app-settings.json');

    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));

    console.log('✅ Saved app settings');
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to save app settings:', error);
    return { success: false, error: error.message };
  }
});

// ============================================================================
// SYSTEM METRICS - Real-time PC monitoring for Fleet Management
// ============================================================================

ipcMain.handle('get-system-metrics', async () => {
  try {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    // Calculate CPU usage
    let totalIdle = 0;
    let totalTick = 0;
    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    }
    const cpuUsage = 100 - Math.round((totalIdle / totalTick) * 100);

    // Get disk usage
    let diskUsage = 0;
    let diskTotal = 0;
    let diskUsed = 0;

    try {
      const { execSync } = require('child_process');
      if (process.platform === 'win32') {
        const output = execSync('wmic logicaldisk where "DeviceID=\'C:\'" get Size,FreeSpace /format:csv', {
          encoding: 'utf8', windowsHide: true,
        });
        const lines = output.trim().split('\n').filter(l => l.includes(','));
        if (lines.length > 0) {
          const parts = lines[lines.length - 1].split(',');
          if (parts.length >= 3) {
            const freeSpace = parseInt(parts[1]) || 0;
            const totalSize = parseInt(parts[2]) || 0;
            diskTotal = totalSize / (1024 * 1024 * 1024);
            diskUsed = (totalSize - freeSpace) / (1024 * 1024 * 1024);
            diskUsage = Math.round((diskUsed / diskTotal) * 100);
          }
        }
      } else {
        // Linux / macOS
        const output = execSync('df -B1 / | tail -1', { encoding: 'utf8', timeout: 3000 });
        const parts = output.trim().split(/\s+/);
        if (parts.length >= 5) {
          diskTotal = parseInt(parts[1]) / (1024 * 1024 * 1024);
          diskUsed = parseInt(parts[2]) / (1024 * 1024 * 1024);
          diskUsage = parseInt(parts[4].replace('%', '')) || 0;
        }
      }
    } catch (e) {
      console.error('Failed to get disk info:', e.message);
    }

    // Get GPU metrics via nvidia-smi (if available)
    let gpuInfo = null;
    try {
      const { execSync } = require('child_process');
      const gpuOutput = execSync(
        'nvidia-smi --query-gpu=name,temperature.gpu,utilization.gpu,memory.used,memory.total,power.draw,power.limit --format=csv,noheader,nounits 2>/dev/null',
        { encoding: 'utf8', timeout: 3000 }
      );
      const parts = gpuOutput.trim().split(',').map(s => s.trim());
      if (parts.length >= 5) {
        gpuInfo = {
          name: parts[0],
          temperature: parseInt(parts[1]) || 0,
          utilization: parseInt(parts[2]) || 0,
          memoryUsed: parseInt(parts[3]) || 0,
          memoryTotal: parseInt(parts[4]) || 0,
          powerDraw: parseFloat(parts[5]) || 0,
          powerLimit: parseFloat(parts[6]) || 0,
        };
      }
    } catch (e) {
      // No NVIDIA GPU or nvidia-smi not available
    }

    // Get hostname and network info
    const networkInterfaces = os.networkInterfaces();
    let ipAddress = '127.0.0.1';

    for (const name of Object.keys(networkInterfaces)) {
      for (const net of networkInterfaces[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          ipAddress = net.address;
          break;
        }
      }
    }

    const metrics = {
      hostname: os.hostname(),
      platform: os.platform() === 'win32' ? 'Windows' : os.platform() === 'darwin' ? 'macOS' : 'Linux',
      osVersion: os.release(),
      architecture: os.arch(),
      cpuModel: cpus[0]?.model || 'Unknown CPU',
      cpuCores: cpus.length,
      cpuUsage: cpuUsage,
      memoryUsage: Math.round((usedMemory / totalMemory) * 100),
      memoryTotal: Math.round(totalMemory / (1024 * 1024 * 1024) * 100) / 100,
      memoryUsed: Math.round(usedMemory / (1024 * 1024 * 1024) * 100) / 100,
      diskUsage: diskUsage,
      diskTotal: Math.round(diskTotal * 100) / 100,
      diskUsed: Math.round(diskUsed * 100) / 100,
      uptime: os.uptime(),
      ipAddress: ipAddress,
      gpu: gpuInfo,
    };

    return { success: true, metrics };
  } catch (error) {
    console.error('Failed to get system metrics:', error);
    return { success: false, error: error.message };
  }
});

// Open/Toggle Developer Tools
ipcMain.handle('open-dev-tools', async (event) => {
  try {
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (focusedWindow) {
      if (focusedWindow.webContents.isDevToolsOpened()) {
        focusedWindow.webContents.closeDevTools();
        console.log('🔧 DevTools closed');
      } else {
        focusedWindow.webContents.openDevTools();
        console.log('🔧 DevTools opened');
      }
    }
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to toggle DevTools:', error);
    return { success: false, error: error.message };
  }
});

// Cleanup terminals on app quit
app.on('before-quit', () => {
  terminalProcesses.forEach((ptyProcess, terminalId) => {
    try {
      ptyProcess.kill();
      console.log(`🗑️  Killed terminal ${terminalId} on app quit`);
    } catch (e) {
      console.error(`Failed to kill terminal ${terminalId}:`, e);
    }
  });
  terminalProcesses.clear();
});

// ══════════════════════════════════════════════════════════════════
// Browser Panel — WebContentsView-based Real Browser
// Each tab is a native WebContentsView with full Chrome engine +
// extension support. No <webview> tags. Main process owns everything.
// API: http://127.0.0.1:19191/
// ══════════════════════════════════════════════════════════════════

const http = require('http');

class BrowserManager {
  constructor() {
    this.tabs = new Map();       // tabId → { view, url, title, favicon, isLoading, isSecure, canGoBack, canGoForward }
    this.activeTabId = null;
    this.bounds = null;          // { x, y, width, height } — content area in window coords
    this.isVisible = false;
    this.tabCounter = 0;
    this.browserSession = null;
    // Session setup deferred until app is ready
  }

  init() {
    this._setupSession();
  }

  _setupSession() {
    // Dedicated session for browser panel — persists cookies, storage, etc.
    this.browserSession = session.fromPartition('persist:browser-panel');
    // Strip CSP + X-Frame-Options so sites load properly
    this.browserSession.webRequest.onHeadersReceived((details, callback) => {
      const headers = { ...details.responseHeaders };
      delete headers['content-security-policy'];
      delete headers['Content-Security-Policy'];
      delete headers['x-frame-options'];
      delete headers['X-Frame-Options'];
      callback({ responseHeaders: headers });
    });
    // Set a standard Chrome user agent
    this.browserSession.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
    );
    // Load extensions from extensions directory
    this._loadExtensions();
  }

  async _loadExtensions() {
    const fs = require('fs');
    const extDir = path.join(__dirname, '..', 'extensions');
    if (!fs.existsSync(extDir)) {
      fs.mkdirSync(extDir, { recursive: true });
      console.log('📁 Created extensions directory:', extDir);
      return;
    }
    try {
      const entries = fs.readdirSync(extDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const extPath = path.join(extDir, entry.name);
          const manifest = path.join(extPath, 'manifest.json');
          if (fs.existsSync(manifest)) {
            try {
              await this.browserSession.loadExtension(extPath);
              console.log(`🧩 Loaded extension: ${entry.name}`);
            } catch (err) {
              console.warn(`⚠️  Failed to load extension ${entry.name}:`, err.message);
            }
          }
        }
      }
    } catch (err) {
      console.warn('⚠️  Extension loading error:', err.message);
    }
  }

  _nextTabId() {
    return `tab-${++this.tabCounter}-${Date.now()}`;
  }

  _notifyRenderer(event, data) {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('browser-mgr:event', { event, ...data });
    }
  }

  _getTabState(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) return null;
    return {
      id: tabId,
      url: tab.url,
      title: tab.title,
      favicon: tab.favicon,
      isLoading: tab.isLoading,
      isSecure: tab.isSecure,
      canGoBack: tab.canGoBack,
      canGoForward: tab.canGoForward,
    };
  }

  getAllTabStates() {
    const states = [];
    for (const [id] of this.tabs) {
      states.push(this._getTabState(id));
    }
    return states;
  }

  createTab(url = 'https://www.google.com', makeActive = true) {
    const tabId = this._nextTabId();

    const view = new WebContentsView({
      webPreferences: {
        session: this.browserSession,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
      },
    });

    const wc = view.webContents;
    const tab = {
      view,
      url,
      title: '',
      favicon: '',
      isLoading: false,
      isSecure: url.startsWith('https://'),
      canGoBack: false,
      canGoForward: false,
    };
    this.tabs.set(tabId, tab);

    // Wire up events
    wc.on('did-start-loading', () => {
      tab.isLoading = true;
      this._notifyRenderer('tab-updated', { tab: this._getTabState(tabId) });
    });

    wc.on('did-stop-loading', () => {
      tab.isLoading = false;
      tab.url = wc.getURL();
      tab.title = wc.getTitle();
      tab.isSecure = tab.url.startsWith('https://');
      try { tab.canGoBack = wc.canGoBack(); } catch {}
      try { tab.canGoForward = wc.canGoForward(); } catch {}
      this._notifyRenderer('tab-updated', { tab: this._getTabState(tabId) });
    });

    wc.on('page-title-updated', (e, title) => {
      tab.title = title;
      this._notifyRenderer('tab-updated', { tab: this._getTabState(tabId) });
    });

    wc.on('page-favicon-updated', (e, favicons) => {
      if (favicons?.length > 0) {
        tab.favicon = favicons[0];
        this._notifyRenderer('tab-updated', { tab: this._getTabState(tabId) });
      }
    });

    wc.on('did-navigate', (e, navUrl) => {
      tab.url = navUrl;
      tab.isSecure = navUrl.startsWith('https://');
      try { tab.canGoBack = wc.canGoBack(); } catch {}
      try { tab.canGoForward = wc.canGoForward(); } catch {}
      this._notifyRenderer('tab-updated', { tab: this._getTabState(tabId) });
    });

    wc.on('did-navigate-in-page', (e, navUrl) => {
      tab.url = navUrl;
      try { tab.canGoBack = wc.canGoBack(); } catch {}
      try { tab.canGoForward = wc.canGoForward(); } catch {}
      this._notifyRenderer('tab-updated', { tab: this._getTabState(tabId) });
    });

    // New window → new tab
    wc.setWindowOpenHandler(({ url: newUrl }) => {
      if (newUrl && newUrl !== 'about:blank') {
        this.createTab(newUrl, true);
      }
      return { action: 'deny' };
    });

    // Add to main window (hidden until switched to)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.contentView.addChildView(view);
      if (this.bounds) {
        view.setBounds(this.bounds);
      }
      view.setVisible(false);
    }

    // Navigate
    wc.loadURL(url).catch(() => {});

    if (makeActive) {
      this.switchTab(tabId);
    }

    this._notifyRenderer('tab-created', { tab: this._getTabState(tabId), activeTabId: this.activeTabId });
    return tabId;
  }

  closeTab(tabId) {
    const tab = this.tabs.get(tabId);
    if (!tab) return;

    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.contentView.removeChildView(tab.view);
    }
    tab.view.webContents.close();
    this.tabs.delete(tabId);

    // If closing active tab, switch to another
    if (tabId === this.activeTabId) {
      const remaining = [...this.tabs.keys()];
      if (remaining.length > 0) {
        this.switchTab(remaining[remaining.length - 1]);
      } else {
        this.activeTabId = null;
      }
    }

    this._notifyRenderer('tab-closed', { tabId, activeTabId: this.activeTabId });
  }

  switchTab(tabId) {
    if (!this.tabs.has(tabId)) return;
    // Hide current
    if (this.activeTabId && this.tabs.has(this.activeTabId)) {
      this.tabs.get(this.activeTabId).view.setVisible(false);
    }
    this.activeTabId = tabId;
    const tab = this.tabs.get(tabId);
    tab.view.setVisible(this.isVisible);
    if (this.bounds) tab.view.setBounds(this.bounds);
    this._notifyRenderer('tab-switched', { activeTabId: tabId, tab: this._getTabState(tabId) });
  }

  setBounds(bounds) {
    this.bounds = bounds;
    // Update active tab view bounds
    if (this.activeTabId && this.tabs.has(this.activeTabId)) {
      this.tabs.get(this.activeTabId).view.setBounds(bounds);
    }
  }

  setVisible(visible) {
    this.isVisible = visible;
    if (this.activeTabId && this.tabs.has(this.activeTabId)) {
      this.tabs.get(this.activeTabId).view.setVisible(visible);
    }
    // Hide all non-active tabs
    for (const [id, tab] of this.tabs) {
      if (id !== this.activeTabId) {
        tab.view.setVisible(false);
      }
    }
  }

  navigate(url, tabId) {
    const id = tabId || this.activeTabId;
    const tab = this.tabs.get(id);
    if (!tab) return;
    // Normalize URL
    let navUrl = url.trim();
    if (!navUrl.match(/^https?:\/\//i) && !navUrl.startsWith('about:')) {
      if (navUrl.includes('.') && !navUrl.includes(' ')) {
        navUrl = 'https://' + navUrl;
      } else {
        navUrl = `https://www.google.com/search?q=${encodeURIComponent(navUrl)}`;
      }
    }
    tab.view.webContents.loadURL(navUrl).catch(() => {});
  }

  goBack(tabId) {
    const id = tabId || this.activeTabId;
    const tab = this.tabs.get(id);
    if (tab) try { tab.view.webContents.goBack(); } catch {}
  }

  goForward(tabId) {
    const id = tabId || this.activeTabId;
    const tab = this.tabs.get(id);
    if (tab) try { tab.view.webContents.goForward(); } catch {}
  }

  reload(tabId) {
    const id = tabId || this.activeTabId;
    const tab = this.tabs.get(id);
    if (tab) try { tab.view.webContents.reload(); } catch {}
  }

  stop(tabId) {
    const id = tabId || this.activeTabId;
    const tab = this.tabs.get(id);
    if (tab) try { tab.view.webContents.stop(); } catch {}
  }

  getActiveWebContents() {
    if (!this.activeTabId) return null;
    const tab = this.tabs.get(this.activeTabId);
    return tab ? tab.view.webContents : null;
  }

  async execJS(code, tabId) {
    const id = tabId || this.activeTabId;
    const tab = this.tabs.get(id);
    if (!tab) return null;
    return tab.view.webContents.executeJavaScript(code);
  }

  openDevTools(tabId) {
    const id = tabId || this.activeTabId;
    const tab = this.tabs.get(id);
    if (tab) tab.view.webContents.openDevTools({ mode: 'detach' });
  }

  destroyAll() {
    for (const [id, tab] of this.tabs) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.contentView.removeChildView(tab.view);
      }
      try { tab.view.webContents.close(); } catch {}
    }
    this.tabs.clear();
    this.activeTabId = null;
  }
}

// Global browser manager instance
const browserMgr = new BrowserManager();

// ── IPC Handlers ──

ipcMain.handle('browser-mgr:create-tab', (e, { url, makeActive } = {}) => {
  const tabId = browserMgr.createTab(url, makeActive !== false);
  return { tabId, tabs: browserMgr.getAllTabStates(), activeTabId: browserMgr.activeTabId };
});

ipcMain.handle('browser-mgr:close-tab', (e, { tabId }) => {
  browserMgr.closeTab(tabId);
  return { tabs: browserMgr.getAllTabStates(), activeTabId: browserMgr.activeTabId };
});

ipcMain.handle('browser-mgr:switch-tab', (e, { tabId }) => {
  browserMgr.switchTab(tabId);
  return { activeTabId: browserMgr.activeTabId, tab: browserMgr._getTabState(tabId) };
});

ipcMain.handle('browser-mgr:navigate', (e, { url, tabId }) => {
  browserMgr.navigate(url, tabId);
  return { ok: true };
});

ipcMain.handle('browser-mgr:back', () => { browserMgr.goBack(); return { ok: true }; });
ipcMain.handle('browser-mgr:forward', () => { browserMgr.goForward(); return { ok: true }; });
ipcMain.handle('browser-mgr:reload', () => { browserMgr.reload(); return { ok: true }; });
ipcMain.handle('browser-mgr:stop', () => { browserMgr.stop(); return { ok: true }; });

ipcMain.handle('browser-mgr:set-bounds', (e, bounds) => {
  browserMgr.setBounds(bounds);
  return { ok: true };
});

ipcMain.handle('browser-mgr:set-visible', (e, { visible }) => {
  browserMgr.setVisible(visible);
  return { ok: true };
});

ipcMain.handle('browser-mgr:get-state', () => {
  return {
    tabs: browserMgr.getAllTabStates(),
    activeTabId: browserMgr.activeTabId,
    isVisible: browserMgr.isVisible,
  };
});

ipcMain.handle('browser-mgr:exec-js', async (e, { code, tabId }) => {
  try {
    const result = await browserMgr.execJS(code, tabId);
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('browser-mgr:devtools', (e, { tabId } = {}) => {
  browserMgr.openDevTools(tabId);
  return { ok: true };
});

ipcMain.handle('browser-mgr:get-url', (e, { tabId } = {}) => {
  const id = tabId || browserMgr.activeTabId;
  const tab = browserMgr.tabs.get(id);
  if (!tab) return { data: '' };
  return { data: tab.view.webContents.getURL() };
});

ipcMain.handle('browser-mgr:get-title', (e, { tabId } = {}) => {
  const id = tabId || browserMgr.activeTabId;
  const tab = browserMgr.tabs.get(id);
  if (!tab) return { data: '' };
  return { data: tab.view.webContents.getTitle() };
});

// ── HTTP Control Server (browser-ctl / Claude terminal) ──

const browserServer = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(200);
    return res.end();
  }

  const reqUrl = new URL(req.url, 'http://127.0.0.1:19191');
  const action = reqUrl.pathname.replace(/^\//, '').replace(/\/$/, '');
  const wc = browserMgr.getActiveWebContents();

  // GET requests
  if (req.method === 'GET') {
    try {
      let result;
      switch (action) {
        case 'status':
          result = { isOpen: browserMgr.isVisible, tabs: browserMgr.tabs.size, activeTab: browserMgr.activeTabId };
          break;
        case 'url':
          result = wc ? wc.getURL() : '';
          break;
        case 'title':
          result = wc ? wc.getTitle() : '';
          break;
        case 'text':
          result = wc ? await wc.executeJavaScript('document.body.innerText') : '';
          break;
        case 'cookies':
          result = wc ? await wc.executeJavaScript('document.cookie') : '';
          break;
        case 'screenshot':
          if (wc) {
            const img = await wc.capturePage();
            result = img.toDataURL();
          } else {
            result = 'no-active-tab';
          }
          break;
        case 'tabs':
          result = browserMgr.getAllTabStates();
          break;
        default:
          res.writeHead(404);
          return res.end(JSON.stringify({ error: `Unknown: ${action}` }));
      }
      res.writeHead(200);
      return res.end(JSON.stringify({ data: result }));
    } catch (error) {
      res.writeHead(500);
      return res.end(JSON.stringify({ error: error.message }));
    }
  }

  // POST requests
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const params = body ? JSON.parse(body) : {};
        let result;

        switch (action) {
          case 'navigate':
            browserMgr.navigate(params.url);
            result = { ok: true };
            break;
          case 'open':
            browserMgr.setVisible(true);
            if (params.url) browserMgr.navigate(params.url);
            if (mainWindow) mainWindow.webContents.send('browser-mgr:event', { event: 'visibility-changed', isVisible: true });
            result = { ok: true };
            break;
          case 'close':
            browserMgr.setVisible(false);
            if (mainWindow) mainWindow.webContents.send('browser-mgr:event', { event: 'visibility-changed', isVisible: false });
            result = { ok: true };
            break;
          case 'new-tab':
            result = { tabId: browserMgr.createTab(params.url) };
            break;
          case 'close-tab':
            browserMgr.closeTab(params.tabId || browserMgr.activeTabId);
            result = { ok: true };
            break;
          case 'back':
            browserMgr.goBack();
            result = { ok: true };
            break;
          case 'forward':
            browserMgr.goForward();
            result = { ok: true };
            break;
          case 'reload':
            browserMgr.reload();
            result = { ok: true };
            break;
          case 'exec-js':
            result = wc ? await wc.executeJavaScript(params.code) : null;
            break;
          case 'get-text':
            result = wc ? await wc.executeJavaScript('document.body.innerText') : '';
            break;
          case 'get-html': {
            const sel = params.selector || 'html';
            result = wc ? await wc.executeJavaScript(
              `(document.querySelector(${JSON.stringify(sel)}) || document.documentElement).outerHTML`
            ) : '';
            break;
          }
          case 'click':
            result = wc ? await wc.executeJavaScript(
              `(() => { const el = document.querySelector(${JSON.stringify(params.selector)}); if(el){el.click(); return true;} return false; })()`
            ) : false;
            break;
          case 'fill':
            result = wc ? await wc.executeJavaScript(
              `(() => { const el = document.querySelector(${JSON.stringify(params.selector)}); if(el){el.value=${JSON.stringify(params.value)}; el.dispatchEvent(new Event('input',{bubbles:true})); el.dispatchEvent(new Event('change',{bubbles:true})); return true;} return false; })()`
            ) : false;
            break;
          case 'wait-for': {
            const timeout = params.timeout || 5000;
            result = wc ? await wc.executeJavaScript(
              `new Promise((resolve) => { const sel=${JSON.stringify(params.selector)}; if(document.querySelector(sel)){resolve(true);return;} const obs=new MutationObserver(()=>{if(document.querySelector(sel)){obs.disconnect();resolve(true);}}); obs.observe(document.body,{childList:true,subtree:true}); setTimeout(()=>{obs.disconnect();resolve(false);},${timeout}); })`
            ) : false;
            break;
          }
          default:
            res.writeHead(404);
            return res.end(JSON.stringify({ error: `Unknown: ${action}` }));
        }

        res.writeHead(200);
        res.end(JSON.stringify({ data: result }));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  res.writeHead(405);
  res.end(JSON.stringify({ error: 'Method not allowed' }));
});

browserServer.listen(19191, '127.0.0.1', () => {
  console.log('🌐 Browser Panel API listening on http://127.0.0.1:19191');
});

browserServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn('⚠️  Browser Panel API port 19191 already in use');
  } else {
    console.error('❌ Browser Panel API error:', err);
  }
});

console.log('🚀 Electron main process ready');
