/**
 * Global TypeScript declarations for Electron API
 */

  success: boolean;
  error?: string;
}

interface StreamChatRequest {
  messages: Array<{ role: string; content: string }>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface StreamChatResponse {
  success: boolean;
  error?: string;
}

interface MCPTool {
  name: string;
  description: string;
  parameters?: Record<string, unknown>;
}

interface MCPStatus {
  connected: boolean;
  tools?: MCPTool[];
  error?: string;
}

interface ShellType {
  id: string;
  name: string;
  path: string;
}

interface TerminalOutput {
  terminalId: string;
  data: string;
}

interface TerminalExit {
  terminalId: string;
  code: number;
}

interface MonitoringToolsResponse {
  success: boolean;
  tools: Array<{
    type: string;
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
  error?: string;
}

interface SystemMetrics {
  hostname: string;
  platform: string;
  osVersion: string;
  architecture: string;
  cpuModel: string;
  cpuCores: number;
  cpuUsage: number;
  memoryUsage: number;
  memoryTotal: number;
  memoryUsed: number;
  diskUsage: number;
  diskTotal: number;
  diskUsed: number;
  uptime: number;
  ipAddress: string;
}

interface SystemMetricsResponse {
  success: boolean;
  metrics?: SystemMetrics;
  error?: string;
}

interface ElectronAPI {
  streamChat: (request: StreamChatRequest) => Promise<StreamChatResponse>;
  onStreamChunk: (callback: (chunk: string) => void) => void;
  onStreamEnd: (callback: () => void) => void;
  onStreamError: (callback: (error: string) => void) => void;
  removeStreamListeners: () => void;
  getMCPTools: () => Promise<MCPTool[]>;
  getMonitoringTools: () => Promise<MonitoringToolsResponse>;
  getMCPStatus: () => Promise<MCPStatus>;
  mcpCall: (toolName: string, args: Record<string, unknown>) => Promise<{ success: boolean; data?: unknown; error?: string }>;
  quitApp: () => Promise<void>;
  minimizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  // Terminal methods
  getAvailableShells: () => Promise<ShellType[]>;
  createTerminal: (options: { terminalId: string; shellType: string; cwd?: string; cols?: number; rows?: number }) => Promise<{ success: boolean; terminalId?: string; error?: string }>;
  terminalInput: (options: { terminalId: string; data: string }) => Promise<{ success: boolean; error?: string }>;
  terminalResize: (options: { terminalId: string; cols: number; rows: number }) => Promise<{ success: boolean; error?: string }>;
  closeTerminal: (options: { terminalId: string }) => Promise<{ success: boolean; error?: string }>;
  onTerminalOutput: (callback: (output: TerminalOutput) => void) => void;
  onTerminalExit: (callback: (exit: TerminalExit) => void) => void;
  removeTerminalListeners: () => void;
  // Credential storage for "Remember Me"
  storeCredentials: (data: { deviceId: string; email: string; encryptedPassword: string }) => Promise<{ success: boolean; error?: string }>;
  getCredentials: (deviceId: string) => Promise<{ success: boolean; credentials?: { email: string; encryptedPassword: string; timestamp: number }; error?: string }>;
  deleteCredentials: (deviceId: string) => Promise<{ success: boolean; error?: string }>;
  hasCredentials: (deviceId: string) => Promise<{ success: boolean; hasCredentials?: boolean; error?: string }>;
  // App settings
  getAppSettings: () => Promise<{ success: boolean; settings?: { showIntroAnimation: boolean; rememberMe: boolean }; error?: string }>;
  saveAppSettings: (settings: { showIntroAnimation: boolean; rememberMe: boolean }) => Promise<{ success: boolean; error?: string }>;
  // Developer tools
  openDevTools: () => Promise<{ success: boolean }>;
  // System monitoring for Fleet Management
  getSystemMetrics: () => Promise<SystemMetricsResponse>;
  // Network scanner
  runNmap: (options: { target: string; flags?: string }) => Promise<{ success: boolean; output?: string; error?: string }>;
  // Filesystem MCP
  filesystemCall: (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
  listFilesystemTools: () => Promise<unknown>;
  // Execute shell command
  executeCommand: (command: string) => Promise<string>;
  // Run system command
  runCommand: (command: string, args?: string[]) => Promise<string>;
  // NVD CVE API proxy
  fetchCVEs: (year: string) => Promise<unknown>;
  // OpenRouter
  getOpenRouterKey: () => Promise<string | null>;
  setOpenRouterKey: (key: string) => Promise<{ ok: boolean; error?: string }>;
  // Claude UilBracketsCurly CLI (legacy)
  claudeChat: (options: { prompt: string; model?: string; sessionId?: string | null; maxBudget?: number }) => Promise<{ ok: boolean; exitCode?: number; error?: string }>;
  claudeStop: () => Promise<{ ok: boolean; error?: string }>;
  onClaudeStreamEvent: (callback: (data: any) => void) => void;
  onClaudeStreamEnd: (callback: (data: { code: number }) => void) => void;
  onClaudeStreamError: (callback: (error: string) => void) => void;
  removeClaudeListeners: () => void;
  // Browser Manager — WebContentsView-based real browser
  browserMgr: {
    createTab: (opts?: { url?: string; makeActive?: boolean }) => Promise<{ tabId: string; tabs: any[]; activeTabId: string }>;
    closeTab: (tabId: string) => Promise<{ tabs: any[]; activeTabId: string | null }>;
    switchTab: (tabId: string) => Promise<{ activeTabId: string; tab: any }>;
    navigate: (url: string, tabId?: string) => Promise<{ ok: boolean }>;
    back: () => Promise<{ ok: boolean }>;
    forward: () => Promise<{ ok: boolean }>;
    reload: () => Promise<{ ok: boolean }>;
    stop: () => Promise<{ ok: boolean }>;
    setBounds: (bounds: { x: number; y: number; width: number; height: number }) => Promise<{ ok: boolean }>;
    setVisible: (visible: boolean) => Promise<{ ok: boolean }>;
    getState: () => Promise<{ tabs: any[]; activeTabId: string | null; isVisible: boolean }>;
    execJS: (code: string, tabId?: string) => Promise<{ success: boolean; data?: any; error?: string }>;
    devtools: (tabId?: string) => Promise<{ ok: boolean }>;
    getUrl: (tabId?: string) => Promise<{ data: string }>;
    getTitle: (tabId?: string) => Promise<{ data: string }>;
    onEvent: (callback: (data: any) => void) => void;
    removeEventListeners: () => void;
  };
  // Legacy compat
  browserPanel: {
    navigate: (url: string) => Promise<any>;
    back: () => Promise<any>;
    forward: () => Promise<any>;
    reload: () => Promise<any>;
    isOpen: () => Promise<any>;
    open: (url?: string) => Promise<any>;
    close: () => Promise<any>;
  };
  onBrowserPanelCommand: () => void;
  sendBrowserPanelResult: () => void;
}

interface Window {
  electronAPI?: ElectronAPI;
}
