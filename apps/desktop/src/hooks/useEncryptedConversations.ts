/**
 * React Hook for Encrypted Conversations
 * Provides easy integration of encrypted conversation storage in React components
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { conversationStorage, Conversation, Message } from '@/services/conversationStorage';
import { keyManagementService, KeyMetadata } from '@/services/keyManagement';
import { encryptionService } from '@/services/encryption';

export interface UseEncryptedConversationsOptions {
  userId: string;
  autoLoad?: boolean;
  encryptionPassword?: string;
}

export interface ConversationStats {
  totalConversations: number;
  totalMessages: number;
  encryptedConversations: number;
  sharedConversations: number;
}

export interface UseEncryptedConversationsReturn {
  // State
  conversations: Conversation[];
  currentConversation: Conversation | null;
  isLoading: boolean;
  isEncryptionReady: boolean;
  isEncryptionSetup: boolean;
  error: string | null;
  stats: ConversationStats | null;

  // Encryption Management
  setupEncryption: (password: string) => Promise<void>;
  unlockEncryption: (password: string) => Promise<void>;
  lockEncryption: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  generateRecoveryKey: (password: string) => Promise<string>;

  // Conversation Management
  createConversation: (title?: string, encrypted?: boolean) => Promise<Conversation>;
  selectConversation: (id: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  updateTitle: (id: string, title: string) => Promise<void>;
  searchConversations: (query: string) => Promise<Conversation[]>;

  // Message Management
  addMessage: (conversationId: string, role: 'user' | 'assistant', content: string) => Promise<Message>;

  // Sharing
  shareConversation: (id: string, options?: { password?: string; expiresIn?: number }) => Promise<string>;
  unshareConversation: (id: string) => Promise<void>;
  getSharedConversation: (shareId: string, password?: string) => Promise<{ title: string; messages: Message[] } | null>;

  // Export/Import
  exportConversations: () => Promise<string>;
  importConversations: (data: string) => Promise<number>;

  // Refresh
  refresh: () => Promise<void>;
}

/**
 * Hook for managing encrypted conversations
 */
