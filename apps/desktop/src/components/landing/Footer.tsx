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
          <a
            href="https://github.com/hlsitechio/crowbyte"
            target="_blank"
            rel="noopener noreferrer"
            className="font-['JetBrains_Mono'] text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            GitHub
          </a>
          <a
            href="/#/documentation"
            className="font-['JetBrains_Mono'] text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Docs
          </a>
          <a
            href="#"
            className="font-['JetBrains_Mono'] text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Status
          </a>
        </div>
      </div>
      <div className="mx-auto max-w-5xl border-t border-white/[0.06] py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <span className="font-['JetBrains_Mono'] text-sm text-zinc-500">
          &copy; 2026 HLSITech
        </span>
        <span className="font-['JetBrains_Mono'] text-sm text-zinc-500">
          Montreal, Canada
        </span>
      </div>
    </footer>
  );
}
