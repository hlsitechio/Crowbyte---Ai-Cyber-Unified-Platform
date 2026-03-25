# CrowByte Website — Competitive Intelligence & Build Guide

## CRITICAL: Build With 21st.dev Components

Every section of the CrowByte website MUST be built using components from [21st.dev](https://21st.dev) — the shadcn/ui component marketplace. Install via `npx shadcn@latest add "https://21st.dev/r/{author}/{component}"`. Browse, preview, and copy components directly from the platform.

### Component Map — Every Site Section

| Site Section | 21st.dev Component | URL | Notes |
|---|---|---|---|
| **Navigation** | `aceternity/floating-navbar` | [21st.dev/aceternity/floating-navbar](https://21st.dev/community/components/aceternity/floating-navbar) | Sticky, transparent, glassmorphism. Add `backdrop-blur-xl bg-black/80` on scroll |
| **Navigation (alt)** | `aceternity/resizable-navbar` | [21st.dev/aceternity/resizable-navbar](https://21st.dev/aceternity/resizable-navbar) | Shrinks/expands on scroll. Modern feel |
| **Navigation (mobile)** | Browse `mobile-navbar` category | [21st.dev/s/mobile-navbar](https://21st.dev/community/components/s/mobile-navbar) | Hamburger + slide-out drawer |
| **Hero Section** | `kinfe123/hero-section-dark` | [21st.dev/kinfe123/hero-section-dark](https://21st.dev/kinfe123/hero-section-dark/default) | Dark hero with CTA buttons. Customize with terminal mockup |
| **Hero (alt)** | `serafim/animated-hero` | [21st.dev/serafim/animated-hero](https://21st.dev/serafim/animated-hero/default) | Animated entrance. Add emerald gradient |
| **Hero (alt)** | `Codehagen/hero` | [21st.dev/Codehagen/hero](https://21st.dev/Codehagen/hero) | Hero with appear animation + hero badge ("Now in Public Beta") |
| **Hero Badge** | `Codehagen/hero-badge` | [21st.dev/Codehagen/hero-badge](https://21st.dev/Codehagen/hero-badge) | Animated badge with pulse dot for "Now in Public Beta" |
| **Hero Background** | `ravikatiyar162/animated-shader-hero` | [21st.dev/community/components/ravikatiyar162/animated-shader-hero](https://21st.dev/community/components/ravikatiyar162/animated-shader-hero) | WebGL shader background for hero. Subtle particle/grid effect |
| **Hero Background (alt)** | `cinquinandy/animated-hero-with-web-gl-glitter` | [21st.dev/community/components/cinquinandy/animated-hero-with-web-gl-glitter](https://21st.dev/community/components/cinquinandy/animated-hero-with-web-gl-glitter) | WebGL glitter particles — great for hacker aesthetic |
| **Hero Scroll** | `ui-layouts/hero-scroll-animation` | [21st.dev/ui-layouts/hero-scroll-animation](https://21st.dev/ui-layouts/hero-scroll-animation) | Parallax scroll animation on hero content |
| **Backgrounds** | Browse `background` category (40 components) | [21st.dev/s/background](https://21st.dev/s/background) | Grid patterns, dot grids, gradient meshes |
| **Grid Background** | `designali-in/grid-pattern` | [21st.dev/community/components/designali-in/grid-pattern](https://21st.dev/community/components/designali-in/grid-pattern) | Subtle grid pattern overlay for sections |
| **Social Proof / Logo Bar** | `ravikatiyar162/marquee-logo-scroller` | [21st.dev/community/components/ravikatiyar162/marquee-logo-scroller](https://21st.dev/community/components/ravikatiyar162/marquee-logo-scroller) | Infinite scrolling logo carousel (HackerOne, Bugcrowd, Intigriti, Synack) |
| **Features Section** | `aceternity/feature-section-with-bento-grid` | [21st.dev/aceternity/feature-section-with-bento-grid](https://21st.dev/aceternity/feature-section-with-bento-grid) | Bento grid layout for 9 feature cards. Modern, visual |
| **Feature Cards** | Browse `card` category (422 components) | [21st.dev/s/card](https://21st.dev/s/card) | Glassmorphism cards with hover effects for AI Chat, Terminal, Scanner, etc. |
| **Showcase Cards** | Browse `showcase-card` category | [21st.dev/s/showcase-card](https://21st.dev/s/showcase-card) | For "See It In Action" interactive demo cards |
| **Pricing Section** | Browse `pricing-section` category (17 components) | [21st.dev/community/components/s/pricing-section](https://21st.dev/community/components/s/pricing-section) | 4-tier pricing table with monthly/annual toggle. Highlight Pro as "Most Popular" |
| **Comparison Table** | Browse `comparison` category (8 components) | [21st.dev/s/comparison](https://21st.dev/s/comparison) | CrowByte vs Burp Suite vs Cobalt Strike feature comparison |
| **CTA Banners** | Browse `call-to-action` category | [21st.dev/s/call-to-action](https://21st.dev/s/call-to-action) | "Ready to level up?" final CTA section with emerald button |
| **FAQ / Accordion** | `shadcnspace/shadcn-accordion` | [21st.dev/community/components/shadcnspace/shadcn-accordion](https://21st.dev/community/components/shadcnspace/shadcn-accordion) | Clean accordion for 8 FAQ questions |
| **FAQ (alt)** | `Edil-ozi/accordion` | [21st.dev/community/components/Edil-ozi/accordion](https://21st.dev/community/components/Edil-ozi/accordion) | Animated accordion variant |
| **Testimonials** | Browse `testimonial` category (15 components) | [21st.dev/s/testimonial](https://21st.dev/s/testimonial) | Security researcher quotes with avatar + role |
| **Footer** | `prebuiltui/footer-1` | [21st.dev/community/components/prebuiltui/footer-1](https://21st.dev/community/components/prebuiltui/footer-1) | Multi-column footer (5 columns: Brand, Product, Resources, Company, Legal) |
| **Footer (alt)** | `sshahaider/footer-2` | [21st.dev/community/components/sshahaider/footer-2](https://21st.dev/community/components/sshahaider/footer-2) | Alternative footer layout |
| **Badges** | `shadcn/badge` (with-dot variant) | [21st.dev/community/components/shadcn/badge/with-dot](https://21st.dev/community/components/shadcn/badge/with-dot) | Status dots, trust badges, tier labels |
| **Animated Elements** | Browse `animate-ui` collection | [21st.dev/animate-ui](https://21st.dev/animate-ui) | Fully animated components (React + TypeScript + Tailwind + Motion) |
| **Buttons** | Browse `button` category (130 components) | [21st.dev/s/button](https://21st.dev/s/button) | Emerald filled CTA, ghost outline for secondary |
| **Tables** | Browse `table` category | [21st.dev/s/table](https://21st.dev/s/table) | For pricing comparison matrix |
| **Borders / Glow** | Browse `border` category | [21st.dev/s/border](https://21st.dev/s/border) | Animated gradient borders on hover for cards |

### How to Install

```bash
# Install any component with one command:
npx shadcn@latest add "https://21st.dev/r/{author}/{component}"

# Examples:
npx shadcn@latest add "https://21st.dev/r/aceternity/floating-navbar"
npx shadcn@latest add "https://21st.dev/r/aceternity/feature-section-with-bento-grid"
npx shadcn@latest add "https://21st.dev/r/Codehagen/hero-badge"
npx shadcn@latest add "https://21st.dev/r/ravikatiyar162/marquee-logo-scroller"
```

### Browsing by Category

| Category | Count | URL |
|---|---|---|
| Heroes | 284 | [21st.dev/s/hero](https://21st.dev/s/hero) |
| Buttons | 130 | [21st.dev/s/button](https://21st.dev/s/button) |
| Cards | 422 | [21st.dev/s/card](https://21st.dev/s/card) |
| Features | 36 | [21st.dev/s/feature](https://21st.dev/s/feature) |
| Backgrounds | 40 | [21st.dev/s/background](https://21st.dev/s/background) |
| Accordions | 69 | [21st.dev/s/accordion](https://21st.dev/s/accordion) |
| Navbars | 43 | [21st.dev/s/navbar](https://21st.dev/s/navbar) |
| Footers | 37 | [21st.dev/s/footer](https://21st.dev/s/footer) |
| Pricing | 17 | [21st.dev/s/pricing-section](https://21st.dev/community/components/s/pricing-section) |
| Testimonials | 15 | [21st.dev/s/testimonial](https://21st.dev/s/testimonial) |
| Comparison | 8 | [21st.dev/s/comparison](https://21st.dev/s/comparison) |
| CTA | varies | [21st.dev/s/call-to-action](https://21st.dev/s/call-to-action) |
| Badges | varies | [21st.dev/s/badge](https://21st.dev/s/badge) |
| Borders | varies | [21st.dev/s/border](https://21st.dev/s/border) |
| Animated UI | varies | [21st.dev/animate-ui](https://21st.dev/animate-ui) |

### Key Collections to Browse

- **Aceternity UI** — [21st.dev/aceternity](https://21st.dev/aceternity) — Premium animated components (floating navbar, bento grid, hero section). Best quality on the platform.
- **Animate UI** — [21st.dev/animate-ui](https://21st.dev/animate-ui) — Fully animated component distribution built with React + TypeScript + Tailwind + Motion.
- **UI Layouts** — [21st.dev/ui-layouts](https://21st.dev/ui-layouts) — Scroll animations, hero effects, layout patterns.
- **Codehagen** — [21st.dev/Codehagen](https://21st.dev/Codehagen) — Hero sections with badges and appear animations.

### Build Rules

1. **Every section** of the site must start from a 21st.dev component — customize from there
2. Components are shadcn/ui-compatible — they drop into any React + Tailwind project
3. All components are TypeScript-first with full source code access
4. Customize colors to CrowByte palette: emerald `#10B981`, violet `#8B5CF6`, crimson `#EF4444`, void `#000000`
5. Add Framer Motion animations on top of base components where needed
6. Use JetBrains Mono for headings/code, Inter for body text
7. Dark theme ONLY — override any light-mode defaults from components

---

## Executive Summary

CrowByte is an AI-powered offensive security platform positioned at the intersection of several mature product categories: penetration testing tools (Burp Suite, Metasploit), automated security validation (Pentera, Intruder), security training platforms (HackTheBox), developer security (Snyk, ProjectDiscovery), and red team infrastructure (Cobalt Strike). What makes CrowByte fundamentally different is its unified desktop-native command center approach — combining AI agents, an integrated terminal, vulnerability scanning, threat intelligence, red team operation management, fleet orchestration, and exploit development into a single Electron application built by hackers, for hackers.

After analyzing 10 direct and adjacent competitors, a clear market gap emerges: every competitor either looks corporate and enterprise-safe (Pentera, Rapid7, Snyk, Intruder) or technically solid but visually static (Kali.org, Metasploit, Burp Suite, Caido). HackTheBox comes closest to the hacker aesthetic with its neon green on dark navy scheme, but even they underdeliver on animations and interactivity. ProjectDiscovery's monochromatic restraint is elegant but personality-free. No competitor combines modern web design (scroll animations, interactive demos, terminal aesthetics) with authentic hacker culture and a self-serve, transparent pricing model. CrowByte's website must fill this gap — bold, animated, dark-first, AI-native, and unmistakably built for offensive security professionals.

The competitive landscape reveals three universal weaknesses CrowByte can exploit: (1) virtually no competitor uses meaningful scroll animations or interactive demos on their marketing site, (2) pricing is hidden behind "Contact Sales" walls for 7 out of 10 competitors, and (3) no competitor shows a live or simulated product demo on their landing page. CrowByte's website should be the first in this space to feel alive — with terminal typing animations, real-time data visualizations, transparent pricing, and an interactive demo that lets visitors experience the product before downloading.

---

## Competitor Landscape (Quick Reference Table)

| Competitor | URL | Tech Stack | Design Style | Pricing Model | Key Weakness |
|---|---|---|---|---|---|
| **Kali / OffSec** | kali.org / offsec.com | Static HTML + Astro/Svelte/Tailwind | Clean/utilitarian (Kali), dark/enterprise (OffSec) | Free (Kali) / $899-$6,299/yr (OffSec) | No scroll animations; no interactive demos; Kali has zero social proof |
| **Metasploit / Rapid7** | metasploit.com / rapid7.com | Static HTML (Metasploit) / Next.js + Contentful (Rapid7) | Developer-sparse (Metasploit), corporate-safe (Rapid7) | Hidden / enterprise sales-led | Metasploit is visually dead; Rapid7 is enterprise-hostile to individuals |
| **Pentera** | pentera.io | WordPress + WP Engine, jQuery, HubSpot Forms | Corporate white, purple accent, clean sans-serif | Fully gated — no pricing page (404) | Static WordPress feel; no animations; no free trial; no community |
| **Burp Suite** | portswigger.net/burp/pro | TeleportHQ (low-code), Arial only, Piwik PRO | Light/white, orange accent, generic typography | $449-$499/user/yr (single tier) | Zero animations; Arial font; no dark mode; no interactive demos; TeleportHQ builder |
| **Cobalt Strike** | cobaltstrike.com | WordPress + Gutenberg, jQuery, New Relic | Corporate green/navy, 2px border-radius, system fonts | Sales-gated — JS-loaded pricing, no free trial | Dated Java UI screenshots; corporate identity crisis; no community platform |
| **Caido** | caido.io | Nuxt.js 3 + Tailwind + PrimeVue, Work Sans font | Dark blue-gray, rose/amber accents, scroll-driven tabs | Free / ~$200/yr / Team / Custom | No video; no interactive demos; async price loading broken; dark-only |
| **ProjectDiscovery** | projectdiscovery.io | Next.js (RSC) + Tailwind + Vercel | All-dark monochrome (#09090b), no accent colors | No pricing page (404) — enterprise demo only | No product screenshots; broken pages; only 2 anonymous testimonials |
| **Intruder** | intruder.io | Webflow + Google Fonts (Montserrat/Open Sans) | Gold accent (#FEC400), dark hero, white sections | 4 tiers, license calculator, 14-day trial | No scroll animations; generic SaaS aesthetic; Webflow constraints |
| **Snyk** | snyk.io | Next.js + Contentful + Cloudinary, Rive animations | Enterprise-polished, illustrations over screenshots | Free / $25/mo/dev / $1,260/yr/dev / Custom | Generic enterprise design; no interactive demos; illustrations hide real product |
| **HackTheBox** | hackthebox.com | HubSpot CMS + Tailwind, Vue.js (platform) | Neon green (#9FEF00) on deep navy (#0b121f) | $250/seat/mo (Build) + custom enterprise | System fonts only; minimal animations; static hero; no live activity feeds |

---

## Individual Competitor Analysis

### 1. Kali Linux (kali.org) & OffSec (offsec.com)

- **URL**: https://kali.org, https://offsec.com
- **Tech Stack**: Kali uses static HTML/CSS/JS with no framework; OffSec uses Astro SSG with Svelte islands and Tailwind CSS. Kali hosts on Cloudflare, OffSec on Netlify. OffSec uses Paperform + Qualified.js for lead routing and Salesloft Scout CRM.
- **Design Language**: Kali uses blue `#367BF0` + purple `#a400a4` on neutral backgrounds (`#f9f9f9` light / `#010409` dark) with full light/dark mode via CSS `light-dark()`. Font: Noto Sans 400/600. OffSec is dark-mode-only with cyan `#00bfcb` + purple `#6619d0` on deep plum-black `#251521`. Heavy gradient overlays: `linear-gradient(285.32deg, #00bfcb, #6619d0 43.38%, #25212b00 100%)`. Fonts: Sora (headings, 600) + Inter (body, 400). Hero H1 at 64px desktop / 32px mobile.
- **Layout Pattern**: Kali: Sticky nav > centered hero with dual CTA > 5 feature cards > tool logo grid > "Kali Everywhere" 3 demos + 8 platform cards > alternating text/screenshot blocks > blog feed > footer. OffSec: Sticky nav with mega-dropdowns > split hero (7/5 col) > infinite logo marquee > pricing spotlight > lab showcase > cert grid > stat cards > enterprise ranges > recruitment > newsletter > footer (14 sections total).
- **Animations**: Kali has opacity transitions (0.2-0.4s) on interactive demos and light/dark toggle — no scroll-triggered animations. OffSec has infinite marquee (`@keyframes scroll-x`), mask gradients for fade edges (`-webkit-mask-image`), scroll-triggered header state at 60px+, 0.5s button hover transitions. Respects `prefers-reduced-motion`. No GSAP or parallax on either site.
- **UI/UX Highlights**: Kali's platform-first download flow with 8 visual cards (Installer, VM, ARM, Mobile, Cloud, Containers, Live Boot, WSL) is exemplary. Three interactive demos (Undercover Mode, NetHunter, Win-KeX) use layered absolute-positioned images with opacity toggles. OffSec's every-section-has-a-CTA conversion architecture and infinite logo marquee with mask gradients are effective.
- **Promotional Strategy**: OffSec uses IBM fear data ("$5.74M average cost"), Gartner CTEM alignment, cert badge carousel, stat cards with purple numbers. Kali has zero social proof — no testimonials, no download counters.
- **Pricing Display**: OffSec shows card-based tiers: CyberCore $899, Learn One $2,749/yr ("Best value"), Course+Cert $1,749. "Best value" / "Most popular" badge labels. Klarna financing for US users. Enterprise at $6,299/yr.
- **Weaknesses**: Kali has no scroll animations, no search, no social proof, text-heavy hero. OffSec is dark-only, extremely long sales page, gradient overuse, no interactive demos, heavy sales pressure.
- **Steal-worthy Elements**: Kali's platform-card download UX, `light-dark()` CSS theming, interactive state-change demos. OffSec's infinite marquee with mask gradients, stat cards for social proof, multi-entry CTA architecture, dual-font strategy (geometric heading + humanist body).

---

### 2. Metasploit (metasploit.com) & Rapid7 (rapid7.com)

- **URL**: https://metasploit.com, https://rapid7.com
- **Tech Stack**: Metasploit is static HTML with vanilla JS and minimal dependencies. Rapid7 uses Next.js with React Server Components, Contentful CMS (headless, GraphQL), CSS Modules, Typekit custom fonts, Google Tag Manager, Faro (Grafana RUM), VWO A/B testing, Marketo forms. Images in WebP + AVIF via Next.js Image (`w=3840&q=75`).
- **Design Language**: Metasploit: white backgrounds, blue links, dark gray text, no custom fonts. Rapid7: orange primary (`CTAs, badges`), blue secondary, text `rgb(59, 69, 74)` dark charcoal, custom Typekit headings + Inter body, light/dark toggle via localStorage. Card-based layout with color-coded badges and consistent shadows.
- **Layout Pattern**: Metasploit: Sticky nav > hero with GitHub stars (37,776) > two-column open source vs commercial > latest modules table > latest PRs table > blog cards > video section > contributor avatars > related products > footer. Rapid7: Sticky nav with mega-menus > hero with dashboard screenshot > customer logos carousel (Adobe, Uber, Comcast) > event promo > tabbed 7-product showcase > 4 analyst reports (IDC, Gartner x2, Frost & Sullivan) > 5 customer stories > Rapid7 Labs > resources grid > footer.
- **Animations**: Metasploit: absolutely none — pure static. Rapid7: customer logo carousel (5x content repeat for infinite scroll), customer stories carousel, likely fade-in on scroll, hover states on cards. No heavy parallax or WebGL.
- **UI/UX Highlights**: Metasploit's live GitHub integration (star count, recent commits, PRs, contributor rankings) makes the site feel alive. Rapid7's tabbed product explorer across 7 lines is clean and effective. ROI Calculator microsite is sophisticated sales enablement.
- **Promotional Strategy**: Metasploit uses developer-oriented proof (GitHub stars, contributor avatars). Rapid7 uses Fortune 500 logos, analyst quadrant badges, customer success stories with metrics.
- **Pricing Display**: Neither shows pricing. Metasploit offers two-column open source vs commercial comparison. Rapid7 is entirely demo-first with "Request Demo" and "Let's Talk" CTAs.
- **Weaknesses**: Metasploit is visually dated (looks like 2015), no product screenshots, no interactive demos, table-based data, zero animations. Rapid7 is enterprise-heavy/developer-hostile, no self-serve pricing, conservative design despite Next.js, product sprawl (7 product lines), generic SaaS feel.
- **Steal-worthy Elements**: Metasploit's live community dashboard concept (real-time data on the marketing site). Rapid7's tabbed product explorer, analyst badge collection, hero dashboard screenshot, A/B testing infrastructure (VWO).

---

### 3. Pentera (pentera.io)

- **URL**: https://pentera.io
- **Tech Stack**: WordPress on WP Engine (staging: `penteraiostg.wpenginepowered.com`), jQuery, custom CSS with CSS variables, HubSpot Forms (portalId: 4700023), GA4, JSON-LD structured data. No Tailwind, no Bootstrap, no React. CSS transitions only — no GSAP, AOS, or Framer Motion.
- **Design Language**: Primary black `#000000` text, white `#FFFFFF` backgrounds, purple accent `#7A00DF` / `#9B51E0`, cyan blue `#0693E3`, gray `#ABB8C3` / `#313131`, light bg `#EEEEEE`. Gradients: cyan-to-purple, midnight blue overlays. Font sizes: 13/16/20/36/42px. Clean sans-serif (likely Inter). Preset spacing scale: 20-80 units. Clean borderless cards with 431x502px thumbnails.
- **Layout Pattern**: 12-section long-scroll enterprise SaaS: sticky nav > hero with email capture > metrics bar (80%/60%/90%) > comparison table ("Validation over assumption") > platform screenshot > CTEM 5-stage diagram > customer reviews carousel > 9 tabbed use cases > customer validation (4.7/5, video testimonials, logo wall) > featured resources > FAQ accordion > final CTA + footer.
- **Animations**: Conservative — no scroll-triggered animations, no parallax. CSS transitions on hover. Animated GIFs on product pages showing attack paths. Carousel for testimonials. Accordion expand/collapse. Responsive image swapping at 768px/1921px.
- **UI/UX Highlights**: CTEM framework alignment maps platform to Gartner's framework for analyst credibility. "Validation over Assumption" comparison table boldly positions against VM, BAS, EASM without naming competitors. 30+ testimonials across 14+ industries.
- **Promotional Strategy**: Aggressive social proof: 30+ testimonials, 8+ enterprise logos, G2 and Gartner badges, 4.7/5 rating, video testimonials. Certification badges: AWS, SOC 2, ISO 27001, ISO 42001, ISO 9001. Investor logos: AWZ, Blackstone, Evolution Equity, Insight Partners, K1. "Cybertoons" branded cartoon content.
- **Pricing Display**: No pricing page (404). Fully gated, sales-led. "Talk to an Expert" on every page. No tiers, no calculator, no free trial.
- **Weaknesses**: Static corporate WordPress feel; no interactive product demo; no pricing transparency; WordPress/jQuery limitations; generic white visual language; no community features; heavy sales friction; basic blog design.
- **Steal-worthy Elements**: CTEM framework alignment for analyst credibility, animated GIF product demos (low-friction way to show the product), "Exposure Deep-Dive" framing (reframing demo as free assessment), ISO 42001 AI certification badge, volume social proof strategy (30+ testimonials, 14+ industries).

---

### 4. Burp Suite (portswigger.net/burp/pro)

- **URL**: https://portswigger.net/burp/pro
- **Tech Stack**: TeleportHQ low-code builder (identified by `data-thq` attribute prefix). Custom CSS with `--dl-` prefixed design tokens. Only font: Arial (system). Images in WebP at 1200w. Analytics via Piwik PRO (`287552c2-4917-42e0-8982-ba994a2a73d7`). CSP nonce attributes on scripts. Self-hosted.
- **Design Language**: PortSwigger orange (~`#FF6633` / `#E8561A`) as brand accent on all-white/light gray backgrounds. Dark text. No dark mode. Buttons: solid orange, ALL CAPS text with price ("BUY - $499"). Generous whitespace. Borderless cards with icon + heading + description. 16px base size, Arial throughout. No typographic personality.
- **Layout Pattern**: Global nav > sticky secondary product nav > hero ("Test like a pro") + dual CTA > Microsoft testimonial quote > Burp AI feature > 3-column feature grid (Find/Be Productive/Share) > Gartner badge > 3-phase workflow (Discovery > Attack > Reporting) > video demo section > extensibility (300+ extensions, 250+ authors) > trust logos (NASA, Amazon, NBA, FedEx, Emirates) > Discord community > footer.
- **Animations**: Virtually none. `scroll-behavior: smooth` globally. Accordion `max-height 0.3s ease-in-out` + icon rotation. No scroll animations, no parallax, no GSAP/Framer Motion, no hover micro-interactions, no video backgrounds, no carousels.
- **UI/UX Highlights**: Web Security Academy with gamification (free labs, Hall of Fame leaderboard) is their #1 competitive moat. Microsoft quote ("It's not up for consideration") is devastating positioning. 60,000+ customers, 15,000+ organizations. 300+ extensions ecosystem. Price embedded in buy button ("BUY - $499") reduces friction. Three-phase workflow (Discovery > Attack > Reporting) maps to pentester mental model.
- **Promotional Strategy**: Trust logos (Microsoft, Amazon, NASA, FedEx, Emirates, NBA, Barclays, Samsung). Gartner Customers' Choice 2024. Discord community screenshot. Stats: 60,000+ customers, NPS 72, 97% recommend.
- **Pricing Display**: Single-tier: $449-$499/user/year. "TRY FOR FREE" (trial-first) and "BUY - $499" (price in button). No good/better/best matrix. Community vs Pro comparison on separate page.
- **Weaknesses**: Zero animations; Arial only — no typographic personality; no dark mode; no interactive demos; no video embeds on main page; built with low-code (TeleportHQ); no competitive comparisons; single-player tool with no team features; AI bolted on as afterthought.
- **Steal-worthy Elements**: Price-in-the-button CTA pattern ("BUY - $499"), trial-first CTA ordering (free trial before buy), Web Security Academy as competitive moat concept, Microsoft killer quote as social proof, three-phase workflow narrative, 300+ extensions ecosystem story.

---

### 5. Cobalt Strike (cobaltstrike.com)

- **URL**: https://cobaltstrike.com
- **Tech Stack**: WordPress with Gutenberg block editor, jQuery, custom CSS with `--wp--preset-*` variables. New Relic Browser Agent for RUM. Google Tag Manager. GDPR consent via custom PrivacyManagerAPI. WordPress responsive images with lazy loading + `contain-intrinsic-size`. Parent: Fortra (formerly HelpSystems). Download on separate subdomain.
- **Design Language**: Forest green `#006A56` (primary buttons/CTAs), dusk `#004442` (hover states), navy `#004667` (secondary), charcoal `#363E49` (body text), sky blue `#8FE5F2` (accent). White backgrounds. System fonts, no custom web fonts. Font sizes: 13/20/36/42px. 2px border-radius (nearly square — dated). Shadows: `6px 6px 9px rgba(...)` natural, `12px 12px 50px rgba(...)` deep. Max-width 1100px.
- **Layout Pattern**: 31 pages discovered. Mega-menu: Product (Features with 10+ subpages, Interoperability, Bundles, Pricing), Blog, Download, Contact. Feature-per-page architecture (Arsenal Kit, Beacon, Malleable C2, UDRL, Mutator Kit, Sleep Masks each get dedicated pages). Industry verticals: Finance, Healthcare, Government. Resources hub with case studies, events, datasheets.
- **Animations**: Extremely minimal. Lightbox zoom-in/out for image popups. Visibility transitions 0.25-0.35s. Image reveals 0.4s. Respects `prefers-reduced-motion`. No scroll animations, parallax, video backgrounds, or animated SVGs.
- **UI/UX Highlights**: Feature-per-page architecture is excellent for SEO. Industry vertical pages show enterprise maturity. Interoperability ecosystem (Core Impact, Outflank OST). Anime mascot character is distinctive in the enterprise space. "Research Labs" (coming soon) signals R&D investment. Mutator Kit + Sleep Masks position technical sophistication.
- **Promotional Strategy**: Anime mascot as brand identity. Fortra parent branding for enterprise credibility. Certification compliance page. Black Hat Experience landing page. Partner ecosystem (Core Impact, OST).
- **Pricing Display**: Pricing page exists at `/product/pricing-plans/` but content is dynamically loaded via JavaScript — no public pricing visible. "Request a quote" model. Download requires existing license key. No free trial.
- **Weaknesses**: Dated visual design (corporate green/navy, 2px radius). Zero animations. No interactive demo/sandbox/video walkthrough. Java Swing UI screenshots look old. Generic WordPress feel. No free tier or trial. Opaque pricing. No community platform (no Discord/Slack/forums). Corporate identity crisis (anime mascot vs Fortra corporate). Blog-only content strategy.
- **Steal-worthy Elements**: Feature-per-page SEO architecture, industry vertical landing pages, anime/mascot brand identity concept (CrowByte should develop a crow/raven motif), compliance/ethics page for dual-use positioning, interoperability ecosystem approach.

---

### 6. Caido (caido.io)

- **URL**: https://caido.io
- **Tech Stack**: Nuxt.js 3 (Vue SSR, `data-ssr="true"`), Tailwind CSS v3.4.13, PrimeVue component library. Font: Work Sans (custom loaded). Font Awesome 6 icons. Plausible Analytics (self-hosted, privacy-first). JSON-LD Schema.org. WebP images. Dark mode default (`data-mode="dark"`). RSS feed. i18n support.
- **Design Language**: Primary rose/crimson `#A12D55` (buttons), secondary amber/gold `#D4943E` (accents, highlights), surface dark blue-gray `#252830` (bg), `#303340` (cards), `#353846` (borders), `#A3A5AB` (body text), `#D5D6D9` (headings). Text gradient: `linear-gradient(to right, amber 50%, crimson)`. Tailwind scale: H1 3rem, H2 2.25-3rem, body 1.125rem. Font weights: bold headings, semibold sub-headings, medium nav/buttons. Max-w 1280px, section padding py-16 to py-48. Cards: `bg-surface-900 border-surface-700 rounded-lg p-8` with `hover:border-secondary-500/50 duration-300`.
- **Layout Pattern**: SVG grid background with radial mask > fixed nav (80px, max-w 1280px) > centered hero ("Hack at the speed of modern development") with no CTA buttons in hero > 3 audience cards ("What role best describes your work?" — Bug Bounty Hunter/Pentester/Security Leader, color-coded blue/red/green) > full-width product screenshot > gradient-bordered stats card (6,000+ hackers, 54+ plugins, 4,500+ Discord) > sticky scroll-driven feature tabs (Speed/Simplicity/Scale with sentinel divs for scroll switching) > CTA repeat of audience cards > footer with social links and 7-column nav.
- **Animations**: Custom `scroll-animate-fade-up` (opacity 0 + translateY 20px, 0.6s ease-out, staggered with 0.1s delays via Intersection Observer). PrimeVue skeleton pulse for async prices. Hover transitions on cards (200-300ms border color). Sticky scroll section with sentinel divs for tab switching. SVG hexagonal decoration with 18 concentric hexagons (amber to red, varying opacity). Background SVG patterns (circuit-board, temple) at 5% opacity. No parallax, no video, no GSAP/Lottie.
- **UI/UX Highlights**: Audience-first architecture — entire IA organized by persona (Pentesters, Security Leaders, Bug Bounty Hunters) rather than product features. Progressive feature stacking in pricing ("EVERYTHING IN [PREVIOUS], PLUS"). HTTPQL branded as a named product feature. Rust performance as competitive positioning against Burp's Java. Gift voucher system (unusual for security tools). Self-hosted Plausible analytics (privacy + ad-blocker resistant).
- **Promotional Strategy**: Community stats in gradient-bordered card. Audience-based segmentation. "Trusted by a global community of hackers." Plugin count (54+) and Discord members (4,500+). No testimonials, no named companies, no case studies.
- **Pricing Display**: 4 tiers in horizontal cards: Basic (Free forever), Individual (~$200/yr, async loaded), Team (async), Security Leaders (Custom). Yearly/Monthly toggle with "Save 16%" and hand-drawn SVG arrow. Gift vouchers (1/3/6/12 months). Education plan (free 1-year for students/teachers). 7-question FAQ. Highlighted tier uses `border-secondary-400`.
- **Weaknesses**: No interactive demo/live playground; no video content anywhere; bland/conservative visual identity; no social proof depth (numbers but no testimonials, case studies, or named users); async price loading broken (skeleton placeholders visible in static HTML); flat feature card list with no hierarchy; dark-mode only with no toggle.
- **Steal-worthy Elements**: Scroll-driven sticky tab section (sentinel divs for tab switching), audience-first IA, progressive pricing feature stacking, gradient-bordered stats card (3px gradient border), HTTPQL-style feature branding, gift voucher system for community/education, self-hosted privacy-first analytics.

---

### 7. ProjectDiscovery (projectdiscovery.io)

- **URL**: https://projectdiscovery.io
- **Tech Stack**: Next.js App Router with React Server Components, deployed on Vercel. Tailwind CSS with custom semantic tokens (`midnight`, `starlight`, `haze`, `void`). Self-hosted fonts (.woff2/.ttf). PostHog + GA4 + Clearbit analytics. Next.js Image optimization with blur placeholders. RSC streaming. Schema.org via component. No heavy animation libraries — all CSS-native.
- **Design Language**: All-dark monochromatic: `bg-midnight` (~`#09090b`), `bg-void` (slightly lighter dark), `text-starlight` (off-white headings), `text-haze` (muted gray body). No bright accent colors. Gradient borders on card hover: `rgba(244,244,246, 0.18>0.85>0.18)` translucent white sweep (shimmer effect). Typography: custom self-hosted sans-serif, `tracking-[2px]` wide spacing on labels, `text-5xl font-semibold` for stats. Cards: `rounded-lg bg-void` with 1px wrapper for gradient border, no box-shadows.
- **Layout Pattern**: Sticky nav (blurred transparent bg) > hero + trust badge (100k+ security professionals) + decorative SVG swirls > problem statement (3 pain point cards) > 5-tab security lifecycle navigator (Design/Code/Runtime/Exposure/Remediation) > outcomes (4 feature cards with SVG icons) > enterprise guardrails (2x2 grid) > open source bridge (20+ tools, 12k templates, 117k stars, 100k community) > 2 testimonial cards > 3 integration categories with partner logos > final CTA > multi-column footer with SOC2/RSA/BlackHat/G2 badges.
- **Animations**: CSS `clip-path: inset(-100% -100% 0 -100%)` scroll reveals. Shimmer rainbow gradient border on card hover (CSS-only via 1px wrapper). Low-opacity SVG ornaments (AISwirl, Globe, Blocks) positioned absolute behind content. 200ms tab transitions. No parallax, WebGL, scroll-jacking, or auto-playing video.
- **UI/UX Highlights**: Custom Tailwind color tokens with thematic names (not generic gray-100). Problem-first narrative structure. Open source to enterprise bridge (117k GitHub stars to "Now try Neo" pipeline). Nuclei CVE detection speed timeline (5 hrs vs legacy 2-5 days). Contributor leaderboard with gamification.
- **Promotional Strategy**: Community stats prominently displayed (117k+ stars, 100k+ community, 12k templates). SOC2 + RSA Innovation Sandbox + BlackHat award badges. Only 2 anonymous testimonials.
- **Pricing Display**: No pricing page (404). All CTAs drive to "Request demo." No self-serve pricing. Open-source tools free, commercial Neo is demo/sales only.
- **Weaknesses**: No product screenshots on homepage (forces demo request); multiple broken pages (/about, /solutions, /tools, /pricing all 404); only 2 anonymous testimonials; monochromatic to a fault (no visual anchors); no interactive demos; sparse blog (no dates, authors, search).
- **Steal-worthy Elements**: Thematic Tailwind color tokens (`midnight`, `starlight`, `haze`, `void`), shimmer border hover effect (CSS-only premium feel), problem-first narrative structure, low-opacity SVG decorative layer for depth, prominent community stats, tab-based feature showcase, compliance/award badges in footer, contributor leaderboard gamification.

---

### 8. Intruder (intruder.io)

- **URL**: https://intruder.io
- **Tech Stack**: Webflow (CDN: `cdn.prod.website-files.com`). Google Fonts: Montserrat (headings, 100-900) + Open Sans (body, 300-800). PostHog (self-hosted at `e.intruder.io`), GTM, ClickCease. Intercom chat. Wistia video. AVIF images with fallbacks. Finsweet components. No React/Vue/Next. Schema.org SoftwareApplication (4.8/5, 154 reviews).
- **Design Language**: Gold accent `#FEC400` (button glow, hover), dark navy hero backgrounds, white content sections. Focus: `#4D65FF` blue. Video glow: `#DB55ED` magenta (`box-shadow: 0 0 30px #DB55EDCC`). Card border-radius: 16px. Gradient borders via 1px padding + linear gradient. Montserrat bold headings, Open Sans 16px body. `-webkit-font-smoothing: antialiased`. Clean section separation with dark/light alternation.
- **Layout Pattern**: Sticky header with mega-menu > hero with dual CTA + G2/Gartner badges > logo carousel ("Join 3,000+ companies", 18+ logos, 120s infinite scroll) > Wistia video with magenta glow border > 3-pillar features (ASM/Vuln Mgmt/Cloud Security) with gradient border cards > GregAI section > integrations grid (15+ logos) > social proof (G2/Gartner + testimonial carousel) > 4-step process (Discover > Scan > Prioritize > Fix) with 12 use-case cards > getting started 3-step wizard > blog cards > 7-column mega-footer.
- **Animations**: Logo carousel (`translateX(0)` to `translateX(-100%)`, 120s linear infinite). Button border glow (rotating conic-gradient, 2.5s infinite). Card transitions (all 0.3s ease). Accordion (max-height 0.5s ease-out). GPU-accelerated logo scroll via `translateZ(0)`. Video blur during load. No scroll-triggered animations, no parallax, no GSAP/Framer Motion.
- **UI/UX Highlights**: Dual CTA pattern ("Try Free" + "Book Demo") repeated 7+ times. Compliance-first messaging (every tier maps to SOC2/ISO/PCI/HIPAA). AWS Marketplace as alternative procurement. Free tools (cvemon, Autoswagger) as lead-gen. Currency auto-detection (USD/EUR/GBP). License reallocation model (30-day flexible).
- **Promotional Strategy**: G2 4.8/5, Gartner badge, SOC 2/CREST/Cyber Essentials/NCSC certifications. "3,000+ companies." Testimonial carousel (10+ quotes). "Security for the 99%" targeting lean teams. MCP server integration letting customers connect to Claude/AI models.
- **Pricing Display**: 4 horizontal tiers: Essential (startups), Cloud ("BEST VALUE" badge), Pro (hybrid), Enterprise (custom). License-based calculator with infrastructure (5-200) + application (0-20) licenses. 14-day free trial, 5 targets. Annual saves 20%. Dynamic price updates.
- **Weaknesses**: No scroll animations (static feel); Webflow constraints limit interactivity; generic SaaS aesthetic; no dark mode; success stories lack metrics; blog is infrequent; pricing requires calculator interaction; no open-source components; "GregAI" chatbot feels gimmicky vs agentic AI.
- **Steal-worthy Elements**: Rotating conic-gradient button border glow (2.5s animation), Wistia video with magenta glow border effect, competitor comparison pages in footer ("vs Wiz, vs Rapid7, vs Qualys"), MCP server integration positioning, free tools (cvemon) as lead-gen, compliance-first tier mapping, AWS Marketplace procurement channel.

---

### 9. Snyk (snyk.io)

- **URL**: https://snyk.io
- **Tech Stack**: Next.js (React) on Vercel. Contentful CMS (space: `oyrbri43adzz`). Cloudinary image CDN (`res.cloudinary.com/snyk/`, `w=2560&q=75`). GTM with consent-first mode. Rive animations (`.riv` files, `triggerRiveInputOnHover`, `triggerRiveInputOnItemVisible`). Stripe payments. YouTube embeds. Google Consent Mode v2. Atomic design component naming (`atom*`, `molecule*`, `organism*`).
- **Design Language**: Sophisticated dark + light mode variants (logos ship in both). Enterprise purple/blue/dark navy dominant. Card backgrounds: white on light, dark for featured. Strong heading hierarchy, custom self-hosted or system font stack. Two button variants: primary (solid) and tertiary (outline/minimal). Cards with full-width 16:9 header images, clean borders, modern radius. Action verbs on buttons: "Explore", "Start free", "Book a live demo".
- **Layout Pattern**: Announcement bar (themed, e.g., "rsa" variant) > hero with headline + YouTube video > 3-column problem statement cards (alarming stats) > sticky media section with 6 ROI statistics (288% ROI, 80% faster scan) > customer logo carousel (Twilio, Spotify, Snowflake, Revolut) > 6-tab video testimonials (Yalo, Okta, Revolut, Skechers) > recognition badges (Forrester Wave Leader, Gartner, G2) > integrations SVG illustration > 3 resource cards > events section > triple CTA grid (free trial / demo / contact) > 5-column footer + newsletter.
- **Animations**: Rive animations with scroll-triggered (`triggerRiveInputOnItemVisible`) and hover (`triggerRiveInputOnHover`) triggers. Sticky scroll for platform benefits stats. Continuous logo carousel. Tab transitions. Video thumbnails with play overlays. Direction control (`reverse: true/false`) for river layouts. No parallax, 3D, particle effects, or WebGL.
- **UI/UX Highlights**: 6-step prescriptive maturity model (Stabilize > Optimize > Scale) as strategic narrative. Regional login routing (US-1, US-2, EU, AU). "Why Snyk" competitive comparison section in footer (vs GitHub, Veracode, Checkmarx, Black Duck, Wiz, Aikido). Tabbed video testimonials. Announcement bar theming system. "Patched & Dispatched" branded newsletter. GitHub/Google OAuth signup ("no credit card required"). River layout with alternating Rive animations.
- **Promotional Strategy**: Forrester Wave Leader, Gartner Peer Insights, G2 badges near CTAs. Customer logos (Twilio, Spotify, Snowflake, Revolut). 6 video testimonials. 1,606 blog posts (content moat). GitHub/Google OAuth ("Start free with GitHub"). Three parallel conversion paths (self-serve/evaluation/enterprise).
- **Pricing Display**: 4 tiers: Free ($0/dev), Team ($25/mo/dev, 5-10 devs), Ignite ($1,260/yr/dev, up to 50), Enterprise (custom). No monthly/annual toggle in primary display. Extensive feature comparison matrix. Add-ons: Snyk Learn, Snyk API & Web (DAST). 6-question FAQ. Stripe billing. FedRAMP on Ignite+.
- **Weaknesses**: No interactive demos (video-heavy, not interaction-rich); generic enterprise design (personality-free); abstract illustrations hide real product; pricing gap ($25/mo to $1,260/yr is massive); heavy video dependency (YouTube embeds, slow loading); no dark mode on marketing site; bloated mega-menu navigation; content moat but poor discoverability (1,606 posts, basic grid).
- **Steal-worthy Elements**: Rive hover/scroll animations (subtle life to static content), 6-step maturity model narrative, regional login routing, competitive comparison pages in footer, announcement bar theming system, branded newsletter concept, GitHub/Google OAuth self-serve signup, triple-path CTA grid at page bottom, Cloudinary image optimization.

---

### 10. HackTheBox (hackthebox.com)

- **URL**: https://hackthebox.com
- **Tech Stack**: HubSpot CMS (Portal ID: 5514032) with island architecture (server-rendered + selective hydration). Tailwind CSS with semantic design tokens. Vue.js SPA for the platform (app.hackthebox.com). GTM + HockeyStack analytics. Cookiebot consent. HubSpot Forms v2 + ChiliPiper lead routing. Still loads jQuery 1.7.1 (technical debt).
- **Design Language**: Signature neon green `#9FEF00` on deep navy `#0b121f` / true dark `#0b0e14`. Full palette: `#84cc16` (lime green gradients), `#a2ff00` (bright green hover), `#4752c4` (purple/indigo), `#5865F2` (Discord blue), `#8799B5` (slate gray), `#FFC744` (gold VIP), `#e1e1e1`/`#F4F4F4` (text). Semantic tokens: `text-text-primary` (190 uses), `text-text-accent` (190 uses), `bg-neutral-600` (card bg), `bg-layer-00`/`bg-layer-02` (depth system), `border-border-card`/`border-border-card-hover`. Gradient borders via 1px padding wrapper. System sans-serif (no custom typeface). Sizes: text-base 16px (135 uses), text-lg 18px (107), text-sm 14px (93) up to text-7xl 72px (1 use). Glass-morphism: `backdrop-blur-md` on nav.
- **Layout Pattern**: Sticky nav with glass-morphism > hero ("Cyber Mastery: Community Inspired. Enterprise Trusted") + Forrester Wave badge > 3 tabbed value proposition cards (Validate/Develop/Resilience) > auto-scrolling logo marquee (25+ enterprise/government logos) > 3-column feature cards (Individuals/Businesses/Governments) > product news cards > solutions accordion > footer.
- **Animations**: Mostly CSS transitions (`duration-300` most common). Arrow SVG draw-and-slide on hover via `group-hover` (51+ instances: line scales from 0 to 100, translates right, eases out). Opacity toggles (85 uses each of `opacity-0`/`opacity-100`). `animate-fade-in` custom animation. Animated GIF backgrounds on enterprise pages. No GSAP, Framer Motion, WebGL, parallax, or scroll-triggered animations.
- **UI/UX Highlights**: Semantic design token system for maintainability. Gradient border technique (1px padding + gradient bg). Dual platform strategy (HubSpot marketing + Vue.js app). Enterprise vs Individual personality split (gamification for hackers, ROI language for business). ChiliPiper for instant meeting booking. Arrow draw animation on every interactive card.
- **Promotional Strategy**: Forrester Wave badge in hero. 25+ client logos in marquee. Enterprise testimonials. Dual CTA pattern (high + low commitment on every page). 4.3M member claim. Trust badges: SOC 2, ISO 27001/27701/9001, Cyber Essentials, G2, Capterra. Annual plan incentives (CTF credits).
- **Pricing Display**: 3 enterprise tiers: Build ($250/seat/mo, 14-day trial), Grow (custom, "MOST POPULAR"), Scale (custom). Monthly/Annual toggle ("Save 20%"). Feature comparison by 4 categories (Skills Development, Optimized Experience, Team Management, Lab Access). Premium add-ons listed separately.
- **Weaknesses**: System fonts only (no distinctive typeface); minimal animations despite "hacker" brand; static hero (no video/interactive element); jQuery 1.7.1 technical debt; HubSpot generic feel; no dark/light toggle; individual pricing hidden; no interactive product demo on marketing site; no live community activity feed despite 4.3M members.
- **Steal-worthy Elements**: Neon-on-dark color scheme concept (pick different signature color), semantic design token system, gradient border technique, client logo auto-scroll marquee, dual CTA pattern (high + low commitment), arrow draw animation on cards, glass-morphism nav overlay, enterprise/individual personality split, ChiliPiper for instant demo booking.

---

## Design Patterns to Adopt

### Typography
- **Heading font**: JetBrains Mono or Fira Code (monospace) — none of the 10 competitors use a distinctive monospace heading font. This immediately signals "built by hackers" and differentiates from every competitor's generic sans-serif. CrowByte's WEBSITE_SPEC already specifies this.
- **Body font**: Inter (used by OffSec, Rapid7, and others — proven readability) or Geist Sans.
- **Code blocks**: JetBrains Mono with syntax highlighting.
- **Scale**: Hero H1 at 60-72px (desktop), section H2 at 36-48px, body at 16-18px. Use `tracking-[2px]` wide spacing on uppercase labels (borrowed from ProjectDiscovery).
- **Weights**: Bold (700) for headings, semibold (600) for sub-headings, normal (400) for body.

### Color Strategy
- **Background**: Pure black `#000000` (CrowByte spec) — darker than all competitors. HTB uses `#0b121f`, ProjectDiscovery uses `#09090b`, Caido uses `#252830`. Going true black is bolder.
- **Primary accent**: Emerald `#10B981` — distinct from HTB's `#9FEF00` neon green, Caido's rose, and OffSec's cyan. Emerald is professional yet hacker-coded.
- **Secondary accent**: Violet `#8B5CF6` — complements emerald and bridges to OffSec/Pentera's purple usage without copying.
- **Alert/Critical**: Red `#EF4444` — universal urgency signal.
- **Text**: Off-white `#F4F4F4` for headings, muted gray `#A0A0A0` for body (similar to HTB's `#e1e1e1`/`#8799B5` spectrum).
- **Surfaces**: Glassmorphism cards with `bg-white/5 backdrop-blur` — no competitor uses this effectively. Subtle glows over hard borders.
- **Gradients**: Emerald-to-violet gradient for hero accents and card borders (not overused like OffSec's gradient saturation).

### Animation Patterns
This is CrowByte's single biggest differentiator. Every competitor is animation-poor:
- **Scroll-triggered entrance**: Fade-up + translateY(20px) with staggered delays (0.1s intervals) via Framer Motion — Caido does this with basic CSS, but Framer Motion enables richer orchestration.
- **Terminal typing animation**: Hero section shows realistic terminal output typing character by character. No competitor does this.
- **Parallax product screenshots**: Slight parallax on dashboard mockups as user scrolls. No competitor uses parallax.
- **Counter animations**: Stats (142 MCP tools, 7+ AI models, 9 VPS agents) count up from 0 when scrolled into view. Pentera and OffSec show stats but never animate them.
- **Gradient border shimmer on hover**: Adopt ProjectDiscovery's CSS-only shimmer border (rainbow gradient sweep on 1px wrapper). Combine with HTB's gradient border technique.
- **Logo marquee**: Infinite scroll for trust logos (OffSec, Rapid7, HTB, Intruder all use this). Add mask gradients for fade edges (from OffSec).
- **Particle/grid background**: Subtle animated grid or particle system in hero — no competitor does this. Keep low opacity (5-10%).
- **Sticky scroll sections**: Adapt Caido's sentinel-div scroll-driven tab switching for feature showcase.
- **Micro-interactions**: Card hover border color transitions (200-300ms), button glow effects on hover, arrow animations on interactive elements.
- **Respect `prefers-reduced-motion`** (from OffSec and Cobalt Strike) — disable animations for accessibility.

### Layout Patterns
- **Hero**: Centered headline + subheadline + dual CTA + animated terminal mockup (below or to the right). Badge ("Now in Public Beta") with pulse animation.
- **Social proof bar**: Infinite logo marquee with mask gradients (from OffSec/HTB). Stats card with gradient border (from Caido: "500+ researchers | 10,000+ scans | 1,200+ CVEs").
- **Feature showcase**: Tab-based (from Caido/ProjectDiscovery/Rapid7) with scroll-driven sticky sections. Vertical tabs on desktop, horizontal on mobile. Each tab reveals features + product screenshot + CTA.
- **Solutions section**: Audience-first cards (from Caido) — Bug Bounty Hunter / Red Team Operator / Security Researcher, color-coded.
- **Interactive demo section**: Animated terminal window showing realistic CrowByte workflow (unique — no competitor has this).
- **Pricing**: 4 horizontal cards with highlighted "Most Popular" tier (emerald border/glow). Progressive feature stacking (from Caido). Monthly/annual toggle with "save X%" callout.
- **Comparison table**: Direct "CrowByte vs Burp vs Cobalt Strike" (from WEBSITE_SPEC). Bold like Pentera's "Validation over Assumption" framing.
- **FAQ accordion**: Simple expand/collapse (every competitor has this).
- **Footer**: 5-column layout (from WEBSITE_SPEC) with social links, legal, and product links.

### Social Proof Techniques
- **Logo marquee**: Compatible platforms (HackerOne, Bugcrowd, Intigriti) — from HTB/OffSec/Intruder pattern.
- **Stat cards with animated counters**: "500+ Security Researchers | 10,000+ Scans | 1,200+ CVEs" — from Caido/ProjectDiscovery/OffSec.
- **Named testimonials with photos**: Missing from most competitors. Even one strong quote (like Burp's Microsoft quote) is devastating.
- **Compliance badges in footer**: SOC2, GDPR (from HTB/ProjectDiscovery/Intruder pattern).
- **Awards/recognition**: G2, Product Hunt (when available).
- **GitHub stars**: If open-source components exist, display prominently (from ProjectDiscovery's 117k stars).
- **Trust badges**: "Works on Kali Linux | Ubuntu | Debian | Docker" — platform compatibility signals.

### CTA Strategy
- **Persistent header CTA**: "Get Started Free" (emerald filled) always visible in sticky nav — from every competitor.
- **Dual CTA pattern**: "Get Started Free" (primary) + "Watch Demo" (secondary outline) — from Intruder/HTB.
- **Every section has an exit**: Contextual CTAs within feature sections — from OffSec's conversion architecture.
- **Triple bottom CTA**: Free trial / Watch Demo / Contact Sales — from Snyk's three-path conversion grid.
- **Price-in-button**: Consider "Start Free — $0/forever" or "Go Pro — $29/mo" — from Burp Suite's "BUY - $499" pattern.
- **Low-commitment language**: "Free forever", "No credit card required", "Try", "Explore" — from Intruder/Snyk.
- **GitHub/Google OAuth**: For self-serve signup (from Snyk).

### Trust Signals
- **"No credit card required"** beneath every free CTA (from Snyk).
- **Security-specific trust**: "All data encrypted with TLS 1.3 + AES-256" (from WEBSITE_SPEC).
- **Compliance badges**: SOC2, GDPR (footer).
- **Open architecture**: "142 MCP tools" is a platform/ecosystem number like Burp's "300+ extensions."
- **"Built by hackers, for hackers"**: Authentic positioning that corporate competitors can't claim.

---

## CrowByte Differentiators

Based on the WEBSITE_SPEC and competitive research, CrowByte's unique advantages vs ALL competitors:

1. **AI-Native Architecture**: 7+ AI models (Claude, DeepSeek, Qwen, Mistral, Kimi, GLM) with MCP integration for 142 security tools. Every competitor either has no AI (Kali, Metasploit, Cobalt Strike, Caido) or bolted it on as an afterthought (Burp AI, GregAI). CrowByte is built around AI agents from the ground up.

2. **Unified Command Center**: Terminal + AI chat + CVE database + threat intel + red team ops + fleet management + network scanner + agent builder — in one application. Every competitor does 1-2 of these. No competitor does all of them.

3. **Desktop-Native with Cloud Sync**: Electron app that runs locally (privacy, speed, offline capability) with Supabase cloud sync. Competitors are either cloud-only SaaS (Intruder, Snyk, Pentera) or CLI-only (Metasploit, Nuclei). CrowByte bridges both.

4. **Agent Swarm Architecture**: 9 specialized VPS agents (Commander, Recon, Hunter, Intel, Analyst, Sentinel, GPT, Obsidian, Main) for distributed parallel operations. No competitor has this.

5. **Transparent Pricing with Free Tier**: Free/$29/$79/Custom — while 7 out of 10 competitors hide pricing behind "Contact Sales." CrowByte offers self-serve access at every tier.

6. **Hacker Aesthetic + Modern Design**: Dark terminal theme with emerald/violet accents, JetBrains Mono typography, Framer Motion animations, glassmorphism cards. No competitor combines authentic hacker aesthetics with modern web design quality.

7. **MCP Protocol Integration**: 142 security tools accessible through natural language AI commands. This is a new paradigm — no competitor has this depth of AI-tool integration.

8. **Real-Time Threat Intelligence**: Auto-syncing from 10+ OSINT feeds (URLhaus, FeodoTracker, ThreatFox, etc.) with IOC management. Most competitors focus on scanning, not intelligence.

9. **Custom AI Agent Builder**: Users create specialized AI agents with specific personas, instructions, and capabilities. No competitor offers user-created AI agents.

10. **Open Architecture**: MCP protocol + API for extensibility. Unlike Burp's Java API or Cobalt Strike's Malleable C2, CrowByte uses modern, standards-based extensibility.

---

## Recommended Tech Stack

Based on competitor research and WEBSITE_SPEC requirements:

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Framework** | React 18+ with TypeScript | Already CrowByte's stack; superior to WordPress (Pentera, Cobalt Strike), Webflow (Intruder), TeleportHQ (Burp), HubSpot CMS (HTB) |
| **Meta-framework** | Vite 7 (static build) or Next.js (if SSR needed for SEO) | Vite for speed. Competitors using Next.js (Rapid7, Snyk, ProjectDiscovery) have good SEO but CrowByte can achieve same with React Helmet + prerendering |
| **CSS** | Tailwind CSS v4 with custom theme config | Industry standard (HTB, Caido, ProjectDiscovery all use it). Custom semantic tokens like ProjectDiscovery (`midnight`, `starlight`) and HTB (`text-text-accent`, `bg-layer-00`) |
| **Animations** | Framer Motion | No competitor uses it. This is the single biggest design differentiator. Scroll-triggered, entrance, hover, parallax, layout animations |
| **Fonts** | Google Fonts — JetBrains Mono (headings/code) + Inter (body) | JetBrains Mono is unused by all 10 competitors. Inter is proven (OffSec, Rapid7). Dual-font strategy from OffSec (Sora + Inter) |
| **Icons** | Lucide React | Already CrowByte's icon set. Clean, consistent |
| **Images** | WebP/AVIF with lazy loading, blur placeholders | Best practices from Rapid7 (Next.js Image), Snyk (Cloudinary), Intruder (AVIF) |
| **Analytics** | Plausible (self-hosted) or PostHog | Privacy-first like Caido (Plausible) or growth-focused like Intruder/ProjectDiscovery (PostHog). Avoid Google Analytics dependency |
| **Deployment** | Vercel, Netlify, or Cloudflare Pages | Static site deployment. OffSec uses Netlify, ProjectDiscovery/Snyk use Vercel |
| **SEO** | React Helmet, JSON-LD structured data, sitemap.xml | Standard across competitors. Schema.org for SoftwareApplication (like Intruder's 4.8/5 structured data) |
| **Forms** | Native React forms or Formspree | Avoid HubSpot/Marketo enterprise lock-in. Keep it lean |
| **Video** | Self-hosted MP4 or asciinema for terminal recordings | Avoid YouTube embed dependency (Snyk's heavy YouTube). Self-hosted = faster, no tracking |

### Custom Tailwind Theme Tokens (inspired by competitors)

```js
// Semantic color names (ProjectDiscovery-inspired)
colors: {
  void: '#000000',        // Pure black background
  abyss: '#0A0A0A',      // Card backgrounds
  obsidian: '#141414',    // Surface/elevated backgrounds
  steel: '#1A1A2E',      // Borders
  smoke: '#6B7280',       // Secondary text
  ash: '#9CA3AF',         // Body text
  ghost: '#E5E7EB',      // Primary text
  bone: '#F9FAFB',       // Heading text
  emerald: '#10B981',    // Primary accent
  violet: '#8B5CF6',     // Secondary accent
  crimson: '#EF4444',    // Alert/critical
}
```

---

## CrowByte Website Build Spec

*(Incorporated from WEBSITE_SPEC.md with competitive intelligence annotations)*

### Design Language
- Ultra-modern, dark-first design (pure black `#000000` background) — darker than all competitors
- Accent colors: Emerald `#10B981` for primary actions, Violet `#8B5CF6` for secondary, Red `#EF4444` for alerts/critical
- Monospace typography for headings (JetBrains Mono) — unique vs all 10 competitors who use sans-serif
- Sans-serif for body text (Inter) — proven by OffSec, Rapid7
- Glassmorphism effects on cards (subtle `backdrop-blur`, `bg-white/5`) — HTB uses `backdrop-blur-md` on nav only; CrowByte extends this to cards
- Animated gradient borders on hover — combine ProjectDiscovery shimmer + HTB gradient border technique
- Terminal-style code blocks with syntax highlighting
- Smooth scroll animations via Framer Motion (fade-up, slide-in, parallax) — the single biggest differentiator vs all competitors
- No harsh borders — use opacity and subtle glows
- Responsive: desktop-first but fully mobile-friendly
- Particle/grid background animation in hero (subtle, low opacity 5-10%)

### Page Structure

**1. Navigation (Sticky, Transparent)**
- Logo: CrowByte wordmark (Crow in white, Byte in emerald)
- Nav links: Features, Solutions, Pricing, Documentation, Blog
- Right: "Login" (ghost), "Get Started Free" (emerald filled)
- Mobile: hamburger with slide-out drawer
- Background on scroll: `backdrop-blur-xl bg-black/80` (inspired by HTB's glass-morphism nav)

**2. Hero Section**
- Animated badge: "Now in Public Beta" with pulse dot
- Headline: "The Offensive Security Platform, Powered by AI"
- Subheadline: "Stop juggling 20 tools. CrowByte unifies AI agents, vulnerability scanning, threat intelligence, red team ops, fleet management, and exploit development — in one platform built by hackers, for hackers."
- Primary CTA: "Get Started Free" (emerald, large)
- Secondary CTA: "Watch Demo" (outline with play icon)
- Hero visual: Animated terminal mockup showing realistic CrowByte output with typing animation
- Trust badges: "Works on Kali Linux | Ubuntu | Debian | Docker"
- Small text: "No credit card required. Free tier available."

**3. Social Proof Bar**
- "Trusted by security professionals worldwide"
- Compatible platform logos: HackerOne, Bugcrowd, Intigriti, Synack
- Stats with animated counters: "500+ Security Researchers | 10,000+ Scans Completed | 1,200+ CVEs Tracked"
- Infinite scroll marquee with mask gradients (from OffSec/HTB pattern)

**4. Features Section — "Everything You Need"**

Four sub-sections with tab-based or card-grid presentation:

*4.1 AI-Powered Intelligence:*
Multi-Model AI Chat (7+ models, MCP integration, streaming), AI Agent Builder (custom personas, tool access), AI Mission Planner (phase-based plans, risk scores), AI Security Monitor (continuous analysis, alerts)

*4.2 Offensive Security Toolkit:*
Integrated Terminal (xterm.js + tmux), Network Scanner (Nmap GUI), CyberOps Toolkit (142 MCP tools), Red Team Operations (lifecycle management)

*4.3 Threat Intelligence:*
CVE Database (real-time NVD + Shodan), Threat Feeds (10+ OSINT: URLhaus, FeodoTracker, ThreatFox), Knowledge Base (research notes, file attachments)

*4.4 Infrastructure & Fleet:*
Fleet Management (9 VPS agents), Analytics Dashboard (real-time metrics, threat radar), Connectors (Supabase, Shodan, Tavily, MCP, Discord)

**5. "See It In Action" — Interactive Demo**
- Animated terminal with realistic CrowByte recon workflow (typing animation)
- Terminal output shows: subdomain enumeration > HTTP probing > vulnerability scan > report generation
- Below terminal: 4 stat cards with animated counters
  - "7+ AI Models" | "142 MCP Tools" | "9 VPS Agents" | "10+ Threat Feeds"

**6. Solutions — "Built For"**
Three audience columns (inspired by Caido's audience-first architecture):
- Bug Bounty Hunters: recon pipelines, CVE tracking, H1/Bugcrowd report format
- Red Team Operators: operation planning, CVSS scoring, evidence chain
- Security Researchers: threat intel aggregation, knowledge base, custom AI agents

**7. Architecture — "How It Works"**
Three-step flow (inspired by Burp's Discovery > Attack > Reporting):
1. Install (one command) > 2. Connect (AI providers, tools, data sources) > 3. Hunt (AI agents, scanners, threat intel)
Tech badges: Electron | React | TypeScript | Supabase | MCP Protocol | xterm.js

**8. Pricing**

| | Free | Pro | Team | Enterprise |
|---|---|---|---|---|
| **Price** | $0/mo | $29/mo | $79/mo | Custom |
| **Annual** | — | $299/yr (save 14%) | $799/yr (save 16%) | — |
| **AI Queries** | 50/day | Unlimited | Unlimited | Unlimited |
| **AI Models** | 3 | All 7+ | All 7+ | All + custom |
| **MCP Tools** | Basic | All 142 | All 142 | All + custom |
| **CVE Tracking** | 100 | Unlimited | Unlimited | Unlimited |
| **VPS Agents** | — | 3 | 9 | Unlimited |
| **Red Team Ops** | — | 5 | Unlimited | Unlimited |
| **Fleet** | — | 5 endpoints | 50 endpoints | Unlimited |
| **Support** | Community | Priority email | Priority + chat | Dedicated + SLA |
| **CTA** | Get Started Free | Start Pro Trial | Start Team Trial | Contact Sales |

Pro highlighted as "Most Popular" with emerald border/glow.

**9. Comparison — "Why CrowByte?"**

| Feature | CrowByte Pro | Burp Suite Pro | Cobalt Strike |
|---------|-------------|----------------|---------------|
| Price | $299/yr | $475/yr | $5,500/yr |
| AI Integration | 7+ models | None | None |
| Built-in Terminal | Yes | No | Limited |
| CVE Database | Real-time | No | No |
| Threat Intel | 10+ OSINT | No | Limited |
| Custom AI Agents | Yes | No | No |
| MCP Tools | 142 | Extensions | Malleable C2 |
| Mission Planning | AI-generated | No | Manual |

**10. FAQ**
8 questions covering: what is CrowByte, supported OS, API keys, legality, self-hosting, MCP integration, data security, import/export.

**11. CTA Banner**
"Ready to level up your security workflow?"
"Free forever. No credit card required."
Large emerald "Get Started Free" button.

**12. Footer**
5 columns: Brand (logo + tagline + socials), Product (features, pricing, docs, changelog, roadmap, status), Resources (blog, tutorials, API, community, bug bounty, advisories), Company (about, careers, contact, press), Legal (ToS, privacy, AUP, EULA, cookies, GDPR).
Bottom: "2026 HLSITech. All rights reserved." | "Made with [skull] in Montreal, Canada" | ECCN 5D002 export notice.

### SEO & Meta
```html
<title>CrowByte — AI-Powered Offensive Security Platform</title>
<meta name="description" content="CrowByte unifies AI agents, vulnerability scanning, threat intelligence, red team ops, fleet orchestration, and exploit development in one platform. Built by hackers, for hackers." />
<meta property="og:title" content="CrowByte — AI-Powered Offensive Security Platform" />
<meta property="og:description" content="Stop juggling terminals. CrowByte unifies your entire security workflow in one AI-powered command center." />
<meta property="og:image" content="https://crowbyte.io/og-image.png" />
```

### Performance Targets
- Lighthouse: 95+ across all categories
- FCP: < 1.2s | LCP: < 2.5s | TBT: < 200ms | CLS: < 0.1
- Bundle: < 200KB gzipped

### Brand Assets Needed
- Logo SVG (crow/skull + "CrowByte" wordmark)
- OG image 1200x630 (dark with terminal mockup)
- Favicon 32x32 + 16x16
- App screenshots (dashboard, terminal, CVE, chat)
- Feature icons (consistent Lucide style)
- Color palette file

---

## Visual Inspiration

### Color & Dark Theme References
- **HackTheBox** (hackthebox.com): Neon green `#9FEF00` on `#0b121f` — the closest existing aesthetic to what CrowByte should be, but with emerald instead of neon green
- **ProjectDiscovery** (projectdiscovery.io): All-dark `#09090b` monochrome with shimmer borders — the restraint and sophistication CrowByte should channel
- **OffSec** (offsec.com): Cyan/purple gradient overlays on deep plum-black — the gradient technique for hero sections
- **Caido** (caido.io): Rose/amber on dark blue-gray `#252830` — warm accent palette reference

### Animation & Interaction References
- **Caido**: Scroll-driven sticky tab section — for CrowByte's feature showcase
- **ProjectDiscovery**: CSS-only shimmer border on card hover — for card interactions
- **Intruder**: Rotating conic-gradient button border (2.5s) — for primary CTA button glow
- **HackTheBox**: Arrow draw-and-slide on hover (`group-hover` compound effect) — for interactive cards
- **OffSec**: Infinite marquee with `-webkit-mask-image` fade edges — for logo carousel

### Layout & Content References
- **Kali.org**: Platform-card download selector (8 visual cards) — for CrowByte's install page
- **Burp Suite**: Price-in-the-button CTA ("BUY - $499") — for pricing CTA clarity
- **Snyk**: Triple-path CTA grid at page bottom (free/demo/sales) — for conversion optimization
- **Caido**: Audience-first architecture (persona cards with role-based funneling) — for solutions section
- **Pentera**: Animated GIF product demos — for showing tool output without full video
- **Rapid7**: Tabbed product explorer (7 product lines in one clean interface) — for feature organization

### Social Proof References
- **Burp Suite**: "It's not up for consideration" (Microsoft quote) — devastating single testimonial
- **Snyk**: Tabbed video testimonials (6 customers) + Forrester/Gartner badges near CTAs
- **OffSec**: Stat cards with authority data ("$5.74M average cost" citing IBM)
- **Caido**: Gradient-bordered stats card (3px gradient border with metric numbers)
- **HTB**: Logo marquee (25+ enterprise logos in infinite scroll)

### Typography References
- **None of the 10 competitors use monospace headings** — this is CrowByte's unique typographic identity
- **OffSec**: Dual-font strategy (Sora geometric headings + Inter humanist body) — model for CrowByte's JetBrains Mono + Inter pairing
- **ProjectDiscovery**: Wide letter-spacing `tracking-[2px]` on uppercase labels — for CrowByte's section labels
- **HTB**: Strong heading scale (text-base 16px to text-7xl 72px) — for aggressive typographic hierarchy

### Sites Outside Security (for modern web design inspiration)
- **Linear.app**: Dark theme with glassmorphism, scroll animations, terminal aesthetic — closest design language to what CrowByte should be
- **Vercel.com**: Dark hero with gradient accents, clean typography, smooth animations
- **Raycast.com**: Developer tool with keyboard-first dark UI, product screenshots
- **Warp.dev**: Terminal-themed landing page with typing animations and dark aesthetic
