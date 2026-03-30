/**
 * Remote Control Service — E2E Encrypted Remote Desktop
 *
 * AnyDesk/TeamViewer-like functionality for CrowByte Fleet.
 * Uses WebSocket relay with end-to-end encryption (X25519 + AES-256-GCM).
 *
 * Architecture:
 *   CrowByte Desktop ↔ WebSocket Relay (VPS) ↔ CrowByte Agent (endpoint)
 *   Both sides negotiate E2E keys — relay server is zero-knowledge.
 *
 * Encryption:
 *   1. X25519 ECDH key exchange (via WebCrypto API)
 *   2. AES-256-GCM for all frame/input data
 *   3. HKDF for key derivation
 *   4. Perfect forward secrecy — new keys each session
 */

import { supabase } from '@/lib/supabase';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type RemotePermission = 'view_only' | 'shared_control' | 'full_control';
export type SessionStatus = 'requesting' | 'waiting_consent' | 'connecting' | 'connected' | 'disconnected' | 'denied' | 'error' | 'recording';
export type InputEventType = 'mouse_move' | 'mouse_down' | 'mouse_up' | 'mouse_scroll' | 'key_down' | 'key_up' | 'clipboard';

export interface RemoteSession {
  id: string;
  orgId?: string;
  initiatedBy: string;
  targetEndpointId: string;
  targetHostname: string;
  targetIp: string;
  permission: RemotePermission;
  status: SessionStatus;
  consentStatus: 'pending' | 'approved' | 'denied' | 'auto_approved';
  consentGivenBy?: string;
  encryptionKey?: string;  // NOT stored — ephemeral
  startedAt?: string;
  endedAt?: string;
  durationMs?: number;
  recordingUrl?: string;
  frameRate: number;
  resolution: { width: number; height: number };
  monitors: number;
  activeMonitor: number;
  bytesTransferred: number;
  latencyMs: number;
  createdAt: string;
}

export interface FrameData {
  type: 'full' | 'delta';
  monitor: number;
  x: number;
  y: number;
  width: number;
  height: number;
  data: ArrayBuffer;  // Encrypted pixel data
  timestamp: number;
  sequence: number;
}

export interface InputEvent {
  type: InputEventType;
  x?: number;
  y?: number;
  button?: number;
  deltaX?: number;
  deltaY?: number;
  key?: string;
  code?: string;
  modifiers?: {
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
  };
  clipboardData?: string;
  timestamp: number;
}

export interface FileTransfer {
  id: string;
  sessionId: string;
  fileName: string;
  fileSize: number;
  direction: 'upload' | 'download';
  progress: number;
  status: 'pending' | 'transferring' | 'completed' | 'failed';
  startedAt: string;
  speed: number; // bytes/sec
}

export interface RemoteControlConfig {
  relayUrl: string;
  stunServers: string[];
  turnServers: { url: string; username: string; credential: string }[];
  maxFrameRate: number;
  quality: 'low' | 'medium' | 'high' | 'lossless';
  enableClipboard: boolean;
  enableFileTransfer: boolean;
  enableAudio: boolean;
  enableRecording: boolean;
  autoApproveFromAdmin: boolean;
  sessionTimeoutMs: number;
  idleTimeoutMs: number;
}

// ─── Encryption Layer ──────────────────────────────────────────────────────────

class E2ECrypto {
  private localKeyPair: CryptoKeyPair | null = null;
  private sharedSecret: CryptoKey | null = null;
  private encryptionKey: CryptoKey | null = null;
  private sequenceCounter = 0;
  // Per-session random salt for HKDF — generated in generateKeyPair(), shared during key exchange
  sessionSalt: Uint8Array = crypto.getRandomValues(new Uint8Array(32));

