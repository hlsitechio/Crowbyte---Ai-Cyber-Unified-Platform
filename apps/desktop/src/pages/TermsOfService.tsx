import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
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

        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Terms of Service</h1>
        <p className="text-xs text-zinc-600 mb-10">Last updated: March 27, 2026</p>

        <Section title="1. Acceptance of Terms">
          <p>By accessing or using CrowByte (&ldquo;the Service&rdquo;), including our website at crowbyte.io, desktop application, and related tools, you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
        </Section>

        <Section title="2. Description of Service">
          <p>CrowByte is a cybersecurity operations platform providing AI-powered tools, terminal interfaces, vulnerability scanning, and security research capabilities. The Service is offered in multiple tiers: Free, Pro, Team, and Enterprise.</p>
        </Section>

        <Section title="3. Account Registration">
          <p>You must provide accurate information when creating an account. You are responsible for maintaining the security of your account credentials and license keys. You must be at least 18 years old to use the Service.</p>
        </Section>

        <Section title="4. License Keys">
          <ul className="list-disc pl-5 space-y-2 text-[15px]">
            <li>Paid plans include a universal license key valid across all your devices.</li>
            <li>License keys are personal and non-transferable.</li>
            <li>Sharing, reselling, or distributing license keys is prohibited and will result in immediate revocation.</li>
            <li>You may regenerate your key at any time from your account settings.</li>
          </ul>
        </Section>

        <Section title="5. Acceptable Use">
          <p>You agree to use CrowByte only for lawful purposes and in compliance with all applicable laws. Specifically, you must NOT:</p>
          <ul className="list-disc pl-5 space-y-2 text-[15px] mt-3">
            <li>Use the Service to attack systems you do not own or have explicit authorization to test.</li>
            <li>Use the Service for any illegal activity, including unauthorized access to computer systems.</li>
            <li>Reverse engineer, decompile, or attempt to extract the source code of the desktop application.</li>
            <li>Circumvent license key validation or access controls.</li>
            <li>Share your account or credentials with third parties.</li>
          </ul>
        </Section>

        <Section title="6. Subscriptions and Payments">
          <ul className="list-disc pl-5 space-y-2 text-[15px]">
            <li>Paid plans are billed on a recurring basis (monthly or annually) through our payment processor, Paddle.</li>
            <li>Prices are listed on our pricing page and may change with 30 days notice.</li>
            <li>All payments are processed by Paddle.com Market Limited as our Merchant of Record.</li>
            <li>You authorize Paddle to charge your payment method on a recurring basis.</li>
          </ul>
        </Section>

        <Section title="7. Cancellation">
          <p>You may cancel your subscription at any time from your account settings or by contacting support. Upon cancellation, you retain access to paid features until the end of your current billing period. After that, your account reverts to the Free tier.</p>
        </Section>

        <Section title="8. Intellectual Property">
          <p>CrowByte, its logo, design, and all related content are the property of CrowByte and its creators. You are granted a limited, non-exclusive, non-transferable license to use the Service for its intended purpose.</p>
        </Section>

        <Section title="9. Data and Privacy">
          <p>Your use of the Service is also governed by our <a href="/privacy" className="text-blue-500 hover:underline">Privacy Policy</a>. We collect minimal data necessary to operate the Service. We do not sell your personal information.</p>
        </Section>

        <Section title="10. Disclaimer of Warranties">
          <p>The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, express or implied. We do not guarantee that the Service will be uninterrupted, error-free, or that security tools will detect all vulnerabilities.</p>
        </Section>

        <Section title="11. Limitation of Liability">
          <p>To the maximum extent permitted by law, CrowByte and its creators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to damages resulting from security testing activities.</p>
        </Section>

        <Section title="12. Indemnification">
          <p>You agree to indemnify and hold harmless CrowByte from any claims, damages, or expenses arising from your use of the Service, including any unauthorized security testing conducted using our tools.</p>
        </Section>

        <Section title="13. Modifications">
          <p>We reserve the right to modify these Terms at any time. Material changes will be communicated via email or in-app notification at least 14 days before taking effect. Continued use of the Service constitutes acceptance.</p>
        </Section>

        <Section title="14. Termination">
          <p>We may suspend or terminate your account if you violate these Terms. Upon termination, your license key will be revoked and access to paid features will cease immediately.</p>
        </Section>

        <Section title="15. Governing Law">
          <p>These Terms are governed by the laws of Canada. Any disputes shall be resolved in the courts of Quebec, Canada.</p>
        </Section>

        <Section title="16. Contact">
          <p>For questions about these Terms, contact us at <a href="mailto:support@crowbyte.io" className="text-blue-500 hover:underline">support@crowbyte.io</a>.</p>
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
