/**
 * Filesystem MCP Service
 * Access to /mnt/bounty and /home/rainkode via MCP Filesystem Server
 * Only available in Electron builds — web has no IPC bridge.
 */
import { hasElectronAPI } from '@/lib/platform';

declare global {
  interface Window {
    electronAPI: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      filesystemCall: (toolName: string, args: any) => Promise<{ success: boolean; data?: any; error?: string }>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      listFilesystemTools: () => Promise<{ success: boolean; tools?: any[]; error?: string }>;
    };
  }
}

export interface FilesystemTool {
  name: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parameters: any;
}

export interface FileInfo {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modified?: string;
}

/**
 * Filesystem MCP Service
 * Provides filesystem access via MCP
 */
class FilesystemMCPService {
  private tools: FilesystemTool[] = [];
  private initialized = false;

  /**
   * Initialize the filesystem service and load available tools
   */
  async initialize(): Promise<void> {
    if (!hasElectronAPI()) {
      console.log('📁 Filesystem MCP: skipping — not in Electron');
      return;
    }

    try {
      console.log('📁 Initializing Filesystem MCP Service...');

      const response = await window.electronAPI.listFilesystemTools();

      if (!response.success || !response.tools) {
        throw new Error(response.error || 'Failed to load filesystem tools');
      }

      this.tools = response.tools;
      this.initialized = true;

      console.log(`✅ Filesystem MCP initialized with ${this.tools.length} tools:`,
        this.tools.map(t => t.name).join(', '));
    } catch (error) {
      console.error('❌ Filesystem MCP initialization failed:', error);
      throw error;
    }
  }

  /**
   * Get list of available filesystem tools
   */
  getAvailableTools(): FilesystemTool[] {
    return this.tools;
  }

  /**
   * Read a file from C:\ or G:\ drive
   */
  async readFile(path: string): Promise<string> {
    try {
      console.log(`📖 Reading file: ${path}`);
      const response = await window.electronAPI.filesystemCall('read_file', { path });

      if (!response.success) {
        throw new Error(response.error || 'Failed to read file');
      }

      return response.data.content;
    } catch (error) {
      console.error(`❌ Failed to read file ${path}:`, error);
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  /**
   * Write content to a file on C:\ or G:\ drive
   */
  async writeFile(path: string, content: string): Promise<void> {
    try {
      console.log(`✍️ Writing file: ${path}`);
      const response = await window.electronAPI.filesystemCall('write_file', { path, content });

      if (!response.success) {
        throw new Error(response.error || 'Failed to write file');
      }

      console.log(`✅ File written successfully: ${path}`);
    } catch (error) {
      console.error(`❌ Failed to write file ${path}:`, error);
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }

  /**
   * List files and directories at a path
   */
  async listDirectory(path: string): Promise<FileInfo[]> {
    try {
      console.log(`📂 Listing directory: ${path}`);
      const response = await window.electronAPI.filesystemCall('list_directory', { path });

      if (!response.success) {
        throw new Error(response.error || 'Failed to list directory');
      }

      return response.data.entries || [];
    } catch (error) {
      console.error(`❌ Failed to list directory ${path}:`, error);
      throw new Error(`Failed to list directory: ${error.message}`);
    }
  }

  /**
   * Create a new directory
   */
  async createDirectory(path: string): Promise<void> {
    try {
      console.log(`📁 Creating directory: ${path}`);
      const response = await window.electronAPI.filesystemCall('create_directory', { path });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create directory');
      }

      console.log(`✅ Directory created: ${path}`);
    } catch (error) {
      console.error(`❌ Failed to create directory ${path}:`, error);
      throw new Error(`Failed to create directory: ${error.message}`);
    }
  }

  /**
   * Delete a file or directory
   */
  async delete(path: string): Promise<void> {
    try {
      console.log(`🗑️ Deleting: ${path}`);
      const response = await window.electronAPI.filesystemCall('delete', { path });

      if (!response.success) {
        throw new Error(response.error || 'Failed to delete');
      }

      console.log(`✅ Deleted: ${path}`);
    } catch (error) {
      console.error(`❌ Failed to delete ${path}:`, error);
      throw new Error(`Failed to delete: ${error.message}`);
    }
  }

  /**
   * Move/rename a file or directory
   */
  async move(source: string, destination: string): Promise<void> {
    try {
      console.log(`🔄 Moving: ${source} → ${destination}`);
      const response = await window.electronAPI.filesystemCall('move', { source, destination });

      if (!response.success) {
        throw new Error(response.error || 'Failed to move');
      }

      console.log(`✅ Moved successfully`);
    } catch (error) {
      console.error(`❌ Failed to move ${source}:`, error);
      throw new Error(`Failed to move: ${error.message}`);
    }
  }

  /**
   * Search for files matching a pattern
   */
  async searchFiles(path: string, pattern: string): Promise<FileInfo[]> {
    try {
      console.log(`🔍 Searching for "${pattern}" in: ${path}`);
      const response = await window.electronAPI.filesystemCall('search', { path, pattern });

      if (!response.success) {
        throw new Error(response.error || 'Failed to search files');
      }

      return response.data.results || [];
    } catch (error) {
      console.error(`❌ Failed to search files:`, error);
      throw new Error(`Failed to search files: ${error.message}`);
    }
  }

  /**
   * Get file or directory information
   */
  async getInfo(path: string): Promise<FileInfo> {
    try {
      console.log(`ℹ️ Getting info: ${path}`);
      const response = await window.electronAPI.filesystemCall('get_file_info', { path });

      if (!response.success) {
        throw new Error(response.error || 'Failed to get info');
      }

      return response.data;
    } catch (error) {
      console.error(`❌ Failed to get info for ${path}:`, error);
      throw new Error(`Failed to get info: ${error.message}`);
    }
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const filesystemMCP = new FilesystemMCPService();