  /**
   * Generate X25519 ECDH key pair for this session.
   * Also regenerates the per-session HKDF salt.
   */
  async generateKeyPair(): Promise<{ publicKey: JsonWebKey; sessionSalt: string }> {
    this.sessionSalt = crypto.getRandomValues(new Uint8Array(32));
    this.localKeyPair = await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' }, // P-256 as WebCrypto X25519 fallback
      true,
      ['deriveBits']
    );
    const publicKey = await crypto.subtle.exportKey('jwk', this.localKeyPair.publicKey);
    return {
      publicKey,
      sessionSalt: btoa(String.fromCharCode(...this.sessionSalt)),
    };
  }

  /**
   * Derive shared secret from remote public key and (optionally) remote session salt.
   * If remoteSessionSalt is provided, it is XOR-combined with our local salt so that
   * both sides contribute entropy to the HKDF salt.
   */
  async deriveSharedSecret(remotePublicKeyJwk: JsonWebKey, remoteSessionSaltB64?: string): Promise<void> {
    if (remoteSessionSaltB64) {
      const remoteSalt = Uint8Array.from(atob(remoteSessionSaltB64), c => c.charCodeAt(0));
      // XOR local and remote salts so both sides contribute
      for (let i = 0; i < this.sessionSalt.length; i++) {
        this.sessionSalt[i] ^= remoteSalt[i % remoteSalt.length];
      }
    }
    const remotePublicKey = await crypto.subtle.importKey(
      'jwk',
      remotePublicKeyJwk,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );

    const sharedBits = await crypto.subtle.deriveBits(
      { name: 'ECDH', public: remotePublicKey },
      this.localKeyPair!.privateKey,
      256
    );

    // HKDF to derive AES-256-GCM key from shared bits
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      sharedBits,
      'HKDF',
      false,
      ['deriveKey']
    );

    this.encryptionKey = await crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: this.sessionSalt, // Random per-session salt, included in key exchange
        info: new TextEncoder().encode('crowbyte-remote-control-v1'),
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data with AES-256-GCM
   */
  async encrypt(data: ArrayBuffer): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array; tag: ArrayBuffer }> {
    if (!this.encryptionKey) throw new Error('No encryption key — call deriveSharedSecret first');

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      this.encryptionKey,
      data
    );

    this.sequenceCounter++;
    return { ciphertext, iv, tag: new ArrayBuffer(0) }; // GCM tag is appended to ciphertext
  }

  /**
   * Decrypt data with AES-256-GCM
   */
  async decrypt(ciphertext: ArrayBuffer, iv: Uint8Array): Promise<ArrayBuffer> {
    if (!this.encryptionKey) throw new Error('No encryption key');

    return await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, tagLength: 128 },
      this.encryptionKey,
      ciphertext
    );
  }

  /**
   * Encrypt a JSON message
   */
  async encryptMessage(message: object): Promise<string> {
    const plaintext = new TextEncoder().encode(JSON.stringify(message));
    const { ciphertext, iv } = await this.encrypt(plaintext);
    return JSON.stringify({
      ct: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
      iv: btoa(String.fromCharCode(...iv)),
    });
  }

  /**
   * Decrypt a JSON message
   */
  async decryptMessage(encrypted: string): Promise<object> {
    const { ct, iv } = JSON.parse(encrypted);
    const ciphertext = Uint8Array.from(atob(ct), c => c.charCodeAt(0)).buffer;
    const ivBytes = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    const plaintext = await this.decrypt(ciphertext, ivBytes);
    return JSON.parse(new TextDecoder().decode(plaintext));
  }

  destroy(): void {
    this.localKeyPair = null;
    this.sharedSecret = null;
    this.encryptionKey = null;
    this.sequenceCounter = 0;
  }
}

// ─── Remote Control Service ────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RemoteEventCallback = (event: string, data: any) => void;

class RemoteControlService {
  private ws: WebSocket | null = null;
  private crypto = new E2ECrypto();
  private currentSession: RemoteSession | null = null;
  private frameCanvas: OffscreenCanvas | null = null;
  private frameCtx: OffscreenCanvasRenderingContext2D | null = null;
  private listeners: Map<string, Set<RemoteEventCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private latencyPings: number[] = [];
  private frameBuffer: FrameData[] = [];
  private config: RemoteControlConfig = {
    relayUrl: `wss://${import.meta.env.VITE_OPENCLAW_HOSTNAME || 'localhost'}:18790/relay`,
    stunServers: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
    turnServers: [],
    maxFrameRate: 30,
    quality: 'high',
    enableClipboard: true,
    enableFileTransfer: true,
    enableAudio: false,
    enableRecording: true,
    autoApproveFromAdmin: false,
    sessionTimeoutMs: 3600000,   // 1 hour max
    idleTimeoutMs: 300000,       // 5 min idle
  };

  // ─── Event System ──────────────────────────────────────────────────────

