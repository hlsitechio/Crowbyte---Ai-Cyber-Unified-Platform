/**
 * CrowByt Services Index
 * Exports all core services for easy importing
 */

// Encryption Services
export {
  encryptionService,
  generateSalt,
  type EncryptedData,
  type EncryptedMessage,
  type EncryptedConversation,
} from './encryption';

export {
  keyManagementService,
  type KeyMetadata,
  type RecoveryKey,
} from './keyManagement';

// Conversation Storage
export {
  conversationStorage,
  type Conversation,
  type Message,
  type SharedConversation,
  type ConversationExport,
} from './conversationStorage';

// Re-export the React hook for convenience
export { useEncryptedConversations } from '@/hooks/useEncryptedConversations';
