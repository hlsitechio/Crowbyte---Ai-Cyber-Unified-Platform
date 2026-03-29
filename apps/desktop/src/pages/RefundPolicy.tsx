import { ArrowLeft } from 'lucide-react';

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-400">
      <div className="max-w-3xl mx-auto px-5 py-16">
        <button
          onClick={() => { window.location.href = '/'; }}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-blue-500 transition-colors mb-8 font-['JetBrains_Mono'] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to CrowByte
        </button>

        <div className="flex items-center gap-3 mb-12">
          <img src="/crowbyte-logo.png" alt="CrowByte" className="w-10 h-10 object-contain" />
          <span className="text-xl font-bold text-white tracking-tight">
            Crow<span className="text-blue-500">Byte</span>
          </span>
        </div>

        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Refund Policy</h1>
        <p className="text-xs text-zinc-600 mb-10">Last updated: March 27, 2026</p>

        <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg px-5 py-4 mb-4">
          <p className="text-zinc-200 text-[15px] m-0">We want you to be satisfied with CrowByte. If you&rsquo;re not happy, we offer a straightforward 14-day money-back guarantee on all paid plans.</p>
        </div>

        <Section title="1. 14-Day Money-Back Guarantee">
          <p>If you&rsquo;re not satisfied with your CrowByte subscription, you can request a full refund within 14 days of your initial purchase. No questions asked.</p>
        </Section>

        <Section title="2. How to Request a Refund">
          <ul className="list-disc pl-5 space-y-2 text-[15px]">
            <li>Email <a href="mailto:support@crowbyte.io" className="text-blue-500 hover:underline">support@crowbyte.io</a> with your account email and the reason for your refund (optional but appreciated).</li>
            <li>Refunds are processed within 5-10 business days through Paddle, our payment processor.</li>
            <li>The refund will be issued to your original payment method.</li>
          </ul>
        </Section>

        <Section title="3. After 14 Days">
          <p>After the 14-day guarantee period:</p>
          <ul className="list-disc pl-5 space-y-2 text-[15px] mt-3">
            <li>You may cancel your subscription at any time — you retain access until the end of your billing period.</li>
            <li>Partial refunds for unused time are generally not provided, but we review requests on a case-by-case basis.</li>
            <li>If you experience a technical issue that prevents you from using the Service, contact support and we&rsquo;ll work to resolve it or issue a refund.</li>
          </ul>
        </Section>

        <Section title="4. Plan Changes">
          <ul className="list-disc pl-5 space-y-2 text-[15px]">
            <li><strong className="text-zinc-300">Upgrade:</strong> When upgrading (e.g., Pro to Team), you&rsquo;ll be charged the prorated difference immediately. The new plan takes effect immediately.</li>
            <li><strong className="text-zinc-300">Downgrade:</strong> When downgrading, the change takes effect at the end of your current billing period. No partial refund is issued for the remaining time on the higher plan.</li>
          </ul>
        </Section>

        <Section title="5. Annual Subscriptions">
          <p>Annual subscriptions are eligible for a full refund within 14 days of purchase. After 14 days, you may request a prorated refund for the remaining unused months, minus a 15% early termination fee.</p>
        </Section>

        <Section title="6. Exceptions">
          <p>Refunds will NOT be issued in the following cases:</p>
          <ul className="list-disc pl-5 space-y-2 text-[15px] mt-3">
            <li>Account terminated due to Terms of Service violations.</li>
            <li>Fraudulent purchase or chargeback abuse.</li>
            <li>Duplicate refund requests for the same billing period.</li>
          </ul>
        </Section>

        <Section title="7. Free Tier">
          <p>The Free tier is, well, free. No payment is required and no refund applies.</p>
        </Section>

        <Section title="8. Enterprise Plans">
          <p>Enterprise plans have custom billing terms. Refund policies for Enterprise customers are defined in your individual agreement.</p>
        </Section>

        <Section title="9. Contact">
          <p>For refund requests or billing questions: <a href="mailto:support@crowbyte.io" className="text-blue-500 hover:underline">support@crowbyte.io</a></p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-9 pt-5 border-t border-white/[0.04]">
      <h2 className="text-lg font-semibold text-zinc-200 mb-3">{title}</h2>
      <div className="text-[15px] leading-relaxed space-y-3">{children}</div>
    </div>
  );
}
