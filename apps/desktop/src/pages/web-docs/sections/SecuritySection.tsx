import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilLock, UilShieldCheck, UilKeySkeleton, UilCheckCircle } from "@iconscout/react-unicons";
function Feature({ text }: { text: string }) {
  return (
    <li className="text-sm flex items-start gap-2 text-emerald-500">
      <UilCheckCircle size={14} className="mt-0.5 shrink-0" /> {text}
    </li>
  );
}

export function SecuritySection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilLock size={32} className="text-primary" />
          Security & Privacy
        </h1>
        <p className="text-muted-foreground">How CrowByte protects your data and credentials</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilShieldCheck size={20} className="text-emerald-500" /> Data Protection</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-1.5">
            <Feature text="All data encrypted in transit (TLS 1.3)" />
            <Feature text="Cloud database with row-level security — users can only access their own data" />
            <Feature text="Secure authentication with email verification" />
            <Feature text="Session management with automatic token refresh" />
            <Feature text="No telemetry or tracking beyond essential analytics" />
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilKeySkeleton size={20} className="text-amber-500" /> Credential Security (Desktop)</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            The desktop app includes an encrypted credential vault for storing API keys and sensitive tokens.
            Credentials are encrypted at rest using industry-standard encryption with device-bound key derivation.
          </p>
          <ul className="space-y-1.5">
            <Feature text="AES-256-GCM encryption at rest" />
            <Feature text="Device-bound key derivation — credentials tied to your machine" />
            <Feature text="API keys never stored in plaintext" />
            <Feature text="Secure credential injection into tool execution" />
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>What We Store</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>CrowByte stores only the data you explicitly create:</p>
          <ul className="space-y-1">
            <li className="flex items-start gap-2">- Your account profile and settings</li>
            <li className="flex items-start gap-2">- CVEs you save and bookmark</li>
            <li className="flex items-start gap-2">- Knowledge base entries you write</li>
            <li className="flex items-start gap-2">- Bookmarks, agents, and operations you create</li>
            <li className="flex items-start gap-2">- Chat history (stored locally on desktop, optional cloud sync)</li>
          </ul>
          <p className="text-xs text-zinc-600 mt-3">
            CrowByte does not sell data, share data with third parties, or use your data for training AI models.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
