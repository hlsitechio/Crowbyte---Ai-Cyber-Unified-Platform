/**
 * Electron Preload Script
 * Secure IPC bridge between main process and renderer (React)
 */

const { contextBridge, ipcRenderer, webFrame } = require('electron');

// Expose protected methods to renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Update checker
  applyUpdate: () => ipcRenderer.invoke('apply-update'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', (event, data) => callback(data)),

  // Open URL in system browser (for OAuth, passkeys, etc.)
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Open OAuth popup window (no CSP, proper CSS rendering, captures tokens)
  openOAuthPopup: (url, redirectOrigin) => ipcRenderer.invoke('open-oauth-popup', url, redirectOrigin),

  // OAuth PKCE flow — opens system browser, catches callback on localhost
  startOAuthPKCE: () => ipcRenderer.invoke('start-oauth-pkce'),

  // Initialize Venice.ai with API key
  initVenice: (apiKey) => ipcRenderer.invoke('init-venice', apiKey),

  // Stream chat with Venice.ai
  streamChat: (request) => ipcRenderer.invoke('stream-chat', request),

  // Listen for stream chunks
  onStreamChunk: (callback) => {
    ipcRenderer.on('chat-stream-chunk', (event, chunk) => callback(chunk));
  },

  // Listen for stream end
  onStreamEnd: (callback) => {
    ipcRenderer.on('chat-stream-end', () => callback());
  },

  // Listen for stream errors
  onStreamError: (callback) => {
    ipcRenderer.on('chat-stream-error', (event, error) => callback(error));
  },

  // Remove stream listeners (cleanup)
  removeStreamListeners: () => {
    ipcRenderer.removeAllListeners('chat-stream-chunk');
    ipcRenderer.removeAllListeners('chat-stream-end');
    ipcRenderer.removeAllListeners('chat-stream-error');
  },

  // Get MCP tools list
  getMCPTools: () => ipcRenderer.invoke('get-mcp-tools'),

  // Get monitoring tools (mcp-monitor only)
  getMonitoringTools: () => ipcRenderer.invoke('get-monitoring-tools'),

  // Get MCP status
  getMCPStatus: () => ipcRenderer.invoke('get-mcp-status'),

  // PC Monitoring - MCP call
  mcpCall: (toolName, args) => ipcRenderer.invoke('mcp-call', toolName, args),

  // Filesystem MCP - Access C:\ and G:\ drives
  filesystemCall: (toolName, args) => ipcRenderer.invoke('mcp-filesystem-call', toolName, args),
  listFilesystemTools: () => ipcRenderer.invoke('list-filesystem-tools'),

  // Quit application
  quitApp: () => ipcRenderer.invoke('quit-app'),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  maximizeWindow: () => ipcRenderer.invoke('maximize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),

  // Terminal methods
  getAvailableShells: () => ipcRenderer.invoke('get-available-shells'),
  createTerminal: (options) => ipcRenderer.invoke('create-terminal', options),
  terminalInput: (options) => ipcRenderer.invoke('terminal-input', options),
  terminalResize: (options) => ipcRenderer.invoke('terminal-resize', options),
  closeTerminal: (options) => ipcRenderer.invoke('close-terminal', options),

  // Listen for terminal output
  onTerminalOutput: (callback) => {
    ipcRenderer.on('terminal-output', (event, output) => callback(output));
  },

  // Listen for terminal exit
  onTerminalExit: (callback) => {
    ipcRenderer.on('terminal-exit', (event, exit) => callback(exit));
  },

  // Remove terminal listeners (cleanup)
  removeTerminalListeners: () => {
    ipcRenderer.removeAllListeners('terminal-output');
    ipcRenderer.removeAllListeners('terminal-exit');
  },

  // Network Scanner / Nmap
  runNmap: (options) => ipcRenderer.invoke('run-nmap', options),

  // Execute shell command (CyberOps)
  executeCommand: (command) => ipcRenderer.invoke('execute-command', command),

  // Run system command (for DNS detection, etc.)
  runCommand: (command, args) => ipcRenderer.invoke('run-command', command, args),

  // NVD CVE API proxy (avoid CORS)
  fetchCVEs: (year) => ipcRenderer.invoke('fetch-cves', year),

  // Credential storage for "Remember Me"
  storeCredentials: (data) => ipcRenderer.invoke('store-credentials', data),
  getCredentials: (deviceId) => ipcRenderer.invoke('get-credentials', deviceId),
  deleteCredentials: (deviceId) => ipcRenderer.invoke('delete-credentials', deviceId),
  hasCredentials: (deviceId) => ipcRenderer.invoke('has-credentials', deviceId),

  // App settings (intro animation, etc.)
  getAppSettings: () => ipcRenderer.invoke('get-app-settings'),
  saveAppSettings: (settings) => ipcRenderer.invoke('save-app-settings', settings),

  // Developer tools
  openDevTools: () => ipcRenderer.invoke('open-dev-tools'),

  // Browser Manager — WebContentsView-based real browser
  browserMgr: {
    createTab: (opts = {}) => ipcRenderer.invoke('browser-mgr:create-tab', opts),
    closeTab: (tabId) => ipcRenderer.invoke('browser-mgr:close-tab', { tabId }),
    switchTab: (tabId) => ipcRenderer.invoke('browser-mgr:switch-tab', { tabId }),
    navigate: (url, tabId) => ipcRenderer.invoke('browser-mgr:navigate', { url, tabId }),
    back: () => ipcRenderer.invoke('browser-mgr:back'),
    forward: () => ipcRenderer.invoke('browser-mgr:forward'),
    reload: () => ipcRenderer.invoke('browser-mgr:reload'),
    stop: () => ipcRenderer.invoke('browser-mgr:stop'),
    setBounds: (bounds) => ipcRenderer.invoke('browser-mgr:set-bounds', bounds),
    setVisible: (visible) => ipcRenderer.invoke('browser-mgr:set-visible', { visible }),
    getState: () => ipcRenderer.invoke('browser-mgr:get-state'),
    execJS: (code, tabId) => ipcRenderer.invoke('browser-mgr:exec-js', { code, tabId }),
    devtools: (tabId) => ipcRenderer.invoke('browser-mgr:devtools', { tabId }),
    getUrl: (tabId) => ipcRenderer.invoke('browser-mgr:get-url', { tabId }),
    getTitle: (tabId) => ipcRenderer.invoke('browser-mgr:get-title', { tabId }),
    onEvent: (callback) => {
      ipcRenderer.on('browser-mgr:event', (event, data) => callback(data));
    },
    removeEventListeners: () => {
      ipcRenderer.removeAllListeners('browser-mgr:event');
    },
  },
  // Legacy compat — old preload keys mapped to new manager
  browserPanel: {
    navigate: (url) => ipcRenderer.invoke('browser-mgr:navigate', { url }),
    back: () => ipcRenderer.invoke('browser-mgr:back'),
    forward: () => ipcRenderer.invoke('browser-mgr:forward'),
    reload: () => ipcRenderer.invoke('browser-mgr:reload'),
    isOpen: () => ipcRenderer.invoke('browser-mgr:get-state').then(s => ({ success: true, data: { isOpen: s.isVisible } })),
    open: (url) => ipcRenderer.invoke('browser-mgr:set-visible', { visible: true }).then(() => url && ipcRenderer.invoke('browser-mgr:navigate', { url })),
    close: () => ipcRenderer.invoke('browser-mgr:set-visible', { visible: false }),
  },
  onBrowserPanelCommand: () => {},  // No longer used
  sendBrowserPanelResult: () => {}, // No longer used

  // System monitoring for Fleet Management
  getSystemMetrics: () => ipcRenderer.invoke('get-system-metrics'),

  // Onboarding (Discord-style first-run)
  onboardingComplete: () => ipcRenderer.invoke('onboarding:complete'),
  onboardingSkip: () => ipcRenderer.invoke('onboarding:skip'),

  // Claude Code CLI (legacy — kept for backward compat)
  claudeChat: (options) => ipcRenderer.invoke('claude-chat', options),
  claudeStop: () => ipcRenderer.invoke('claude-stop'),
  onClaudeStreamEvent: (callback) => {
    ipcRenderer.on('claude-stream-event', (event, data) => callback(data));
  },
  onClaudeStreamEnd: (callback) => {
    ipcRenderer.on('claude-stream-end', (event, data) => callback(data));
  },
  onClaudeStreamError: (callback) => {
    ipcRenderer.on('claude-stream-error', (event, error) => callback(error));
  },
  removeClaudeListeners: () => {
    ipcRenderer.removeAllListeners('claude-stream-event');
    ipcRenderer.removeAllListeners('claude-stream-end');
    ipcRenderer.removeAllListeners('claude-stream-error');
  },

  // OpenRouter API Key Storage
  getOpenRouterKey: () => ipcRenderer.invoke('openrouter:get-key'),
  setOpenRouterKey: (key) => ipcRenderer.invoke('openrouter:set-key', key),

  // Intercept Proxy (built-in MITM proxy for bug bounty)
  proxy: {
    start: (opts) => ipcRenderer.invoke('proxy:start', opts),
    stop: () => ipcRenderer.invoke('proxy:stop'),
    status: () => ipcRenderer.invoke('proxy:status'),
    pause: () => ipcRenderer.invoke('proxy:pause'),
    resume: () => ipcRenderer.invoke('proxy:resume'),
    setScope: (scope, excludeScope) => ipcRenderer.invoke('proxy:set-scope', { scope, excludeScope }),
    history: (filters) => ipcRenderer.invoke('proxy:history', filters),
    getCapture: (id) => ipcRenderer.invoke('proxy:get-capture', id),
    replay: (id, modifications) => ipcRenderer.invoke('proxy:replay', { id, modifications }),
    clear: () => ipcRenderer.invoke('proxy:clear'),
    caPath: () => ipcRenderer.invoke('proxy:ca-path'),
    onCapture: (callback) => {
      ipcRenderer.on('proxy:capture', (event, data) => callback(data));
    },
    onError: (callback) => {
      ipcRenderer.on('proxy:error', (event, error) => callback(error));
    },
    removeListeners: () => {
      ipcRenderer.removeAllListeners('proxy:capture');
      ipcRenderer.removeAllListeners('proxy:error');
    },
  },

  // Generic invoke for dynamic IPC (hunt-graph, etc.)
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, callback) => {
    ipcRenderer.on(channel, (event, ...args) => callback(event, ...args));
  },

  // App zoom (Ctrl+Wheel) — uses webFrame directly, no IPC round-trip
  zoom: {
    getFactor: () => webFrame.getZoomFactor(),
    setFactor: (factor) => webFrame.setZoomFactor(factor),
    getLevel: () => webFrame.getZoomLevel(),
    setLevel: (level) => webFrame.setZoomLevel(level),
  },
});

console.log('🔒 Preload script loaded - IPC bridge ready');
