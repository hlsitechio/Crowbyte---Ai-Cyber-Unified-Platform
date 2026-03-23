/**
 * Venice.ai Electron IPC Service
 * Bridges React app with Electron main process for MCP-enabled AI chat
 */

export interface VeniceMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface VeniceChatRequest {
  model: string;
  messages: VeniceMessage[];
  temperature?: number;
  mcpEnabled?: boolean;
}

// Type declaration for Electron API
declare global {
  interface Window {
    electronAPI: {
      initVenice: (apiKey: string) => Promise<{ success: boolean; error?: string }>;
      streamChat: (request: VeniceChatRequest) => Promise<{ success: boolean; error?: string }>;
      onStreamChunk: (callback: (chunk: string) => void) => void;
      onStreamEnd: (callback: () => void) => void;
      onStreamError: (callback: (error: string) => void) => void;
      removeStreamListeners: () => void;
      getMCPTools: () => Promise<{ success: boolean; tools: Array<{ name: string; description: string }> }>;
      getMCPStatus: () => Promise<{
        success: boolean;
        initialized: boolean;
        servers: string[];
        toolCount: number;
      }>;
    };
  }
}

class VeniceAIElectronService {
  private initialized = false;

  /**
   * Check if running in Electron
   */
  isElectron(): boolean {
    return typeof window !== 'undefined' && window.electronAPI !== undefined;
  }

  /**
   * Initialize Venice.ai with API key
   */
  async initialize(apiKey: string): Promise<void> {
    if (this.initialized) return;

    if (!this.isElectron()) {
      console.warn('Not running in Electron - skipping Venice IPC initialization');
      this.initialized = true;
      return;
    }

    const result = await window.electronAPI.initVenice(apiKey);
    if (!result.success) {
      throw new Error(result.error || 'Failed to initialize Venice.ai');
    }

    this.initialized = true;
    console.log('✅ Venice.ai initialized via Electron IPC');
  }

  /**
   * Create streaming chat completion with MCP support
   */
  async *createStreamingChat(request: VeniceChatRequest): AsyncGenerator<string> {
    if (!this.initialized) {
      throw new Error('Venice.ai not initialized. Call initialize() first.');
    }

    if (!this.isElectron()) {
      throw new Error('Not running in Electron - cannot stream chat');
    }

    const chunks: string[] = [];
    let streamEnded = false;
    let error: string | null = null;

    // Set up listeners
    window.electronAPI.onStreamChunk((chunk: string) => {
      chunks.push(chunk);
    });

    window.electronAPI.onStreamEnd(() => {
      streamEnded = true;
    });

    window.electronAPI.onStreamError((err: string) => {
      error = err;
      streamEnded = true;
    });

    // Start streaming
    const result = await window.electronAPI.streamChat(request);
    if (!result.success) {
      window.electronAPI.removeStreamListeners();
      throw new Error(result.error || 'Stream failed');
    }

    // Stream chunks as they arrive
    let lastIndex = 0;

    while (!streamEnded || lastIndex < chunks.length) {
      if (error) {
        window.electronAPI.removeStreamListeners();
        throw new Error(error);
      }

      while (lastIndex < chunks.length) {
        yield chunks[lastIndex];
        lastIndex++;
      }

      if (!streamEnded) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    // Cleanup
    window.electronAPI.removeStreamListeners();
  }

  /**
   * Get MCP tools list
   */
  async getMCPTools(): Promise<Array<{ name: string; description: string }>> {
    if (!this.isElectron()) {
      return [];
    }
    const result = await window.electronAPI.getMCPTools();
    return result.success ? result.tools : [];
  }

  /**
   * Get MCP status
   */
  async getMCPStatus(): Promise<{
    initialized: boolean;
    servers: string[];
    toolCount: number;
  }> {
    if (!this.isElectron()) {
      return {
        initialized: false,
        servers: [],
        toolCount: 0,
      };
    }

    const result = await window.electronAPI.getMCPStatus();
    return result.success ? {
      initialized: result.initialized,
      servers: result.servers,
      toolCount: result.toolCount,
    } : {
      initialized: false,
      servers: [],
      toolCount: 0,
    };
  }
}

// Export singleton instance
export const veniceAIElectron = new VeniceAIElectronService();
export default veniceAIElectron;
