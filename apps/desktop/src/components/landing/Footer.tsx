import {
  Skull,
  GithubLogo,
  XLogo,
  DiscordLogo,
  LinkedinLogo,
} from "@phosphor-icons/react";

/* ------------------------------------------------------------------ */
/*  Link data                                                          */
/* ------------------------------------------------------------------ */

interface FooterLink {
  label: string;
  href: string;
}

const productLinks: FooterLink[] = [
  { label: "Features", href: "/#/features" },
  { label: "Pricing", href: "/#/pricing" },
  { label: "Documentation", href: "/#/documentation" },
  { label: "Changelog", href: "/#/changelog" },
  { label: "Roadmap", href: "/#/roadmap" },
  { label: "Status", href: "/#/status" },
];

const resourceLinks: FooterLink[] = [
  { label: "Blog", href: "/#/blog" },
  { label: "Tutorials", href: "/#/tutorials" },
  { label: "API Reference", href: "/#/api" },
  { label: "Community", href: "/#/community" },
  { label: "Bug Bounty Program", href: "/#/bounty" },
  { label: "Security Advisories", href: "/#/advisories" },
];

const companyLinks: FooterLink[] = [
  { label: "About HLSITech", href: "/#/about" },
  { label: "Careers", href: "/#/careers" },
  { label: "Contact", href: "/#/contact" },
  { label: "Press Kit", href: "/#/press" },
];

const legalLinks: FooterLink[] = [
  { label: "Terms of Service", href: "/#/terms" },
  { label: "Privacy Policy", href: "/#/privacy" },
  { label: "Acceptable Use", href: "/#/acceptable-use" },
  { label: "EULA", href: "/#/eula" },
  { label: "Cookie Policy", href: "/#/cookies" },
  { label: "GDPR", href: "/#/gdpr" },
];

const socialLinks = [
  {
    icon: GithubLogo,
    href: "https://github.com/hlsitech/crowbyte",
    label: "GitHub",
  },
  { icon: XLogo, href: "https://x.com/crowbyte_io", label: "X" },
  {
    icon: DiscordLogo,
    href: "https://discord.gg/crowbyte",
    label: "Discord",
  },
  {
    icon: LinkedinLogo,
    href: "https://linkedin.com/company/hlsitech",
    label: "LinkedIn",
  },
];

/* ------------------------------------------------------------------ */
/*  Column component                                                   */
/* ------------------------------------------------------------------ */

function LinkColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  return (
    <div>
      <h4 className="text-white text-sm font-semibold font-['JetBrains_Mono'] mb-4">
        {title}
      </h4>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.label}>
            <a
              href={link.href}
              className="text-zinc-500 hover:text-zinc-300 text-sm font-['Inter'] transition-colors"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function Footer() {
  return (
    <footer className="bg-white/[0.02] border-t border-white/[0.06]">
      <div className="mx-auto max-w-7xl py-16 px-6">
        {/* Columns */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand — spans 2 cols on desktop */}
          <div className="col-span-2">
            {/* Logo */}
            <div className="flex items-center gap-2 mb-4">
              <Skull
                size={24}
                weight="duotone"
                className="text-emerald-500"
              />
              <span className="text-lg font-bold tracking-tight font-['JetBrains_Mono']">
                Crow<span className="text-emerald-500">Byte</span>
              </span>
            </div>

            {/* Tagline */}
            <p className="text-zinc-500 text-sm font-['Inter'] max-w-xs leading-relaxed mb-6">
              The offensive security platform built by hackers, for hackers.
            </p>

            {/* Social icons */}
            <div className="flex items-center gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="text-zinc-500 hover:text-white transition-colors"
                >
                  <social.icon size={20} weight="duotone" />
                </a>
              ))}
            </div>
          </div>

          {/* Product */}
          <LinkColumn title="Product" links={productLinks} />

          {/* Resources */}
          <LinkColumn title="Resources" links={resourceLinks} />

          {/* Company */}
          <LinkColumn title="Company" links={companyLinks} />

          {/* Legal */}
          <LinkColumn title="Legal" links={legalLinks} />
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/[0.04] pt-8 mt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            <span className="text-zinc-600 text-xs font-['Inter']">
              &copy; 2026 HLSITech. All rights reserved.
            </span>
            <span className="text-zinc-600 text-xs font-['Inter'] inline-flex items-center gap-1.5">
              Made with{" "}
              <Skull size={12} weight="fill" className="text-zinc-600" />{" "}
              in Montreal, Canada
            </span>
          </div>
          <div className="text-center mt-3">
            <span className="text-zinc-700 text-[10px] font-['Inter']">
              ECCN 5D002
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
