export default function Footer() {
  return (
    <footer className="px-6">
      <div className="mx-auto max-w-5xl py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div>
          <span className="font-['JetBrains_Mono'] text-sm text-white font-semibold">
            CrowByte
          </span>
          <p className="font-['JetBrains_Mono'] text-sm text-zinc-500 mt-1">
            Offensive security platform.
          </p>
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => { window.location.hash = '#/documentation'; }}
            className="font-['JetBrains_Mono'] text-sm text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            Docs
          </button>
          <a
            href="#pricing"
            className="font-['JetBrains_Mono'] text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Pricing
          </a>
          <a
            href="mailto:support@crowbyte.io"
            className="font-['JetBrains_Mono'] text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Contact
          </a>
        </div>
      </div>
      <div className="mx-auto max-w-5xl border-t border-white/[0.06] py-6 flex items-center justify-center">
        <span className="font-['JetBrains_Mono'] text-sm text-zinc-600">
          &copy; 2026 HLSITech
        </span>
      </div>
    </footer>
  );
}
