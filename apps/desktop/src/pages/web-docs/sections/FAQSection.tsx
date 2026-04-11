import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UilQuestionCircle } from "@iconscout/react-unicons";
function QA({ q, a }: { q: string; a: string }) {
  return (
    <Card className="border-border/50 bg-card/30">
      <CardContent className="pt-4">
        <div className="text-sm font-medium text-foreground mb-2">{q}</div>
        <div className="text-sm text-muted-foreground">{a}</div>
      </CardContent>
    </Card>
  );
}

export function FAQSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilQuestionCircle size={32} className="text-primary" />
          FAQ
        </h1>
        <p className="text-muted-foreground">Frequently asked questions about CrowByte</p>
        <div className="h-px bg-border" />
      </div>

      <div className="space-y-3">
        <QA
          q="What is CrowByte?"
          a="CrowByte Terminal is a security operations platform for bug bounty hunters, penetration testers, and security researchers. It combines AI-powered analysis with 95+ security tools, CVE tracking, operation management, and more — all in one interface."
        />
        <QA
          q="Is CrowByte open source?"
          a="No, CrowByte is proprietary software. The source code is not publicly available. We focus on building a premium security tool and keeping our competitive edge."
        />
        <QA
          q="What platforms does CrowByte support?"
          a="CrowByte is available as a web app (crowbyte.io) and as a desktop app for Linux. Windows and macOS desktop builds are coming soon. Some features like the integrated terminal and full network scanning require the desktop app."
        />
        <QA
          q="Is the beta free?"
          a="Yes! During the beta period, all users get Pro-level access for free. Once Stripe integration is live, pricing tiers will activate — but beta testers will receive discounted pricing."
        />
        <QA
          q="What AI models are available?"
          a="CrowByte supports multiple AI providers. Free tier users get access to open-source models like DeepSeek V3.2, Qwen3 Coder, Mistral Large, and more. Pro users additionally get Claude (Opus, Sonnet, Haiku) from Anthropic."
        />
        <QA
          q="How is my data protected?"
          a="All data is encrypted in transit (TLS 1.3), stored with row-level security (users can only see their own data), and credentials in the desktop app are encrypted at rest with AES-256-GCM. We don't sell or share your data."
        />
        <QA
          q="Can I use CrowByte for professional pentesting?"
          a="Absolutely. CrowByte is built for professional security work. It includes operation tracking, finding documentation, and evidence management — everything you need for professional engagements and bug bounty hunting."
        />
        <QA
          q="What's the difference between web and desktop?"
          a="The web app provides access to most features: AI chat, CVE database, knowledge base, bookmarks, operations, and tools. The desktop app adds: integrated terminal, local network scanning, AI monitoring with system-level access, and encrypted credential storage."
        />
        <QA
          q="How do I get beta access?"
          a="Create an account at crowbyte.io, go to Settings → Billing, and submit the beta access request form. You'll be notified by email when approved."
        />
        <QA
          q="Can I self-host CrowByte?"
          a="Self-hosting is not currently supported. CrowByte uses cloud services for data sync, AI inference, and authentication. A self-hosted option may be considered for Enterprise tier in the future."
        />
      </div>
    </div>
  );
}
