import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Key } from "@phosphor-icons/react";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function DataSecuritySection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={Key} title="Data & Security Layer" description="Encryption at rest, credential vault, key derivation, and device fingerprinting" status="ready" />

      <Card><CardHeader><CardTitle>Encryption Architecture</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># encryption.ts — Core encryption service</div>
            <div>&nbsp;</div>
            <div><span className="text-primary">Algorithm</span>:    AES-256-GCM (authenticated encryption)</div>
            <div><span className="text-primary">Key Derivation</span>: PBKDF2</div>
            <div><span className="text-primary">  Iterations</span>:  100,000</div>
            <div><span className="text-primary">  Hash</span>:        SHA-256</div>
            <div><span className="text-primary">  Salt</span>:        Random 16 bytes (stored with ciphertext)</div>
            <div><span className="text-primary">IV</span>:            Random 12 bytes per encryption</div>
            <div><span className="text-primary">Output</span>:        Base64(salt + iv + ciphertext + authTag)</div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Credential Storage (credentialStorage.ts)</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Encrypted credential vault</div>
            <div>&nbsp;</div>
            <div><span className="text-emerald-500">saveCredentials(email, password)</span></div>
            <div>  1. Get device fingerprint (SHA-256 of hardware info)</div>
            <div>  2. Derive encryption key via PBKDF2 (fingerprint as passphrase)</div>
            <div>  3. Encrypt credentials with AES-256-GCM</div>
            <div>  4. Store encrypted blob in localStorage</div>
            <div>&nbsp;</div>
            <div><span className="text-emerald-500">getCredentials()</span></div>
            <div>  1. Get device fingerprint</div>
            <div>  2. Derive same key via PBKDF2</div>
            <div>  3. Decrypt blob from localStorage</div>
            <div>  4. Return &#123; email, password &#125; or null</div>
            <div>&nbsp;</div>
            <div><span className="text-emerald-500">clearCredentials()</span></div>
            <div>  Remove encrypted blob from localStorage</div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Device Fingerprinting (deviceFingerprint.ts)</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Generates unique device ID for encryption key derivation</div>
            <div>&nbsp;</div>
            <div><span className="text-primary">Inputs</span>:</div>
            <div>  - navigator.userAgent</div>
            <div>  - navigator.language</div>
            <div>  - Intl.DateTimeFormat().resolvedOptions().timeZone</div>
            <div>  - screen.width + screen.height + screen.colorDepth</div>
            <div>  - navigator.platform</div>
            <div>  - navigator.hardwareConcurrency</div>
            <div>&nbsp;</div>
            <div><span className="text-primary">Process</span>: Concatenate all → SHA-256 hash</div>
            <div><span className="text-primary">Output</span>:  64-char hex string (unique per device)</div>
            <div><span className="text-primary">Purpose</span>: Encryption key salt — credentials only decrypt on same device</div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Key Management (keyManagement.ts)</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Centralized key management service for generating, storing, and rotating encryption keys.
            Uses Web Crypto API for all cryptographic operations.</p>
          <FeatureList items={[
            { text: "Key generation via Web Crypto API (AES-GCM, 256-bit)", status: "done" },
            { text: "Key export/import in JWK format", status: "done" },
            { text: "Key rotation support (re-encrypt with new key)", status: "done" },
            { text: "Secure key storage in memory (not persisted)", status: "done" },
          ]} />
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "AES-256-GCM encryption for credentials at rest", status: "done" },
        { text: "PBKDF2 key derivation (100K iterations, SHA-256)", status: "done" },
        { text: "Device fingerprinting for credential binding", status: "done" },
        { text: "Web Crypto API for all crypto operations", status: "done" },
        { text: "Key management with rotation support", status: "done" },
        { text: "Credentials only decrypt on the original device", status: "done" },
      ]} /></CardContent></Card>
    </div>
  );
}
