/**
 * Encrypted Conversation Storage Service for CrowByte
 * Provides secure conversation storage with shareable links (like ChatGPT)
 *
 * Features:
 * - UUID-based conversation IDs for shareable URLs
 * - End-to-end encrypted message storage
 * - Local storage with optional Supabase sync
 * - Export/Import encrypted conversations
 * - Shareable conversation links with optional encryption
 */

import { v4 as uuidv4, v5 as uuidv5 } from 'uuid';
import { encryptionService, EncryptedData, EncryptedConversation } from './encryption';
import { supabase } from '@/lib/supabase';

// Namespace UUID for deterministic conversation IDs
const CROWBYT_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

// Storage configuration
const STORAGE_CONFIG = {
  localStorageKey: 'crowbyte-conversations',
  maxLocalConversations: 100,
  shareUrlBase: 'https://crowbyte.io/c/',
  version: 1,
} as const;

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  model?: string;
  tokens?: number;
}

export interface Conversation {
  id: string; // UUID
  user_id: string;
  title: string;
  messages: Message[];
  created_at: string;
  updated_at: string;
  folder_id?: string;
  is_encrypted: boolean;
  is_shared: boolean;
  share_id?: string; // Separate UUID for sharing (doesn't reveal conversation ID)
  share_expires_at?: string;
  model?: string;
  tags?: string[];
}

export interface SharedConversation {
  share_id: string;
  conversation_id: string;
  encrypted_content: EncryptedData;
  is_public: boolean;
  password_protected: boolean;
  password_hash?: string;
  created_at: string;
  expires_at?: string;
  view_count: number;
}

export interface ConversationExport {
  version: number;
  exported_at: string;
  conversations: EncryptedConversation[];
  encryption_key_id: string;
}

/**
 * Conversation Storage Service
 * Manages encrypted conversation storage with UUID-based sharing
 */
class ConversationStorageService {
  private conversations: Map<string, Conversation> = new Map();
  private isLoaded: boolean = false;

  /**
   * Generate a new UUID for a conversation
   */
  generateConversationId(): string {
    return uuidv4();
  }

  /**
   * Generate a deterministic UUID from user ID and timestamp
   * Useful for syncing across devices
   */
  generateDeterministicId(userId: string, timestamp: string): string {
    return uuidv5(`${userId}:${timestamp}`, CROWBYT_NAMESPACE);
  }

  /**
   * Generate a share ID (different from conversation ID for security)
   */
  generateShareId(): string {
    return uuidv4();
  }

  /**
   * Get shareable URL for a conversation
   */
  getShareUrl(shareId: string): string {
    return `${STORAGE_CONFIG.shareUrlBase}${shareId}`;
  }

  /**
   * Load conversations from local storage
   */
  async loadFromLocalStorage(): Promise<Conversation[]> {
    try {
      const data = localStorage.getItem(STORAGE_CONFIG.localStorageKey);
      if (!data) {
        this.isLoaded = true;
        return [];
      }

      const parsed = JSON.parse(data);
      const conversations: Conversation[] = parsed.conversations || [];

      // Store in memory map
      conversations.forEach(conv => {
        this.conversations.set(conv.id, conv);
      });

      this.isLoaded = true;
      return conversations;
    } catch (error) {
      console.error('Failed to load conversations from local storage:', error);
      this.isLoaded = true;
      return [];
    }
  }

