import { useState } from 'react';
import {
  UilArrowLeft, UilEnvelope, UilCommentDots, UilShield, UilBug,
  UilQuestionCircle, UilPlaneFly,
} from '@iconscout/react-unicons';

const TOPICS = [
  { id: 'general', label: 'General Inquiry', icon: UilQuestionCircle },
  { id: 'support', label: 'Technical Support', icon: UilCommentDots },
  { id: 'security', label: 'Security Issue', icon: UilShield },
  { id: 'bug', label: 'UilBug Report', icon: UilBug },
  { id: 'billing', label: 'Billing / Refund', icon: UilEnvelope },
] as const;

export default function Contact() {
  const [topic, setTopic] = useState('general');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [ticketId, setTicketId] = useState('');

  const SUPABASE_URL = 'https://gvskdopsigtflbbylyto.supabase.co';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');

    const topicLabel = TOPICS.find(t => t.id === topic)?.label || 'Contact';

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/contact-form`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, topic, topicLabel, message }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const result = await res.json();
      setTicketId(result.ticket_id || '');
      setSubmitted(true);
    } catch {
      setError('Failed to send message. Please try again or email support@crowbyte.io directly.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-400">
      <div className="max-w-3xl mx-auto px-5 py-16">
        <button
          onClick={() => { window.location.href = '/'; }}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-blue-500 transition-colors mb-8 font-['JetBrains_Mono'] cursor-pointer"
        >
          <UilArrowLeft className="w-3.5 h-3.5" />
          Back to CrowByte
        </button>

        <div className="flex items-center gap-3 mb-12">
          <img src="/crowbyte-logo.png" alt="CrowByte" className="w-10 h-10 object-contain" />
          <span className="text-xl font-bold text-white tracking-tight">
            Crow<span className="text-blue-500">Byte</span>
          </span>
        </div>

        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Contact Us</h1>
        <p className="text-[15px] text-zinc-500 mb-10">
          Have a question, found a bug, or need help? Reach out and we&rsquo;ll get back to you within 24 hours.
        </p>

        {submitted ? (
          <div className="bg-green-500/5 border border-green-500/10 rounded-lg px-6 py-8 text-center">
            <p className="text-green-400 font-semibold text-lg mb-2">Message sent</p>
            {ticketId && (
              <p className="text-zinc-400 text-sm mb-3 font-mono">Ticket: <span className="text-blue-400">{ticketId}</span></p>
            )}
            <p className="text-zinc-500 text-sm">
              We&rsquo;ve received your message and will respond within 24 hours to <span className="text-zinc-300">{email}</span>.
            </p>
            <button
              onClick={() => setSubmitted(false)}
              className="mt-4 text-xs text-zinc-600 hover:text-zinc-400 transition-colors cursor-pointer"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Topic selector */}
            <div>
              <label className="block text-sm text-zinc-300 font-medium mb-3">Topic</label>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTopic(t.id)}
                      className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm border transition-all cursor-pointer ${
                        topic === t.id
                          ? 'bg-blue-500/10 text-blue-400'
                          : 'bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:border-white/[0.12] hover:text-zinc-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm text-zinc-300 font-medium mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/40 transition-colors"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-zinc-300 font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/40 transition-colors"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm text-zinc-300 font-medium mb-2">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={6}
                placeholder="Tell us what's up..."
                className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/40 transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              <UilPlaneFly className="w-4 h-4" />
              {sending ? 'Sending...' : 'Send Message'}
            </button>
            {error && !submitted && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
          </form>
        )}

        {/* Response time */}
        <div className="mt-12 pt-8 border-t border-white/[0.04]">
          <h2 className="text-lg font-semibold text-zinc-200 mb-4">Response Times</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
              <p className="text-sm text-zinc-300 font-medium">General</p>
              <p className="text-xs text-zinc-600 mt-1">Within 24 hours</p>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
              <p className="text-sm text-zinc-300 font-medium">Technical Support</p>
              <p className="text-xs text-zinc-600 mt-1">Within 12 hours</p>
            </div>
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-4">
              <p className="text-sm text-zinc-300 font-medium">Security Issues</p>
              <p className="text-xs text-zinc-600 mt-1">Within 4 hours</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