export function useEncryptedConversations(
  options: UseEncryptedConversationsOptions
): UseEncryptedConversationsReturn {
  const { userId, autoLoad = true, encryptionPassword } = options;

  // State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<ConversationStats | null>(null);

  // Encryption state
  const [isEncryptionReady, setIsEncryptionReady] = useState(false);
  const [isEncryptionSetup, setIsEncryptionSetup] = useState(false);

  // Check encryption status
  const checkEncryptionStatus = useCallback(() => {
    setIsEncryptionSetup(keyManagementService.isEncryptionSetup());
    setIsEncryptionReady(keyManagementService.isEncryptionUnlocked());
  }, []);

  // Load conversations
  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await conversationStorage.loadFromLocalStorage();
      const userConvs = await conversationStorage.getUserConversations(userId);
      setConversations(userConvs);

      // Load stats
      const statistics = await conversationStorage.getStatistics(userId);
      setStats({
        totalConversations: statistics.totalConversations,
        totalMessages: statistics.totalMessages,
        encryptedConversations: statistics.encryptedConversations,
        sharedConversations: statistics.sharedConversations,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversations');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    checkEncryptionStatus();

    if (autoLoad) {
      loadConversations();
    }
  }, [autoLoad, checkEncryptionStatus, loadConversations]);

  // Auto-unlock encryption if password provided
  useEffect(() => {
    if (encryptionPassword && isEncryptionSetup && !isEncryptionReady) {
      keyManagementService.unlock(encryptionPassword)
        .then(() => checkEncryptionStatus())
        .catch(err => setError(err.message));
    }
  }, [encryptionPassword, isEncryptionSetup, isEncryptionReady, checkEncryptionStatus]);

  // Setup encryption
  const setupEncryption = useCallback(async (password: string) => {
    try {
      setError(null);
      await keyManagementService.setupEncryption(password);
      checkEncryptionStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to setup encryption';
      setError(message);
      throw err;
    }
  }, [checkEncryptionStatus]);

  // Unlock encryption
  const unlockEncryption = useCallback(async (password: string) => {
    try {
      setError(null);
      await keyManagementService.unlock(password);
      checkEncryptionStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unlock encryption';
      setError(message);
      throw err;
    }
  }, [checkEncryptionStatus]);

  // Lock encryption
  const lockEncryption = useCallback(() => {
    keyManagementService.lock();
    checkEncryptionStatus();
  }, [checkEncryptionStatus]);

  // Change password
  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    try {
      setError(null);
      await keyManagementService.changePassword(currentPassword, newPassword);
      checkEncryptionStatus();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to change password';
      setError(message);
      throw err;
    }
  }, [checkEncryptionStatus]);

  // Generate recovery key
  const generateRecoveryKey = useCallback(async (password: string): Promise<string> => {
    try {
      setError(null);
      const recovery = await keyManagementService.generateRecoveryKey(password);
      return recovery.key;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate recovery key';
      setError(message);
      throw err;
    }
  }, []);

  // Create conversation
  const createConversation = useCallback(async (
    title: string = 'New Conversation',
    encrypted: boolean = false
  ): Promise<Conversation> => {
    try {
      setError(null);
      const conversation = await conversationStorage.createConversation(userId, title, {
        encrypted,
      });
      await loadConversations();
      setCurrentConversation(conversation);
      return conversation;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(message);
      throw err;
    }
  }, [userId, loadConversations]);

  // Select conversation
  const selectConversation = useCallback(async (id: string) => {
    try {
      setError(null);
      const conversation = await conversationStorage.getConversation(id);
      setCurrentConversation(conversation);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to select conversation';
      setError(message);
      throw err;
    }
  }, []);

  // Delete conversation
  const deleteConversation = useCallback(async (id: string) => {
    try {
      setError(null);
      await conversationStorage.deleteConversation(id);

      if (currentConversation?.id === id) {
        setCurrentConversation(null);
      }

      await loadConversations();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete conversation';
      setError(message);
      throw err;
    }
  }, [currentConversation, loadConversations]);

  // Update title
  const updateTitle = useCallback(async (id: string, title: string) => {
    try {
      setError(null);
      await conversationStorage.updateTitle(id, title);
      await loadConversations();

      if (currentConversation?.id === id) {
        setCurrentConversation(prev => prev ? { ...prev, title } : null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update title';
      setError(message);
      throw err;
    }
  }, [currentConversation, loadConversations]);

  // Search conversations
  const searchConversations = useCallback(async (query: string): Promise<Conversation[]> => {
    try {
      setError(null);
      return await conversationStorage.searchConversations(userId, query);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to search conversations';
      setError(message);
      throw err;
    }
  }, [userId]);

  // Add message
  const addMessage = useCallback(async (
    conversationId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<Message> => {
    try {
      setError(null);
      const message = await conversationStorage.addMessage(conversationId, { role, content });

      // Update current conversation if it's the active one
      if (currentConversation?.id === conversationId) {
        const updated = await conversationStorage.getConversation(conversationId);
        setCurrentConversation(updated);
      }

      await loadConversations();
      return message;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add message';
      setError(message);
      throw err;
    }
  }, [currentConversation, loadConversations]);

  // Share conversation
  const shareConversation = useCallback(async (
    id: string,
    options?: { password?: string; expiresIn?: number }
  ): Promise<string> => {
    try {
      setError(null);
      const result = await conversationStorage.shareConversation(id, options);
      await loadConversations();
      return result.shareUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to share conversation';
      setError(message);
      throw err;
    }
  }, [loadConversations]);

  // Unshare conversation
  const unshareConversation = useCallback(async (id: string) => {
    try {
      setError(null);
      await conversationStorage.unshareConversation(id);
      await loadConversations();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to unshare conversation';
      setError(message);
      throw err;
    }
  }, [loadConversations]);

  // Get shared conversation
  const getSharedConversation = useCallback(async (
    shareId: string,
    password?: string
  ): Promise<{ title: string; messages: Message[] } | null> => {
    try {
      setError(null);
      return await conversationStorage.getSharedConversation(shareId, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get shared conversation';
      setError(message);
      throw err;
    }
  }, []);

  // Export conversations
  const exportConversations = useCallback(async (): Promise<string> => {
    try {
      setError(null);
      if (!isEncryptionReady) {
        throw new Error('Encryption must be unlocked to export conversations');
      }
      return await conversationStorage.exportConversations(userId);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export conversations';
      setError(message);
      throw err;
    }
  }, [userId, isEncryptionReady]);

  // Import conversations
  const importConversations = useCallback(async (data: string): Promise<number> => {
    try {
      setError(null);
      if (!isEncryptionReady) {
        throw new Error('Encryption must be unlocked to import conversations');
      }
      const count = await conversationStorage.importConversations(data, userId);
      await loadConversations();
      return count;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import conversations';
      setError(message);
      throw err;
    }
  }, [userId, isEncryptionReady, loadConversations]);

  // Refresh
  const refresh = useCallback(async () => {
    await loadConversations();
  }, [loadConversations]);

  return {
    // State
    conversations,
    currentConversation,
    isLoading,
    isEncryptionReady,
    isEncryptionSetup,
    error,
    stats,

    // Encryption Management
    setupEncryption,
    unlockEncryption,
    lockEncryption,
    changePassword,
    generateRecoveryKey,

    // Conversation Management
    createConversation,
    selectConversation,
    deleteConversation,
    updateTitle,
    searchConversations,

    // Message Management
    addMessage,

    // Sharing
    shareConversation,
    unshareConversation,
    getSharedConversation,

    // Export/Import
    exportConversations,
    importConversations,

    // Refresh
    refresh,
  };
}

export default useEncryptedConversations;