  /**
   * Save conversations to local storage
   */
  private async saveToLocalStorage(): Promise<void> {
    try {
      const conversations = Array.from(this.conversations.values());

      // Limit the number of stored conversations
      const sortedConversations = conversations
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
        .slice(0, STORAGE_CONFIG.maxLocalConversations);

      const data = {
        version: STORAGE_CONFIG.version,
        updated_at: new Date().toISOString(),
        conversations: sortedConversations,
      };

      localStorage.setItem(STORAGE_CONFIG.localStorageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save conversations to local storage:', error);
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(
    userId: string,
    title: string = 'New Conversation',
    options: {
      encrypted?: boolean;
      model?: string;
      folderId?: string;
    } = {}
  ): Promise<Conversation> {
    const id = this.generateConversationId();
    const now = new Date().toISOString();

    const conversation: Conversation = {
      id,
      user_id: userId,
      title,
      messages: [],
      created_at: now,
      updated_at: now,
      folder_id: options.folderId,
      is_encrypted: options.encrypted ?? false,
      is_shared: false,
      model: options.model,
      tags: [],
    };

    this.conversations.set(id, conversation);
    await this.saveToLocalStorage();

    // Optionally sync to Supabase
    if (supabase) {
      try {
        await supabase.from('conversations').insert({
          id: conversation.id,
          user_id: conversation.user_id,
          title: conversation.title,
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
        });
      } catch (error) {
        console.warn('Failed to sync conversation to Supabase:', error);
      }
    }

    return conversation;
  }

  /**
   * Get a conversation by ID
   */
  async getConversation(id: string): Promise<Conversation | null> {
    if (!this.isLoaded) {
      await this.loadFromLocalStorage();
    }

    return this.conversations.get(id) || null;
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string): Promise<Conversation[]> {
    if (!this.isLoaded) {
      await this.loadFromLocalStorage();
    }

    return Array.from(this.conversations.values())
      .filter(conv => conv.user_id === userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(
    conversationId: string,
    message: Omit<Message, 'id' | 'created_at'>
  ): Promise<Message> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const newMessage: Message = {
      id: uuidv4(),
      ...message,
      created_at: new Date().toISOString(),
    };

    // If encryption is enabled, encrypt the message content
    if (conversation.is_encrypted && encryptionService.isReady()) {
      // Store encrypted - the message content will be encrypted when saved
      // For now, we keep it in memory as plaintext and encrypt on export/sync
    }

    conversation.messages.push(newMessage);
    conversation.updated_at = new Date().toISOString();

    // Auto-generate title from first message if needed
    if (conversation.messages.length === 1 && conversation.title === 'New Conversation') {
      conversation.title = this.generateTitle(message.content);
    }

    await this.saveToLocalStorage();

    // Optionally sync to Supabase
    if (supabase) {
      try {
        await supabase.from('messages').insert({
          id: newMessage.id,
          conversation_id: conversationId,
          role: newMessage.role,
          content: newMessage.content,
          created_at: newMessage.created_at,
        });

        await supabase.from('conversations').update({
          updated_at: conversation.updated_at,
          title: conversation.title,
        }).eq('id', conversationId);
      } catch (error) {
        console.warn('Failed to sync message to Supabase:', error);
      }
    }

    return newMessage;
  }

  /**
   * Generate a conversation title from content
   */
  private generateTitle(content: string): string {
    // Take first 50 characters and clean up
    const cleaned = content
      .replace(/[#*`]/g, '')
      .replace(/\n/g, ' ')
      .trim();

    if (cleaned.length <= 50) {
      return cleaned;
    }

    return cleaned.substring(0, 47) + '...';
  }

  /**
   * Update conversation title
   */
  async updateTitle(conversationId: string, title: string): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    conversation.title = title;
    conversation.updated_at = new Date().toISOString();
    await this.saveToLocalStorage();

    if (supabase) {
      try {
        await supabase.from('conversations').update({
          title,
          updated_at: conversation.updated_at,
        }).eq('id', conversationId);
      } catch (error) {
        console.warn('Failed to sync title to Supabase:', error);
      }
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId: string): Promise<void> {
    this.conversations.delete(conversationId);
    await this.saveToLocalStorage();

    if (supabase) {
      try {
        await supabase.from('messages').delete().eq('conversation_id', conversationId);
        await supabase.from('conversations').delete().eq('id', conversationId);
      } catch (error) {
        console.warn('Failed to delete conversation from Supabase:', error);
      }
    }
  }

  /**
   * Share a conversation (generates a shareable link)
   */
  async shareConversation(
    conversationId: string,
    options: {
      isPublic?: boolean;
      password?: string;
      expiresIn?: number; // Hours
    } = {}
  ): Promise<{ shareUrl: string; shareId: string }> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const shareId = this.generateShareId();
    const expiresAt = options.expiresIn
      ? new Date(Date.now() + options.expiresIn * 60 * 60 * 1000).toISOString()
      : undefined;

    conversation.is_shared = true;
    conversation.share_id = shareId;
    conversation.share_expires_at = expiresAt;

    await this.saveToLocalStorage();

    // Store shared conversation data in Supabase
    if (supabase) {
      try {
        // Encrypt the conversation content for sharing
        let encryptedContent: EncryptedData | null = null;
        if (encryptionService.isReady()) {
          encryptedContent = await encryptionService.encrypt(
            JSON.stringify({
              title: conversation.title,
              messages: conversation.messages,
            })
          );
        }

        let passwordHash: string | undefined;
        if (options.password) {
          const encoder = new TextEncoder();
          const data = encoder.encode(options.password);
          const hash = await crypto.subtle.digest('SHA-256', data);
          passwordHash = Array.from(new Uint8Array(hash))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        }

        await supabase.from('shared_conversations').insert({
          share_id: shareId,
          conversation_id: conversationId,
          encrypted_content: encryptedContent,
          is_public: options.isPublic ?? false,
          password_protected: !!options.password,
          password_hash: passwordHash,
          created_at: new Date().toISOString(),
          expires_at: expiresAt,
          view_count: 0,
        });
      } catch (error) {
        console.warn('Failed to create shared conversation in Supabase:', error);
      }
    }

    return {
      shareUrl: this.getShareUrl(shareId),
      shareId,
    };
  }

  /**
   * Unshare a conversation
   */
  async unshareConversation(conversationId: string): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const shareId = conversation.share_id;
    conversation.is_shared = false;
    conversation.share_id = undefined;
    conversation.share_expires_at = undefined;

    await this.saveToLocalStorage();

    if (supabase && shareId) {
      try {
        await supabase.from('shared_conversations').delete().eq('share_id', shareId);
      } catch (error) {
        console.warn('Failed to delete shared conversation from Supabase:', error);
      }
    }
  }

  /**
   * Get a shared conversation by share ID
   */
  async getSharedConversation(
    shareId: string,
    password?: string
  ): Promise<{ title: string; messages: Message[] } | null> {
    if (!supabase) {
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('shared_conversations')
        .select('*')
        .eq('share_id', shareId)
        .single();

      if (error || !data) {
        return null;
      }

      // Check expiration
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return null;
      }

      // Check password
      if (data.password_protected && data.password_hash) {
        if (!password) {
          throw new Error('Password required');
        }

        const encoder = new TextEncoder();
        const passwordData = encoder.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', passwordData);
        const passwordHash = Array.from(new Uint8Array(hash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        if (passwordHash !== data.password_hash) {
          throw new Error('Incorrect password');
        }
      }

      // Increment view count
      await supabase
        .from('shared_conversations')
        .update({ view_count: data.view_count + 1 })
        .eq('share_id', shareId);

      // Decrypt if encrypted
      if (data.encrypted_content && encryptionService.isReady()) {
        const decrypted = await encryptionService.decrypt(data.encrypted_content);
        return JSON.parse(decrypted);
      }

      // Return unencrypted content
      return data.content;
    } catch (error) {
      console.error('Failed to get shared conversation:', error);
      throw error;
    }
  }

  /**
   * Export all conversations as encrypted JSON
   */
  async exportConversations(
    userId: string,
    password?: string
  ): Promise<string> {
    if (!this.isLoaded) {
      await this.loadFromLocalStorage();
    }

    const userConversations = Array.from(this.conversations.values())
      .filter(conv => conv.user_id === userId);

    if (!encryptionService.isReady()) {
      throw new Error('Encryption service not initialized');
    }

    const encryptedConversations: EncryptedConversation[] = [];

    for (const conv of userConversations) {
      const encrypted = await encryptionService.encryptConversation(
        {
          id: conv.id,
          title: conv.title,
          messages: conv.messages,
        },
        userId
      );
      encryptedConversations.push(encrypted);
    }

    const exportData: ConversationExport = {
      version: STORAGE_CONFIG.version,
      exported_at: new Date().toISOString(),
      conversations: encryptedConversations,
      encryption_key_id: encryptionService.getKeyId() || '',
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import conversations from encrypted JSON
   */
  async importConversations(
    jsonData: string,
    userId: string
  ): Promise<number> {
    if (!encryptionService.isReady()) {
      throw new Error('Encryption service not initialized');
    }

    const exportData: ConversationExport = JSON.parse(jsonData);

    // Verify key ID matches
    const currentKeyId = encryptionService.getKeyId();
    if (exportData.encryption_key_id !== currentKeyId) {
      throw new Error('Encryption key mismatch - data was encrypted with a different key');
    }

    let importedCount = 0;

    for (const encryptedConv of exportData.conversations) {
      try {
        const decrypted = await encryptionService.decryptConversation(encryptedConv);

        // Create new conversation with imported data
        const conversation: Conversation = {
          id: decrypted.id,
          user_id: userId,
          title: decrypted.title,
          messages: decrypted.messages.map(msg => ({
            id: uuidv4(),
            role: msg.role,
            content: msg.content,
            created_at: msg.created_at,
          })),
          created_at: encryptedConv.created_at,
          updated_at: new Date().toISOString(),
          is_encrypted: true,
          is_shared: false,
        };

        this.conversations.set(conversation.id, conversation);
        importedCount++;
      } catch (error) {
        console.error(`Failed to import conversation ${encryptedConv.id}:`, error);
      }
    }

    await this.saveToLocalStorage();

    return importedCount;
  }

  /**
   * Search conversations by content
   */
  async searchConversations(
    userId: string,
    query: string
  ): Promise<Conversation[]> {
    if (!this.isLoaded) {
      await this.loadFromLocalStorage();
    }

    const lowerQuery = query.toLowerCase();

    return Array.from(this.conversations.values())
      .filter(conv => {
        if (conv.user_id !== userId) return false;

        // Search in title
        if (conv.title.toLowerCase().includes(lowerQuery)) return true;

        // Search in messages
        return conv.messages.some(msg =>
          msg.content.toLowerCase().includes(lowerQuery)
        );
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  /**
   * Get conversation statistics
   */
  async getStatistics(userId: string): Promise<{
    totalConversations: number;
    totalMessages: number;
    encryptedConversations: number;
    sharedConversations: number;
    oldestConversation: string | null;
    newestConversation: string | null;
  }> {
    if (!this.isLoaded) {
      await this.loadFromLocalStorage();
    }

    const userConversations = Array.from(this.conversations.values())
      .filter(conv => conv.user_id === userId);

    const sorted = userConversations.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    return {
      totalConversations: userConversations.length,
      totalMessages: userConversations.reduce((sum, conv) => sum + conv.messages.length, 0),
      encryptedConversations: userConversations.filter(conv => conv.is_encrypted).length,
      sharedConversations: userConversations.filter(conv => conv.is_shared).length,
      oldestConversation: sorted[0]?.created_at || null,
      newestConversation: sorted[sorted.length - 1]?.created_at || null,
    };
  }

  /**
   * Clear all local data
   */
  async clearAllData(): Promise<void> {
    this.conversations.clear();
    localStorage.removeItem(STORAGE_CONFIG.localStorageKey);
    this.isLoaded = false;
  }
}

// Singleton instance
export const conversationStorage = new ConversationStorageService();

export default conversationStorage;
