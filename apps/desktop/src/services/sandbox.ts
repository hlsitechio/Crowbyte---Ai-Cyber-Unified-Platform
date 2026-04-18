import { supabase } from '@/lib/supabase';
import type { ShieldVerdict, SandboxConfig, SandboxStatus, ThreatVerdict, BehaviorReport } from './shield';

// ── Sandbox Orchestrator ──────────────────────────────────
// Manages container lifecycle for file detonation.
// In Electron: talks to local Podman/Docker via IPC.
// In Web: talks to CrowByte API which manages containers on VPS.

export interface SandboxSubmission {
  file: File;
  config?: Partial<SandboxConfig>;
}

export interface SandboxProgress {
  stage: 'uploading' | 'queued' | 'creating_container' | 'executing' | 'analyzing' | 'scanning' | 'generating_report' | 'completed' | 'failed';
  progress: number; // 0-100
  message: string;
  elapsed_ms: number;
}

export type SandboxProgressCallback = (progress: SandboxProgress) => void;

const DEFAULT_CONFIG: SandboxConfig = {
  timeout_seconds: 60,
  network_enabled: false,
  image: 'crowbyte-shield-sandbox:latest',
  analysis_modules: ['yara', 'strace', 'network', 'filesystem'],
};

const ANALYSIS_MODULES = [
  { id: 'yara', name: 'YARA Signatures', description: 'Scan against YARA rule database' },
  { id: 'strace', name: 'Syscall Tracing', description: 'Monitor system calls during execution' },
  { id: 'network', name: 'Network Capture', description: 'Capture DNS queries and connections' },
  { id: 'filesystem', name: 'Filesystem Monitor', description: 'Track file creation, modification, deletion' },
  { id: 'registry', name: 'Registry Monitor', description: 'Track registry key changes (Windows samples)' },
  { id: 'memory', name: 'Memory Analysis', description: 'Dump and analyze process memory' },
  { id: 'strings', name: 'String Extraction', description: 'Extract and analyze embedded strings' },
  { id: 'entropy', name: 'Entropy Analysis', description: 'Detect packed/encrypted sections' },
] as const;

class SandboxService {
  private activeSubmissions = new Map<string, SandboxProgressCallback>();

  getAvailableModules() {
    return ANALYSIS_MODULES;
  }

  getDefaultConfig(): SandboxConfig {
    return { ...DEFAULT_CONFIG };
  }

  // Submit a file for sandbox detonation
  async submit(submission: SandboxSubmission, onProgress?: SandboxProgressCallback): Promise<ShieldVerdict> {
    const { file, config } = submission;
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };

    // Hash the file
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const fileHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const startTime = Date.now();

    const notify = (stage: SandboxProgress['stage'], progress: number, message: string) => {
      onProgress?.({
        stage,
        progress,
        message,
        elapsed_ms: Date.now() - startTime,
      });
    };

    notify('uploading', 5, 'Hashing file...');

    // Create verdict record in DB
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error('User not authenticated');

    const emptyReport: BehaviorReport = {
      processes_spawned: [],
      files_created: [],
      files_modified: [],
      files_deleted: [],
      registry_modified: [],
      dns_queries: [],
      connections: [],
      syscalls_suspicious: [],
      mutexes_created: [],
      persistence_mechanisms: [],
      evasion_techniques: [],
      summary: '',
    };

