import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilLock } from "@iconscout/react-unicons";
import { DocHeader, FeatureList, CodeBlock } from "../components";

export function AuthSection() {
  return (
    <div className="space-y-6">
      <DocHeader icon={UilLock} title="Authentication" description="Supabase Auth flow with credential storage and device fingerprinting" status="ready" />

      <Card><CardHeader><CardTitle>How it works</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Authentication uses <strong className="text-foreground">Supabase Auth</strong> with email/password and GitHub OAuth.
            The <code className="text-primary">AuthProvider</code> context (in <code className="text-primary">contexts/auth.tsx</code>)
            wraps the entire app and provides <code className="text-primary">isAuthenticated</code>,
            <code className="text-primary">signIn</code>, <code className="text-primary">signUp</code>, and
            <code className="text-primary">signOut</code> functions.</p>
          <p>When "Remember Me" is checked, credentials are encrypted and stored locally via
            <code className="text-primary mx-1">credentialStorage</code> with <strong className="text-foreground">AES-256-GCM</strong>
            encryption keyed to the device fingerprint.</p>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Auth Flow</CardTitle></CardHeader>
        <CardContent>
          <CodeBlock>
            <div className="text-zinc-500"># Auth.tsx — Login flow</div>
            <div>&nbsp;</div>
            <div><span className="text-emerald-500">1.</span> Check if device has stored credentials (credentialStorage)</div>
            <div><span className="text-emerald-500">2.</span> If stored + device recognized → auto-login attempt</div>
            <div><span className="text-emerald-500">3.</span> Otherwise → show login/signup form</div>
            <div><span className="text-emerald-500">4.</span> On submit → supabase.auth.signInWithPassword()</div>
            <div><span className="text-emerald-500">5.</span> If "Remember Me" → encrypt + store credentials</div>
            <div><span className="text-emerald-500">6.</span> Navigate to / (Dashboard)</div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># OAuth callback (GitHub)</div>
            <div><span className="text-emerald-500">1.</span> supabase.auth.signInWithOAuth(&#123; provider: 'github' &#125;)</div>
            <div><span className="text-emerald-500">2.</span> Redirect to GitHub → authorize → callback</div>
            <div><span className="text-emerald-500">3.</span> Parse hash params (#access_token=...)</div>
            <div><span className="text-emerald-500">4.</span> supabase.auth.setSession(access_token, refresh_token)</div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardHeader><CardTitle>Credential Storage</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>The <code className="text-primary">credentialStorage</code> service encrypts credentials at rest:</p>
          <CodeBlock>
            <div className="text-zinc-500"># credentialStorage.ts</div>
            <div>&nbsp;</div>
            <div><span className="text-primary">Algorithm</span>:  AES-256-GCM</div>
            <div><span className="text-primary">UilKeySkeleton</span>:        PBKDF2 (100,000 iterations, SHA-256)</div>
            <div><span className="text-primary">Salt</span>:       Device fingerprint hash</div>
            <div><span className="text-primary">Storage</span>:    localStorage (encrypted blob)</div>
            <div>&nbsp;</div>
            <div className="text-zinc-500"># deviceFingerprint.ts</div>
            <div><span className="text-primary">Inputs</span>:     userAgent + language + timezone + screen + platform</div>
            <div><span className="text-primary">Hash</span>:       SHA-256 of concatenated inputs</div>
            <div><span className="text-primary">Purpose</span>:    Unique device ID for credential encryption key</div>
          </CodeBlock>
        </CardContent></Card>

      <Card><CardContent className="pt-6"><FeatureList items={[
        { text: "Email/password authentication via Supabase Auth", status: "done" },
        { text: "GitHub OAuth integration", status: "done" },
        { text: "Remember Me with AES-256-GCM encrypted credential storage", status: "done" },
        { text: "Device fingerprinting for credential key derivation", status: "done" },
        { text: "Auto-login on recognized devices", status: "done" },
        { text: "Protected routes — redirect to /auth if not authenticated", status: "done" },
        { text: "Session persistence via Supabase refresh tokens", status: "done" },
      ]} /></CardContent></Card>
    </div>
  );
}
