import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UilRocket, UilSignin, UilUserCircle, UilBolt, UilCheckCircle } from "@iconscout/react-unicons";
export function GettingStartedSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilRocket size={32} className="text-primary" />
          Getting Started
        </h1>
        <p className="text-muted-foreground">Set up your CrowByte account and start hunting</p>
        <div className="h-px bg-border" />
      </div>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilSignin size={20} className="text-blue-500" /> 1. Create Your Account</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Sign up at <strong className="text-primary">crowbyte.io</strong> with your email address. You'll receive a confirmation email to verify your account.</p>
          <ul className="space-y-1.5 ml-4">
            <li className="flex items-start gap-2"><UilCheckCircle size={14} className="text-emerald-500 mt-0.5" /> Email + password authentication</li>
            <li className="flex items-start gap-2"><UilCheckCircle size={14} className="text-emerald-500 mt-0.5" /> Secure session management</li>
            <li className="flex items-start gap-2"><UilCheckCircle size={14} className="text-emerald-500 mt-0.5" /> Password reset via email</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilUserCircle size={20} className="text-violet-500" /> 2. Choose Your Tier</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="grid gap-3">
            <div className="p-3 rounded-lg border border-border/50 bg-card/30">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-foreground">Free</span>
                <Badge className="bg-zinc-500/10 text-zinc-400 border-zinc-500/20 text-[9px]">Default</Badge>
              </div>
              <p>Access to core features: Dashboard, Knowledge Base, Bookmarks, CVE UilDatabase, Mission Planner. AI Chat limited to select open-source models.</p>
            </div>
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-primary">Pro</span>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-[9px]">$19/mo</Badge>
              </div>
              <p>Everything in Free plus: All AI model providers, Red Team Ops, Cyber Ops, Network Scanner, Agent Builder, Fleet Management, Security Monitor, Terminal access.</p>
            </div>
            <div className="p-3 rounded-lg border bg-orange-500/5">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-orange-500">Elite</span>
                <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/20 text-[9px]">$49/mo</Badge>
              </div>
              <p>Everything in Pro plus: Priority AI access, custom agent deployment, dedicated support, early access to new features, higher rate limits.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-card/50 backdrop-blur">
        <CardHeader><CardTitle className="flex items-center gap-2"><UilBolt size={20} className="text-amber-500" /> 3. Start Using CrowByte</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>After signing in, you'll land on the <strong className="text-foreground">Dashboard</strong> — your security operations overview. From there:</p>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start gap-2"><span className="text-primary font-bold">1.</span> Open <strong className="text-foreground">AI Chat</strong> to start a conversation with any AI model</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold">2.</span> Search the <strong className="text-foreground">CVE UilDatabase</strong> for vulnerabilities affecting your targets</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold">3.</span> Create a <strong className="text-foreground">Red Team Operation</strong> to track your engagement</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold">4.</span> Use <strong className="text-foreground">Cyber Ops</strong> tools for reconnaissance and testing</li>
            <li className="flex items-start gap-2"><span className="text-primary font-bold">5.</span> Save findings to your <strong className="text-foreground">Knowledge Base</strong> for reporting</li>
          </ul>
        </CardContent>
      </Card>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <UilBolt size={20} className="text-amber-500 mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <strong className="text-amber-500">Beta Note:</strong> CrowByte is currently in closed beta. Some features are still being refined.
              If you encounter issues, use the feedback form in Settings or reach out to the team.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
