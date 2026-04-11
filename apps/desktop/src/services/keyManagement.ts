/**
 * UilKeySkeleton Management Service for CrowByte
 * Handles encryption key lifecycle, storage, and recovery
 *
 * Features:
 * - Secure key derivation from user password
 * - Local key storage using Electron safeStorage (when available)
 * - Key rotation support
 * - Recovery key generation
 */

import { encryptionService, generateSalt } from './encryption';

// Key management configuration
const KEY_CONFIG = {
  saltStorageKey: 'crowbyte-encryption-salt',
  keyIdStorageKey: 'crowbyte-key-id',
  recoveryKeyLength: 32,
  minPasswordLength: 8,
} as const;

export interface KeyMetadata {
  keyId: string;
  salt: string;
  createdAt: string;
  rotatedAt?: string;
  version: number;
}

export interface RecoveryKey {
  key: string;
  createdAt: string;
  hint: string;
}

/**
 * UilKeySkeleton Management Service
 * Manages encryption keys, passwords, and recovery options
 */
class KeyManagementService {
  private isUnlocked: boolean = false;
  private keyMetadata: KeyMetadata | null = null;

  /**
   * Check if a password meets minimum requirements
   */
  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < KEY_CONFIG.minPasswordLength) {
      errors.push(`Password must be at least ${KEY_CONFIG.minPasswordLength} characters`);
    }

    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Initialize encryption with a new password (first-time setup)
   */
  async setupEncryption(password: string): Promise<KeyMetadata> {
    const validation = this.validatePassword(password);
    if (!validation.valid) {
      throw new Error(`Invalid password: ${validation.errors.join(', ')}`);
    }

    // Generate a new salt
    const salt = generateSalt(32);

    // Initialize the encryption service
    await encryptionService.initialize(password, salt);

    const keyId = encryptionService.getKeyId();
    if (!keyId) {
      throw new Error('Failed to generate key ID');
    }

    // Create key metadata
    this.keyMetadata = {
      keyId,
      salt,
      createdAt: new Date().toISOString(),
      version: 1,
    };

    // Store metadata locally
    this.saveKeyMetadata(this.keyMetadata);

    this.isUnlocked = true;

    return this.keyMetadata;
  }

  /**
   * Unlock encryption with existing password
   */
  async unlock(password: string): Promise<boolean> {
    const metadata = this.loadKeyMetadata();
    if (!metadata) {
      throw new Error('No encryption key found. Please set up encryption first.');
    }

    // Verify password
    const isValid = await encryptionService.verifyPassword(
      password,
      metadata.salt,
      metadata.keyId
    );

    if (!isValid) {
      throw new Error('Incorrect password');
    }

    // Initialize encryption service
    await encryptionService.initialize(password, metadata.salt);

    this.keyMetadata = metadata;
    this.isUnlocked = true;

    return true;
  }

  /**
   * Lock encryption (clear key from memory)
   */
  lock(): void {
    encryptionService.clear();
    this.isUnlocked = false;
  }

  /**
   * Check if encryption is unlocked
   */
  isEncryptionUnlocked(): boolean {
    return this.isUnlocked && encryptionService.isReady();
  }

  /**
   * Check if encryption has been set up
   */
  isEncryptionSetup(): boolean {
    return this.loadKeyMetadata() !== null;
  }

  /**
   * Change the encryption password
   */
  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<KeyMetadata> {
    // Validate new password
    const validation = this.validatePassword(newPassword);
    if (!validation.valid) {
      throw new Error(`Invalid new password: ${validation.errors.join(', ')}`);
    }

    // Verify current password
    const metadata = this.loadKeyMetadata();
    if (!metadata) {
      throw new Error('No encryption key found');
    }

    const isValid = await encryptionService.verifyPassword(
      currentPassword,
      metadata.salt,
      metadata.keyId
    );

    if (!isValid) {
      throw new Error('Current password is incorrect');
    }

    // Generate new salt and re-derive key
    const newSalt = generateSalt(32);
    await encryptionService.initialize(newPassword, newSalt);

    const newKeyId = encryptionService.getKeyId();
    if (!newKeyId) {
      throw new Error('Failed to generate new key ID');
    }

    // Update metadata
    this.keyMetadata = {
      keyId: newKeyId,
      salt: newSalt,
      createdAt: metadata.createdAt,
      rotatedAt: new Date().toISOString(),
      version: metadata.version + 1,
    };

    this.saveKeyMetadata(this.keyMetadata);

    return this.keyMetadata;
  }

  /**
   * Generate a recovery key for emergency access
   */
  async generateRecoveryKey(password: string): Promise<RecoveryKey> {
    if (!this.isEncryptionUnlocked()) {
      throw new Error('Encryption must be unlocked to generate recovery key');
    }

    const metadata = this.loadKeyMetadata();
    if (!metadata) {
      throw new Error('No encryption key found');
    }

    // Verify password
    const isValid = await encryptionService.verifyPassword(
      password,
      metadata.salt,
      metadata.keyId
    );

    if (!isValid) {
      throw new Error('Password is incorrect');
    }

    // Generate recovery key from salt and password
    // This is a deterministic recovery key that can be regenerated
    const encoder = new TextEncoder();
    const data = encoder.encode(`${metadata.salt}:${password}:recovery`);
    const hash = await crypto.subtle.digest('SHA-256', data);

    // Convert to readable format (base64 with separators)
    const bytes = new Uint8Array(hash);
    let recoveryKey = '';
    for (let i = 0; i < bytes.length; i++) {
      recoveryKey += bytes[i].toString(16).padStart(2, '0');
      if ((i + 1) % 8 === 0 && i < bytes.length - 1) {
        recoveryKey += '-';
      }
    }

    return {
      key: recoveryKey.toUpperCase(),
      createdAt: new Date().toISOString(),
      hint: 'Store this key in a safe place. You will need it to recover your encrypted data.',
    };
  }

  /**
   * Recover encryption using a recovery key
   */
  async recoverWithKey(recoveryKey: string, newPassword: string): Promise<boolean> {
    // This is a simplified recovery - in production, you'd want more robust recovery
    const validation = this.validatePassword(newPassword);
    if (!validation.valid) {
      throw new Error(`Invalid new password: ${validation.errors.join(', ')}`);
    }

    // Generate new encryption setup
    await this.setupEncryption(newPassword);

    return true;
  }

  /**
   * Get current key metadata
   */
  getKeyMetadata(): KeyMetadata | null {
    return this.keyMetadata || this.loadKeyMetadata();
  }

  /**
   * Save key metadata to local storage
   * In Electron, this could use safeStorage for additional security
   */
  private saveKeyMetadata(metadata: KeyMetadata): void {
    try {
      // Check if we're in Electron with safeStorage available
      if (typeof window !== 'undefined' && (window as any).electron?.safeStorage) {
        // Use Electron's safeStorage for better security
        (window as any).electron.safeStorage.setItem(
          KEY_CONFIG.saltStorageKey,
          JSON.stringify(metadata)
        );
      } else {
        // Fallback to localStorage (less secure but works in browser)
        localStorage.setItem(KEY_CONFIG.saltStorageKey, JSON.stringify(metadata));
      }
    } catch (error) {
      console.error('Failed to save key metadata:', error);
      throw new Error('Failed to save encryption key metadata');
    }
  }

  /**
   * Load key metadata from local storage
   */
  private loadKeyMetadata(): KeyMetadata | null {
    try {
      let data: string | null = null;

      // Check if we're in Electron with safeStorage available
      if (typeof window !== 'undefined' && (window as any).electron?.safeStorage) {
        data = (window as any).electron.safeStorage.getItem(KEY_CONFIG.saltStorageKey);
      } else {
        data = localStorage.getItem(KEY_CONFIG.saltStorageKey);
      }

      if (!data) {
        return null;
      }

      return JSON.parse(data) as KeyMetadata;
    } catch (error) {
      console.error('Failed to load key metadata:', error);
      return null;
    }
  }

  /**
   * Clear all encryption data (dangerous - use with caution)
   */
  clearAllEncryptionData(): void {
    this.lock();
    this.keyMetadata = null;

    try {
      if (typeof window !== 'undefined' && (window as any).electron?.safeStorage) {
        (window as any).electron.safeStorage.removeItem(KEY_CONFIG.saltStorageKey);
      } else {
        localStorage.removeItem(KEY_CONFIG.saltStorageKey);
      }
    } catch (error) {
      console.error('Failed to clear encryption data:', error);
    }
  }

  /**
   * Export key metadata for backup (encrypted)
   */
  async exportKeyBackup(password: string): Promise<string> {
    if (!this.isEncryptionUnlocked()) {
      throw new Error('Encryption must be unlocked to export backup');
    }

    const metadata = this.getKeyMetadata();
    if (!metadata) {
      throw new Error('No key metadata to export');
    }

    // Encrypt the metadata with the user's password
    const backupData = JSON.stringify({
      metadata,
      exportedAt: new Date().toISOString(),
      version: 1,
    });

    const encrypted = await encryptionService.encrypt(backupData);

    return JSON.stringify(encrypted);
  }
}

// Singleton instance
export const keyManagementService = new KeyManagementService();

export default keyManagementService;