    const { data: verdict, error } = await supabase
      .from('shield_verdicts')
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_hash: fileHash,
        file_size: file.size,
        sandbox_status: 'queued' as SandboxStatus,
        verdict: 'unknown' as ThreatVerdict,
        score: 0,
        duration_ms: 0,
        behavior_report: emptyReport,
        network_iocs: [],
        dropped_files: [],
        screenshots: [],
        mitre_techniques: [],
        sandbox_config: mergedConfig,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create sandbox submission: ${error.message}`);

    notify('queued', 10, 'Submission queued');

    // In the future, this triggers the actual container execution via:
    // - Electron IPC → local Podman
    // - Or API call → VPS container orchestrator
    // For now, we store the submission and the daemon picks it up

    if (onProgress) {
      this.activeSubmissions.set(verdict.id, onProgress);
    }

    return verdict;
  }

  // Poll verdict status (used by UI to track progress)
  async pollVerdict(id: string): Promise<ShieldVerdict> {
    const { data, error } = await supabase
      .from('shield_verdicts')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(`Failed to poll verdict: ${error.message}`);
    return data;
  }

  // Cancel a running sandbox
  async cancel(id: string): Promise<void> {
    const { error } = await supabase
      .from('shield_verdicts')
      .update({
        sandbox_status: 'failed' as SandboxStatus,
        completed_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw new Error(`Failed to cancel sandbox: ${error.message}`);
    this.activeSubmissions.delete(id);
  }

  // Get file type info from magic bytes
  identifyFileType(buffer: ArrayBuffer): { type: string; description: string; suspicious: boolean } {
    const bytes = new Uint8Array(buffer.slice(0, 16));

    const signatures: { bytes: number[]; type: string; description: string; suspicious: boolean }[] = [
      { bytes: [0x4D, 0x5A], type: 'PE', description: 'Windows Executable (PE)', suspicious: true },
      { bytes: [0x7F, 0x45, 0x4C, 0x46], type: 'ELF', description: 'Linux Executable (ELF)', suspicious: true },
      { bytes: [0x50, 0x4B, 0x03, 0x04], type: 'ZIP', description: 'ZIP Archive', suspicious: false },
      { bytes: [0x50, 0x4B, 0x05, 0x06], type: 'ZIP', description: 'ZIP Archive (empty)', suspicious: false },
      { bytes: [0x52, 0x61, 0x72, 0x21], type: 'RAR', description: 'RAR Archive', suspicious: false },
      { bytes: [0x25, 0x50, 0x44, 0x46], type: 'PDF', description: 'PDF Document', suspicious: false },
      { bytes: [0xD0, 0xCF, 0x11, 0xE0], type: 'OLE', description: 'Microsoft Office (OLE)', suspicious: true },
      { bytes: [0x89, 0x50, 0x4E, 0x47], type: 'PNG', description: 'PNG Image', suspicious: false },
      { bytes: [0xFF, 0xD8, 0xFF], type: 'JPEG', description: 'JPEG Image', suspicious: false },
      { bytes: [0x1F, 0x8B], type: 'GZIP', description: 'GZIP Archive', suspicious: false },
      { bytes: [0xCA, 0xFE, 0xBA, 0xBE], type: 'MACH-O', description: 'macOS Executable (Mach-O)', suspicious: true },
      { bytes: [0x23, 0x21], type: 'SCRIPT', description: 'Script (shebang)', suspicious: true },
    ];

    for (const sig of signatures) {
      const match = sig.bytes.every((b, i) => bytes[i] === b);
      if (match) return { type: sig.type, description: sig.description, suspicious: sig.suspicious };
    }

    // Check for text-based threats
    const text = new TextDecoder().decode(bytes);
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      return { type: 'HTML', description: 'HTML Document', suspicious: false };
    }
    if (text.startsWith('<?xml') || text.startsWith('<svg')) {
      return { type: 'XML', description: 'XML Document', suspicious: false };
    }

    return { type: 'UNKNOWN', description: 'Unknown file type', suspicious: false };
  }

  // Calculate file entropy (higher = more likely packed/encrypted)
  calculateEntropy(buffer: ArrayBuffer): number {
    const bytes = new Uint8Array(buffer);
    const freq = new Array(256).fill(0);
    for (const b of bytes) freq[b]++;

    let entropy = 0;
    const len = bytes.length;
    for (let i = 0; i < 256; i++) {
      if (freq[i] === 0) continue;
      const p = freq[i] / len;
      entropy -= p * Math.log2(p);
    }
    return entropy; // max 8.0, >7.0 = likely packed/encrypted
  }

  // Extract printable strings from binary
  extractStrings(buffer: ArrayBuffer, minLength = 4): string[] {
    const bytes = new Uint8Array(buffer);
    const strings: string[] = [];
    let current = '';

    for (const byte of bytes) {
      if (byte >= 32 && byte <= 126) {
        current += String.fromCharCode(byte);
      } else {
        if (current.length >= minLength) strings.push(current);
        current = '';
      }
    }
    if (current.length >= minLength) strings.push(current);

    return strings;
  }
}

export const sandboxService = new SandboxService();
export default sandboxService;