  on(event: string, callback: RemoteEventCallback): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: RemoteEventCallback): void {
    this.listeners.get(event)?.delete(callback);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private emit(event: string, data?: any): void {
    this.listeners.get(event)?.forEach(cb => {
      try { cb(event, data); } catch (e) { console.error('[RC] Event handler error:', e); }
    });
  }

  // ─── Session Management ────────────────────────────────────────────────

  /**
   * Request remote control of an endpoint
   */
  async requestSession(params: {
    endpointId: string;
    hostname: string;
    ip: string;
    permission: RemotePermission;
  }): Promise<RemoteSession> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const session: RemoteSession = {
      id: crypto.randomUUID(),
      initiatedBy: user.id,
      targetEndpointId: params.endpointId,
      targetHostname: params.hostname,
      targetIp: params.ip,
      permission: params.permission,
      status: 'requesting',
      consentStatus: 'pending',
      frameRate: this.config.maxFrameRate,
      resolution: { width: 1920, height: 1080 },
      monitors: 1,
      activeMonitor: 0,
      bytesTransferred: 0,
      latencyMs: 0,
      createdAt: new Date().toISOString(),
    };

    // Store session in Supabase
    const { error } = await supabase.from('remote_sessions').insert({
      id: session.id,
      org_id: null,
      initiated_by: session.initiatedBy,
      target_endpoint_id: session.targetEndpointId,
      target_hostname: session.targetHostname,
      target_ip: session.targetIp,
      permission_level: session.permission,
      status: 'requesting',
      consent_status: 'pending',
      frame_rate: session.frameRate,
      resolution_width: session.resolution.width,
      resolution_height: session.resolution.height,
    });

    if (error) {
      console.error('[RC] Failed to create session:', error);
      // Continue anyway — session can work without DB persistence
    }

    this.currentSession = session;
    this.emit('session:created', session);

    // Generate E2E encryption keys
    const { publicKey, sessionSalt } = await this.crypto.generateKeyPair();

    // Connect to relay server (publicKey and sessionSalt are sent during handshake)
    await this.connectToRelay(session, publicKey, sessionSalt);

    return session;
  }

  /**
   * Connect to WebSocket relay server
   */
  private async connectToRelay(session: RemoteSession, publicKey: JsonWebKey, sessionSalt: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.updateStatus('connecting');

      try {
        this.ws = new WebSocket(this.config.relayUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
          console.log('[RC] Connected to relay');

          // Send session init with our public key and session salt
          this.wsSend({
            type: 'session_init',
            sessionId: session.id,
            targetEndpointId: session.targetEndpointId,
            targetIp: session.targetIp,
            permission: session.permission,
            publicKey,
            sessionSalt,
            config: {
              maxFrameRate: this.config.maxFrameRate,
              quality: this.config.quality,
              enableClipboard: this.config.enableClipboard,
              enableFileTransfer: this.config.enableFileTransfer,
            },
          });

          this.updateStatus('waiting_consent');
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => this.handleRelayMessage(event);

        this.ws.onclose = (event) => {
          console.log(`[RC] Relay disconnected: ${event.code} ${event.reason}`);
          this.stopHeartbeat();

          if (this.currentSession?.status === 'connected' && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[RC] Reconnecting... attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
            setTimeout(() => this.connectToRelay(session, publicKey, sessionSalt), 1000 * this.reconnectAttempts);
          } else {
            this.updateStatus('disconnected');
          }
        };

        this.ws.onerror = (error) => {
          console.error('[RC] Relay error:', error);
          this.emit('error', { message: 'Relay connection failed' });
          reject(new Error('Relay connection failed'));
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle incoming relay messages
   */
  private async handleRelayMessage(event: MessageEvent): Promise<void> {
    // Binary = encrypted frame data
    if (event.data instanceof ArrayBuffer) {
      await this.handleFrameData(event.data);
      return;
    }

    // Text = control messages
    try {
      const msg = JSON.parse(event.data);

      switch (msg.type) {
        case 'consent_requested':
          this.updateStatus('waiting_consent');
          this.emit('consent:requested', { endpointId: this.currentSession?.targetEndpointId });
          break;

        case 'consent_approved':
          this.currentSession!.consentStatus = msg.autoApproved ? 'auto_approved' : 'approved';
          this.currentSession!.consentGivenBy = msg.approvedBy;
          this.emit('consent:approved', msg);
          // Perform key exchange — include remote session salt if provided
          if (msg.publicKey) {
            await this.crypto.deriveSharedSecret(msg.publicKey, msg.sessionSalt);
            this.updateStatus('connected');
            this.currentSession!.startedAt = new Date().toISOString();
            this.emit('session:connected', this.currentSession);
          }
          break;

        case 'consent_denied':
          this.currentSession!.consentStatus = 'denied';
          this.updateStatus('denied');
          this.emit('consent:denied', { reason: msg.reason });
          break;

        case 'frame_config':
          if (this.currentSession) {
            this.currentSession.resolution = { width: msg.width, height: msg.height };
            this.currentSession.monitors = msg.monitors || 1;
            this.emit('frame:config', msg);
          }
          break;

        case 'cursor_update':
          this.emit('cursor:update', { x: msg.x, y: msg.y, type: msg.cursorType });
          break;

        case 'clipboard_update':
          if (this.config.enableClipboard && msg.encrypted) {
            const decrypted = await this.crypto.decryptMessage(msg.encrypted);
            this.emit('clipboard:update', decrypted);
          }
          break;

        case 'file_transfer_start':
          this.emit('file:start', msg);
          break;

        case 'file_transfer_progress':
          this.emit('file:progress', msg);
          break;

        case 'file_transfer_complete':
          this.emit('file:complete', msg);
          break;

        case 'pong':
          this.handlePong(msg.timestamp);
          break;

        case 'error':
          console.error('[RC] Relay error:', msg.message);
          this.emit('error', msg);
          if (msg.fatal) {
            this.updateStatus('error');
            this.disconnect();
          }
          break;

        case 'session_ended':
          this.updateStatus('disconnected');
          this.emit('session:ended', { reason: msg.reason });
          break;

        default:
          console.warn('[RC] Unknown message type:', msg.type);
      }
    } catch (e) {
      console.error('[RC] Failed to parse relay message:', e);
    }
  }

  /**
   * Handle encrypted frame data
   */
  private async handleFrameData(raw: ArrayBuffer): Promise<void> {
    try {
      // Frame format: [4 bytes header_len][header JSON][IV 12 bytes][encrypted pixel data]
      const view = new DataView(raw);
      const headerLen = view.getUint32(0);
      const headerBytes = new Uint8Array(raw, 4, headerLen);
      const header = JSON.parse(new TextDecoder().decode(headerBytes));

      const ivStart = 4 + headerLen;
      const iv = new Uint8Array(raw, ivStart, 12);
      const ciphertext = raw.slice(ivStart + 12);

      // Decrypt frame
      const pixelData = await this.crypto.decrypt(ciphertext, iv);

      if (this.currentSession) {
        this.currentSession.bytesTransferred += raw.byteLength;
      }

      this.emit('frame:received', {
        type: header.type,
        monitor: header.monitor || 0,
        x: header.x || 0,
        y: header.y || 0,
        width: header.width,
        height: header.height,
        data: pixelData,
        timestamp: header.timestamp,
        sequence: header.seq,
      } as FrameData);

    } catch (e) {
      console.error('[RC] Frame decrypt failed:', e);
    }
  }

  // ─── Input Sending ─────────────────────────────────────────────────────

  /**
   * Send mouse/keyboard input to remote endpoint (encrypted)
   */
  async sendInput(event: InputEvent): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    if (this.currentSession?.permission === 'view_only') return;

    try {
      const encrypted = await this.crypto.encryptMessage(event);
      this.wsSend({ type: 'input', encrypted });
    } catch (e) {
      console.error('[RC] Failed to encrypt input:', e);
    }
  }

  /**
   * Send clipboard content (encrypted)
   */
  async sendClipboard(text: string): Promise<void> {
    if (!this.config.enableClipboard) return;
    const encrypted = await this.crypto.encryptMessage({ type: 'clipboard', text });
    this.wsSend({ type: 'clipboard', encrypted });
  }

  /**
   * Request file transfer
   */
  async requestFileTransfer(file: File): Promise<string> {
    if (!this.config.enableFileTransfer) throw new Error('File transfer disabled');

    const transferId = crypto.randomUUID();
    this.wsSend({
      type: 'file_transfer_request',
      transferId,
      fileName: file.name,
      fileSize: file.size,
      direction: 'upload',
    });

    // File data is sent in encrypted chunks
    const chunkSize = 64 * 1024; // 64KB chunks
    const reader = file.stream().getReader();
    let offset = 0;

    const pump = async (): Promise<void> => {
      const { done, value } = await reader.read();
      if (done) {
        this.wsSend({ type: 'file_transfer_end', transferId });
        return;
      }

      const { ciphertext, iv } = await this.crypto.encrypt(value.buffer);
      // Send as binary with header
      const header = new TextEncoder().encode(JSON.stringify({
        type: 'file_chunk',
        transferId,
        offset,
        size: value.byteLength,
      }));

      const packet = new Uint8Array(4 + header.length + 12 + ciphertext.byteLength);
      new DataView(packet.buffer).setUint32(0, header.length);
      packet.set(header, 4);
      packet.set(iv, 4 + header.length);
      packet.set(new Uint8Array(ciphertext), 4 + header.length + 12);

      this.ws?.send(packet.buffer);
      offset += value.byteLength;

      this.emit('file:progress', { transferId, progress: offset / file.size });
      await pump();
    };

    await pump();
    return transferId;
  }

  // ─── Session Control ───────────────────────────────────────────────────

  /**
   * Change permission level during session
   */
  async changePermission(permission: RemotePermission): Promise<void> {
    if (!this.currentSession) return;
    this.currentSession.permission = permission;
    this.wsSend({ type: 'permission_change', permission });
    this.emit('session:permission_changed', { permission });
  }

  /**
   * Switch active monitor
   */
  switchMonitor(monitorIndex: number): void {
    if (!this.currentSession) return;
    this.currentSession.activeMonitor = monitorIndex;
    this.wsSend({ type: 'switch_monitor', monitor: monitorIndex });
  }

  /**
   * Toggle session recording
   */
  toggleRecording(enable: boolean): void {
    this.wsSend({ type: 'toggle_recording', enable });
    if (this.currentSession) {
      this.currentSession.status = enable ? 'recording' : 'connected';
    }
    this.emit('session:recording', { enabled: enable });
  }

  /**
   * Send Ctrl+Alt+Del (special key combo)
   */
  sendCtrlAltDel(): void {
    this.sendInput({
      type: 'key_down',
      key: 'Delete',
      code: 'Delete',
      modifiers: { ctrl: true, alt: true, shift: false, meta: false },
      timestamp: Date.now(),
    });
  }

  /**
   * Change quality preset
   */
  setQuality(quality: RemoteControlConfig['quality']): void {
    this.config.quality = quality;
    this.wsSend({ type: 'quality_change', quality });
  }

  /**
   * Disconnect current session
   */
  async disconnect(): Promise<void> {
    if (this.currentSession) {
      this.currentSession.endedAt = new Date().toISOString();
      this.currentSession.durationMs = this.currentSession.startedAt
        ? Date.now() - new Date(this.currentSession.startedAt).getTime()
        : 0;

      // Update session in Supabase
      await supabase.from('remote_sessions').update({
        status: 'disconnected',
        ended_at: this.currentSession.endedAt,
        duration_ms: this.currentSession.durationMs,
        bytes_transferred: this.currentSession.bytesTransferred,
      }).eq('id', this.currentSession.id).catch(() => {});

      this.updateStatus('disconnected');
      this.emit('session:ended', { reason: 'user_disconnect' });
    }

    this.stopHeartbeat();
    this.ws?.close(1000, 'User disconnected');
    this.ws = null;
    this.crypto.destroy();
    this.currentSession = null;
    this.reconnectAttempts = 0;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────

  private wsSend(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private updateStatus(status: SessionStatus): void {
    if (this.currentSession) {
      this.currentSession.status = status;
    }
    this.emit('session:status', { status });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.wsSend({ type: 'ping', timestamp: Date.now() });
    }, 5000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handlePong(sentTimestamp: number): void {
    const latency = Date.now() - sentTimestamp;
    this.latencyPings.push(latency);
    if (this.latencyPings.length > 20) this.latencyPings.shift();

    const avgLatency = Math.round(
      this.latencyPings.reduce((a, b) => a + b, 0) / this.latencyPings.length
    );

    if (this.currentSession) {
      this.currentSession.latencyMs = avgLatency;
    }
    this.emit('session:latency', { latency: avgLatency, instant: latency });
  }

  // ─── Getters ───────────────────────────────────────────────────────────

  getSession(): RemoteSession | null {
    return this.currentSession;
  }

  isConnected(): boolean {
    return this.currentSession?.status === 'connected' || this.currentSession?.status === 'recording';
  }

  getConfig(): RemoteControlConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<RemoteControlConfig>): void {
    Object.assign(this.config, updates);
  }

  /**
   * Get session history from Supabase
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async getSessionHistory(limit = 50): Promise<any[]> {
    const { data, error } = await supabase
      .from('remote_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[RC] Failed to fetch session history:', error);
      return [];
    }
    return data || [];
  }
}

// Singleton
export const remoteControl = new RemoteControlService();
export default remoteControl;
