/**
 * Encryption Service for CrowByt
 * Provides AES-256-GCM encryption for secure conversation storage
 *
 * Security Features:
 * - AES-256-GCM for authenticated encryption
 * - PBKDF2 key derivation with 100,000 iterations
 * - Random IV/nonce per encryption operation
 * - HMAC-SHA256 for additional integrity verification
 */

// Encryption configuration
const ENCRYPTION_CONFIG = {
  algorithm: 'AES-GCM',
  keyLength: 256,
  ivLength: 12, // 96 bits for GCM
  tagLength: 128, // 128 bits authentication tag
  pbkdf2Iterations: 100000,
  pbkdf2Hash: 'SHA-256',
  version: 1, // For future schema migrations
} as const;

export interface EncryptedData {
  ciphertext: string; // Base64 encoded
  nonce: string; // Base64 encoded IV
  tag: string; // Base64 encoded auth tag (included in ciphertext for GCM)
  version: number;
  timestamp: number;
}

export interface EncryptedMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  encrypted_content: EncryptedData;
  content_hash: string; // HMAC-SHA256 for integrity
  created_at: string;
  encryption_version: number;
}

export interface EncryptedConversation {
  id: string;
  user_id: string;
  title: string;
  encrypted_title?: EncryptedData;
  messages: EncryptedMessage[];
  created_at: string;
  updated_at: string;
  is_encrypted: boolean;
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Generate a cryptographically secure random salt
 */
export function generateSalt(length: number = 32): string {
  const salt = crypto.getRandomValues(new Uint8Array(length));
  return arrayBufferToBase64(salt.buffer);
}

/**
 * Generate a random nonce/IV for AES-GCM
 */
function generateNonce(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(ENCRYPTION_CONFIG.ivLength));
}

/**
 * Encryption Service Class
 * Handles all cryptographic operations for conversation storage
 */
export class EncryptionService {
  private masterKey: CryptoKey | null = null;
  private keyId: string | null = null;
  private isInitialized: boolean = false;

  /**
   * Initialize the encryption service with a user-provided password
   * The password is never stored - only the derived key is kept in memory
   */
  async initialize(password: string, salt: string): Promise<void> {
    try {
      this.masterKey = await this.deriveKey(password, salt);
      this.keyId = await this.computeKeyId(salt);
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize encryption service:', error);
      throw new Error('Encryption initialization failed');
    }
  }

  /**
   * Check if the service is initialized and ready to use
   */
  isReady(): boolean {
    return this.isInitialized && this.masterKey !== null;
  }

  /**
   * Get the current key ID (for key rotation tracking)
   */
  getKeyId(): string | null {
    return this.keyId;
  }

