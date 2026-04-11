import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilBookOpen, UilTag, UilFileUpload, UilCheckCircle } from "@iconscout/react-unicons";
function Feature({ text }: { text: string }) {
  return (
    <li className="text-sm flex items-start gap-2 text-emerald-500">
      <UilCheckCircle size={14} className="mt-0.5 shrink-0" /> {text}
    </li>
  );
}

export function KnowledgeBaseSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilBookOpen size={32} className="text-primary" />
          Knowledge Base
        </h1>
        <p className="text-muted-foreground">Cloud-synced research entries, notes, and findings</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle>Your Security Research Hub</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            The Knowledge Base is your central repository for security research. Save techniques, tool outputs,
            vulnerability writeups, and methodology notes — all synced across devices.
          </p>
          <ul className="space-y-1.5">
            <Feature text="Rich text entries with markdown support" />
            <Feature text="Category organization (Recon, Exploitation, Post-Exploitation, etc.)" />
            <Feature text="Priority levels for entry importance" />
            <Feature text="Tag system for cross-referencing" />
            <Feature text="Full-text search across all entries" />
            <Feature text="Cloud sync — access from any device" />
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilFileUpload size={20} className="text-violet-500" /> File Attachments</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Attach files to knowledge base entries — screenshots, exploit code, scan results, or any supporting evidence.</p>
          <ul className="space-y-1.5">
            <Feature text="File upload with cloud storage" />
            <Feature text="Image preview for screenshots" />
            <Feature text="Linked to parent knowledge entry" />
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><Tag size={20} className="text-amber-500" /> Categories</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {["Reconnaissance", "Web Application", "API Security", "Network", "Exploitation",
              "Post-Exploitation", "Reporting", "Tools", "Methodology", "OSINT", "Custom"].map((cat) => (
              <span key={cat} className="px-2 py-1 rounded-md bg-zinc-800 text-xs text-zinc-400 border border-zinc-700">{cat}</span>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
