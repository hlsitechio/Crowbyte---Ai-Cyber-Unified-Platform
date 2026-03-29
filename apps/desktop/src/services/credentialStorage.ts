/**
 * Credential Storage Service
 * Handles secure storage of login credentials for "Remember Me" functionality
 */

import { deviceFingerprint } from './deviceFingerprint';

export interface StoredCredentials {
  email: string;
  password: string; // Will be encrypted
  timestamp: number;
}

class CredentialStorageService {
  /**
   * Simple encryption for password (browser-side)
   * Note: Electron will double-encrypt with safeStorage
   */
  private async encrypt(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);

    // Use Web Crypto API for basic encryption
    const key = await this.getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedData.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encryptedData), iv.length);

    // Convert to base64
    return btoa(String.fromCharCode(...combined));
  }

  /**
   * Decrypt password
   */
  private async decrypt(encryptedText: string): Promise<string> {
    try {
      const combined = Uint8Array.from(atob(encryptedText), c => c.charCodeAt(0));

      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      const key = await this.getEncryptionKey();

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        data
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt credentials');
    }
  }

  /**
   * Get or create encryption key for this browser
   */
  private async getEncryptionKey(): Promise<CryptoKey> {
    const deviceId = await deviceFingerprint.getDeviceId();

    // Use device ID as key material
    const encoder = new TextEncoder();
    const keyMaterial = encoder.encode(deviceId);

    // Import as raw key material
    const keyMaterialKey = await crypto.subtle.importKey(
      'raw',
      keyMaterial,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    // Per-device salt: generated on first use, persisted in localStorage
    let storedSalt = localStorage.getItem('crowbyte_cred_salt');
    if (!storedSalt) {
      const randomSalt = crypto.getRandomValues(new Uint8Array(32));
      storedSalt = btoa(String.fromCharCode(...randomSalt));
      localStorage.setItem('crowbyte_cred_salt', storedSalt);
    }
    const salt = Uint8Array.from(atob(storedSalt), c => c.charCodeAt(0));

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterialKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Store credentials securely
   */
  async storeCredentials(email: string, password: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    const deviceId = await deviceFingerprint.getDeviceId();
    const encryptedPassword = await this.encrypt(password);

    const result = await window.electronAPI.storeCredentials({
      deviceId,
      email,
      encryptedPassword,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to store credentials');
    }

    console.log('✅ Credentials stored securely for device:', deviceId.substring(0, 8) + '...');
  }

  /**
   * Retrieve stored credentials
   */
  async getCredentials(): Promise<StoredCredentials | null> {
    if (!window.electronAPI) {
      return null;
    }

    const deviceId = await deviceFingerprint.getDeviceId();
    const result = await window.electronAPI.getCredentials(deviceId);

    if (!result.success) {
      return null;
    }

    const { credentials } = result;
    const decryptedPassword = await this.decrypt(credentials.encryptedPassword);

    return {
      email: credentials.email,
      password: decryptedPassword,
      timestamp: credentials.timestamp,
    };
  }

  /**
   * Delete stored credentials
   */
  async deleteCredentials(): Promise<void> {
    if (!window.electronAPI) {
      return;
    }

    const deviceId = await deviceFingerprint.getDeviceId();
    await window.electronAPI.deleteCredentials(deviceId);

    console.log('🗑️  Deleted stored credentials');
  }

  /**
   * Check if credentials exist for this device
   */
  async hasCredentials(): Promise<boolean> {
    if (!window.electronAPI) {
      return false;
    }

    const deviceId = await deviceFingerprint.getDeviceId();
    const result = await window.electronAPI.hasCredentials(deviceId);

    return result.success && result.hasCredentials;
  }
}

export const credentialStorage = new CredentialStorageService();