  /**
   * Derive an encryption key from a password using PBKDF2
   */
  private async deriveKey(password: string, salt: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    const saltBuffer = base64ToArrayBuffer(salt);

    // Import password as a key for PBKDF2
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive the actual encryption key
    const derivedKey = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: ENCRYPTION_CONFIG.pbkdf2Iterations,
        hash: ENCRYPTION_CONFIG.pbkdf2Hash,
      },
      passwordKey,
      {
        name: ENCRYPTION_CONFIG.algorithm,
        length: ENCRYPTION_CONFIG.keyLength,
      },
      false, // Not extractable for security
      ['encrypt', 'decrypt']
    );

    return derivedKey;
  }

  /**
   * Compute a key ID for tracking which key was used
   */
  private async computeKeyId(salt: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(`crowbyt-key-${salt}-v${ENCRYPTION_CONFIG.version}`);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return arrayBufferToBase64(hash).substring(0, 16);
  }

  /**
   * Encrypt a message string
   */
  async encrypt(plaintext: string): Promise<EncryptedData> {
    if (!this.masterKey) {
      throw new Error('Encryption service not initialized');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const nonce = generateNonce();

    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: ENCRYPTION_CONFIG.algorithm,
        iv: nonce,
        tagLength: ENCRYPTION_CONFIG.tagLength,
      },
      this.masterKey,
      data
    );

    return {
      ciphertext: arrayBufferToBase64(encryptedBuffer),
      nonce: arrayBufferToBase64(nonce.buffer),
      tag: '', // Tag is included in ciphertext for AES-GCM
      version: ENCRYPTION_CONFIG.version,
      timestamp: Date.now(),
    };
  }

  /**
   * Decrypt an encrypted message
   */
  async decrypt(encryptedData: EncryptedData): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Encryption service not initialized');
    }

    const ciphertext = base64ToArrayBuffer(encryptedData.ciphertext);
    const nonce = base64ToArrayBuffer(encryptedData.nonce);

    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: ENCRYPTION_CONFIG.algorithm,
          iv: nonce,
          tagLength: ENCRYPTION_CONFIG.tagLength,
        },
        this.masterKey,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt message - incorrect key or corrupted data');
    }
  }

  /**
   * Compute HMAC-SHA256 for message integrity verification
   */
  async computeHMAC(data: string): Promise<string> {
    if (!this.masterKey) {
      throw new Error('Encryption service not initialized');
    }

    // Derive HMAC key from master key
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode('crowbyt-hmac-key');

    const hmacKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const dataBuffer = encoder.encode(data);
    const signature = await crypto.subtle.sign('HMAC', hmacKey, dataBuffer);

    return arrayBufferToBase64(signature);
  }

  /**
   * Verify HMAC for message integrity
   */
  async verifyHMAC(data: string, expectedHMAC: string): Promise<boolean> {
    const computedHMAC = await this.computeHMAC(data);
    return computedHMAC === expectedHMAC;
  }

  /**
   * Encrypt a full message object
   */
  async encryptMessage(
    message: { role: 'user' | 'assistant'; content: string },
    conversationId: string
  ): Promise<Omit<EncryptedMessage, 'id' | 'created_at'>> {
    const encryptedContent = await this.encrypt(message.content);
    const contentHash = await this.computeHMAC(message.content);

    return {
      conversation_id: conversationId,
      role: message.role,
      encrypted_content: encryptedContent,
      content_hash: contentHash,
      encryption_version: ENCRYPTION_CONFIG.version,
    };
  }

  /**
   * Decrypt a full message object
   */
  async decryptMessage(
    encryptedMessage: EncryptedMessage
  ): Promise<{ role: 'user' | 'assistant'; content: string }> {
    const content = await this.decrypt(encryptedMessage.encrypted_content);

    // Verify integrity
    const isValid = await this.verifyHMAC(content, encryptedMessage.content_hash);
    if (!isValid) {
      console.warn('Message integrity check failed - content may have been tampered with');
    }

    return {
      role: encryptedMessage.role,
      content,
    };
  }

  /**
   * Encrypt an entire conversation for export/backup
   */
  async encryptConversation(
    conversation: {
      id: string;
      title: string;
      messages: Array<{ role: 'user' | 'assistant'; content: string; created_at: string }>;
    },
    userId: string
  ): Promise<EncryptedConversation> {
    const encryptedTitle = await this.encrypt(conversation.title);
    const encryptedMessages: EncryptedMessage[] = [];

    for (const msg of conversation.messages) {
      const encrypted = await this.encryptMessage(
        { role: msg.role, content: msg.content },
        conversation.id
      );
      encryptedMessages.push({
        ...encrypted,
        id: crypto.randomUUID(),
        created_at: msg.created_at,
      });
    }

    return {
      id: conversation.id,
      user_id: userId,
      title: '[Encrypted]',
      encrypted_title: encryptedTitle,
      messages: encryptedMessages,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_encrypted: true,
    };
  }

  /**
   * Decrypt an entire conversation
   */
  async decryptConversation(
    encryptedConversation: EncryptedConversation
  ): Promise<{
    id: string;
    title: string;
    messages: Array<{ role: 'user' | 'assistant'; content: string; created_at: string }>;
  }> {
    let title = encryptedConversation.title;
    if (encryptedConversation.encrypted_title) {
      title = await this.decrypt(encryptedConversation.encrypted_title);
    }

    const messages: Array<{ role: 'user' | 'assistant'; content: string; created_at: string }> = [];

    for (const encryptedMsg of encryptedConversation.messages) {
      const decrypted = await this.decryptMessage(encryptedMsg);
      messages.push({
        ...decrypted,
        created_at: encryptedMsg.created_at,
      });
    }

    return {
      id: encryptedConversation.id,
      title,
      messages,
    };
  }

  /**
   * Clear the encryption key from memory (logout)
   */
  clear(): void {
    this.masterKey = null;
    this.keyId = null;
    this.isInitialized = false;
  }

  /**
   * Verify a password against a known salt (for login)
   */
  async verifyPassword(password: string, salt: string, expectedKeyId: string): Promise<boolean> {
    try {
      const testKey = await this.deriveKey(password, salt);
      const testKeyId = await this.computeKeyId(salt);
      return testKeyId === expectedKeyId;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const encryptionService = new EncryptionService();

export default encryptionService;
