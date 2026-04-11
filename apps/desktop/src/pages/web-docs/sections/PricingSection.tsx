import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UilDollarSign, UilCheckCircle, UilTimes } from "@iconscout/react-unicons";
function Check({ text }: { text: string }) {
  return (
    <li className="text-sm flex items-start gap-2">
      <UilCheckCircle size={14} className="text-emerald-500 mt-0.5 shrink-0" />
      <span className="text-muted-foreground">{text}</span>
    </li>
  );
}

function NoAccess({ text }: { text: string }) {
  return (
    <li className="text-sm flex items-start gap-2">
      <UilTimes size={14} className="text-zinc-600 mt-0.5 shrink-0" />
      <span className="text-zinc-600">{text}</span>
    </li>
  );
}

export function PricingSection() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 mb-6">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <UilDollarSign size={32} className="text-primary" />
          Pricing
        </h1>
        <p className="text-muted-foreground">Choose the plan that fits your security operations</p>
        <div className="h-px bg-border" />
      </div>

      <div className="grid gap-4">
        {/* Free Tier */}
        <Card className="border-zinc-700 bg-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Free</span>
              <span className="text-2xl font-bold">$0<span className="text-sm text-muted-foreground font-normal">/mo</span></span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <Check text="Dashboard with system overview" />
              <Check text="AI Chat — open-source models (DeepSeek, Qwen, Mistral, etc.)" />
              <Check text="CVE UilDatabase — search and save vulnerabilities" />
              <Check text="Knowledge Base — up to 100 entries" />
              <Check text="Bookmarks — up to 50 bookmarks" />
              <Check text="Mission Planner — basic planning" />
              <NoAccess text="Claude models (Opus, Sonnet, Haiku)" />
              <NoAccess text="Red Team Operations" />
              <NoAccess text="Cyber Ops tools" />
              <NoAccess text="Network Scanner" />
              <NoAccess text="Agent Builder" />
              <NoAccess text="Fleet Management" />
              <NoAccess text="Security Monitor" />
              <NoAccess text="Terminal access" />
            </ul>
          </CardContent>
        </Card>

        {/* Pro Tier */}
        <Card className="border-primary/50 bg-primary/5 backdrop-blur relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">RECOMMENDED</div>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-primary">Pro</span>
              <span className="text-2xl font-bold text-primary">$19<span className="text-sm text-muted-foreground font-normal">/mo</span></span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <Check text="Everything in Free" />
              <Check text="All AI model providers including Claude Opus, Sonnet, Haiku" />
              <Check text="Red Team operation tracking" />
              <Check text="Cyber Ops — full 95+ tool suite" />
              <Check text="Network Scanner — 10 nmap profiles" />
              <Check text="Agent Builder + Testing Lab" />
              <Check text="Fleet Management" />
              <Check text="Security Monitor with AI analysis" />
              <Check text="Threat Intelligence feeds" />
              <Check text="Terminal access (desktop)" />
              <Check text="Unlimited Knowledge Base entries" />
              <Check text="Unlimited Bookmarks" />
              <Check text="Analytics dashboard" />
              <Check text="Priority AI inference" />
            </ul>
          </CardContent>
        </Card>

        {/* Elite Tier */}
        <Card className="border-orange-500/30 bg-orange-500/5 backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="text-orange-500">Elite</span>
              <span className="text-2xl font-bold text-orange-500">$49<span className="text-sm text-muted-foreground font-normal">/mo</span></span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              <Check text="Everything in Pro" />
              <Check text="Priority AI access with higher rate limits" />
              <Check text="Custom agent deployment infrastructure" />
              <Check text="Dedicated support channel" />
              <Check text="Early access to new features" />
              <Check text="Custom integrations (upon request)" />
              <Check text="Team collaboration features (coming soon)" />
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">
            <strong className="text-amber-500">Beta Pricing:</strong> During beta, all users get Pro-level access for free.
            Stripe payment integration is coming soon. Beta testers will receive discounted pricing at launch.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
