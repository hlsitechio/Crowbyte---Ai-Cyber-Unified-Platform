import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
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

        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-xs text-zinc-600 mb-10">Last updated: March 27, 2026</p>

        <Section title="1. Overview">
          <p>CrowByte (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) respects your privacy. This policy explains what data we collect, why, and how we protect it. We believe in minimal data collection — we only gather what&rsquo;s necessary to operate the Service.</p>
        </Section>

        <Section title="2. Data We Collect">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr>
                  <th className="text-left py-2.5 px-3 text-zinc-300 font-semibold border-b border-white/[0.04]">Data</th>
                  <th className="text-left py-2.5 px-3 text-zinc-300 font-semibold border-b border-white/[0.04]">Purpose</th>
                  <th className="text-left py-2.5 px-3 text-zinc-300 font-semibold border-b border-white/[0.04]">Stored Where</th>
                </tr>
              </thead>
              <tbody className="text-zinc-500">
                <tr><td className="py-2.5 px-3 border-b border-white/[0.04]">Email address</td><td className="py-2.5 px-3 border-b border-white/[0.04]">Account authentication, notifications</td><td className="py-2.5 px-3 border-b border-white/[0.04]">Supabase (encrypted)</td></tr>
                <tr><td className="py-2.5 px-3 border-b border-white/[0.04]">Name (optional)</td><td className="py-2.5 px-3 border-b border-white/[0.04]">Display in app</td><td className="py-2.5 px-3 border-b border-white/[0.04]">Supabase</td></tr>
                <tr><td className="py-2.5 px-3 border-b border-white/[0.04]">Profile picture (optional)</td><td className="py-2.5 px-3 border-b border-white/[0.04]">Display in app</td><td className="py-2.5 px-3 border-b border-white/[0.04]">Supabase Storage</td></tr>
                <tr><td className="py-2.5 px-3 border-b border-white/[0.04]">Payment info</td><td className="py-2.5 px-3 border-b border-white/[0.04]">Subscription billing</td><td className="py-2.5 px-3 border-b border-white/[0.04]">Paddle (we never see card details)</td></tr>
                <tr><td className="py-2.5 px-3 border-b border-white/[0.04]">License key usage</td><td className="py-2.5 px-3 border-b border-white/[0.04]">Device activation tracking</td><td className="py-2.5 px-3 border-b border-white/[0.04]">Supabase</td></tr>
                <tr><td className="py-2.5 px-3 border-b border-white/[0.04]">IP address</td><td className="py-2.5 px-3 border-b border-white/[0.04]">Security, rate limiting</td><td className="py-2.5 px-3 border-b border-white/[0.04]">Server logs (30-day retention)</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="3. Data We Do NOT Collect">
          <ul className="list-disc pl-5 space-y-2 text-[15px]">
            <li>We do not track your browsing activity outside of crowbyte.io.</li>
            <li>We do not collect scan results, targets, or security findings from your use of the tools.</li>
            <li>We do not use third-party analytics or tracking pixels.</li>
            <li>We do not sell, share, or trade your personal data with third parties.</li>
            <li>The desktop application does not phone home or send telemetry unless you explicitly opt in.</li>
          </ul>
        </Section>

        <Section title="4. Authentication">
          <p>We support email/password and GitHub OAuth login via Supabase Auth. When using GitHub OAuth, we receive your public profile information (username, avatar URL, email). We do not access your repositories or private data.</p>
        </Section>

        <Section title="5. Payment Processing">
          <p>All payments are handled by Paddle.com Market Limited, our Merchant of Record. Paddle processes your payment information directly — we never receive, store, or have access to your credit card or banking details. Paddle&rsquo;s privacy policy applies to payment data: <a href="https://www.paddle.com/legal/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">paddle.com/legal/privacy</a>.</p>
        </Section>

        <Section title="6. Cookies">
          <p>We use minimal cookies:</p>
          <ul className="list-disc pl-5 space-y-2 text-[15px] mt-3">
            <li><strong className="text-zinc-300">Authentication cookie</strong> — Supabase session token (essential, cannot be disabled).</li>
            <li><strong className="text-zinc-300">Tier cache cookie</strong> — Caches your plan tier for faster page loads (4-hour expiry).</li>
          </ul>
          <p className="mt-3">We do not use advertising cookies, tracking cookies, or third-party cookies.</p>
        </Section>

        <Section title="7. Data Security">
          <ul className="list-disc pl-5 space-y-2 text-[15px]">
            <li>All connections use TLS 1.3 encryption.</li>
            <li>Passwords are hashed using bcrypt via Supabase Auth.</li>
            <li>License keys are stored with row-level security — users can only access their own keys.</li>
            <li>Server access is restricted to SSH key authentication only.</li>
            <li>We perform regular security reviews of our infrastructure.</li>
          </ul>
        </Section>

        <Section title="8. Data Retention">
          <ul className="list-disc pl-5 space-y-2 text-[15px]">
            <li>Account data is retained as long as your account is active.</li>
            <li>Server logs (IP addresses) are automatically deleted after 30 days.</li>
            <li>Upon account deletion, all personal data is permanently removed within 30 days.</li>
            <li>Revoked license keys are retained in anonymized form for fraud prevention.</li>
          </ul>
        </Section>

        <Section title="9. Your Rights">
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-2 text-[15px] mt-3">
            <li><strong className="text-zinc-300">Access</strong> your personal data (available in Settings).</li>
            <li><strong className="text-zinc-300">Correct</strong> inaccurate data (update your profile anytime).</li>
            <li><strong className="text-zinc-300">Delete</strong> your account and all associated data.</li>
            <li><strong className="text-zinc-300">Export</strong> your data in a machine-readable format.</li>
            <li><strong className="text-zinc-300">Withdraw consent</strong> for optional data processing.</li>
          </ul>
          <p className="mt-3">To exercise these rights, email <a href="mailto:support@crowbyte.io" className="text-blue-500 hover:underline">support@crowbyte.io</a>.</p>
        </Section>

        <Section title="10. Children">
          <p>CrowByte is not intended for users under 18 years of age. We do not knowingly collect data from minors.</p>
        </Section>

        <Section title="11. International Transfers">
          <p>Our infrastructure is hosted in North America and Europe. By using the Service, you consent to the transfer of data to these regions. We ensure all transfers comply with applicable data protection laws.</p>
        </Section>

        <Section title="12. Changes">
          <p>We may update this policy from time to time. Material changes will be communicated via email at least 14 days before taking effect.</p>
        </Section>

        <Section title="13. Contact">
          <p>For privacy inquiries: <a href="mailto:support@crowbyte.io" className="text-blue-500 hover:underline">support@crowbyte.io</a></p>
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
