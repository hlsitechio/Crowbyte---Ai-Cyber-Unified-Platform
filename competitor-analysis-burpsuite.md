# Competitor Analysis: Burp Suite Professional (PortSwigger)
> URL: https://portswigger.net/burp/pro
> Analyzed: 2026-03-24
> Purpose: CrowByte competitive intelligence

---

## 1. Tech Stack

| Component | Details |
|-----------|---------|
| **Framework** | Custom/proprietary — no React, Next.js, Vue, Angular, or WordPress detected |
| **CSS** | Custom CSS with CSS custom properties (design tokens). No Tailwind, Bootstrap, or Chakra UI. Variables use `--dl-` prefix (e.g., `--dl-color-core-grey-1`, `--dl-color-core-white`) suggesting a proprietary design-token system, possibly from Teleporthq or similar visual builder |
| **JavaScript** | Vanilla JS with no SPA framework. Minimal inline scripts for accordion toggles, dropdown navigation, and analytics |
| **Component System** | Custom accordion system via `data-thq` attributes (`data-thq="accordion"`, `data-thq="accordion-trigger"`, `data-thq="accordion-content"`, `data-thq="accordion-icon"`) — the `thq` prefix is TeleportHQ, a visual website builder |
| **Fonts** | System font only: `font-family: Arial; font-size: 16px`. No Google Fonts, no custom web fonts, no font loading optimization |
| **Image Format** | WebP primary (`.webp` at 1200w), SVG for logos and icons |
| **Analytics** | Piwik PRO (container: `287552c2-4917-42e0-8982-ba994a2a73d7`), custom PixelInitiative tracker (`piAId = '1067743'`) |
| **CDN** | Self-hosted assets under `/public/`. Analytics from `ps.containers.piwik.pro` and `go.portswigger.net` |
| **Security** | CSP nonce attributes on inline scripts |
| **Hosting** | Self-hosted (portswigger.net), no detected Vercel/Netlify/Cloudflare Pages |

**Key Takeaway:** The site is built with TeleportHQ (low-code visual builder), NOT a modern React/Next.js stack. This means their site is relatively static, lightweight, but also limited in interactive sophistication. Using Arial as the only font is extremely basic.

---

## 2. Layout Structure (Page Sections, Top to Bottom)

### /burp/pro (Main Product Page)

1. **Global Navigation Bar** — Logo left, mega-dropdown menus (Products, Solutions, Research, Academy, Support), "My Account" right
2. **Secondary Nav (Sticky)** — Product Overview, Features, Workflow, Burp AI, Burp Scanner, Customer Stories, Request a Trial, Buy
3. **Hero Section** — "Test like a pro" headline + dual CTA buttons + hero image
4. **Social Proof Quote** — Microsoft testimonial (Taylor O'Dell) with "Read Microsoft's success" link
5. **Burp AI Feature** — "Your AI assistant for daily workflows" with feature image
6. **Three-Column Feature Grid** — Find vulnerabilities / Be productive / Share findings
7. **Gartner Recognition** — Customers' Choice 2024 badge with "READ MORE" CTA
8. **Workflow Section** — Three-phase presentation: Discovery → Attack → Reporting
9. **Video Demo Section** — "See Burp in action" with tool callouts (Proxy, API Scanning, Intruder)
10. **Extensibility Section** — BApp Store stats (250+ authors, 300+ extensions), custom Bambdas/BChecks
11. **Trust Logos** — NBA, Amazon, Emirates, FedEx, NASA
12. **Discord Community CTA** — "Join the official PortSwigger Community" with Discord image
13. **Footer** — Multi-column: Burp Suite, Vulnerabilities, Customers, Company, Insights + social + legal

### /burp/pro/features (Features Page)
Five major sections, each following the pattern: **Heading → Icon-prefixed bullet list → Full-width screenshot**
1. Manual Penetration Testing (proxy, intercept, OAST, crawler, DOM Invader)
2. Advanced Automated Attacks (fuzzing, scanning, CSRF PoC generation)
3. Automated Scanning (built-in browser, API scanning, BChecks)
4. Productivity Tools (editor, auto-formatting, project files, Organizer)
5. Extensibility & BApp Store (Turbo Intruder, Montoya API, 300+ extensions)

### /burp/pro/workflow (Workflow Page)
Three-phase linear flow:
1. **Discovery** — Map attack surfaces, gather intelligence
2. **Attack** — Manual + automated vulnerability identification
3. **Reporting** — Automated logging, evidence collection, report generation

---

## 3. Design Language

### Colors
| Element | Value |
|---------|-------|
| **Primary Brand** | Orange (PortSwigger signature — exact hex not exposed in HTML, stored in external CSS variables) |
| **Background** | White (`--dl-color-core-white`) — consistently light across all sections |
| **Text** | Dark grey/black (`--dl-color-core-grey-1`) |
| **Section Alternation** | Minimal — no dramatic dark/light alternation. Consistent white/light grey |
| **Accent** | Orange on CTAs, links, and interactive elements |
| **Dark Mode** | None. Entirely light theme |

**Estimated brand orange based on PortSwigger brand materials: ~#FF6633 or #E8561A**

### Typography
| Element | Style |
|---------|-------|
| **Font Family** | Arial (system font only — no custom typeface) |
| **Base Size** | 16px |
| **Heading Style** | Large, bold, generous whitespace above/below |
| **Body Copy** | Standard weight, readable line height |
| **Overall** | Clean and legible but generic. No typographic personality |

### Spacing & Layout
- Generous whitespace between sections
- Full-width hero images at 1200px wide
- Three-column grids for feature comparisons
- Alternating text-left/image-right and text-right/image-left sections
- Consistent vertical rhythm

### Button Styles
| Type | Style |
|------|-------|
| **Primary CTA** | Solid filled (orange background, white text), ALL CAPS text ("TRY FOR FREE", "BUY - $499") |
| **Secondary CTA** | Text links with arrows or underlines ("FIND OUT MORE", "Read more") |
| **Tertiary** | Outline or ghost buttons for less important actions |

### Card Styles
- Clean, borderless cards with icon + heading + description
- No visible box-shadow or border-radius specifications in the HTML
- Minimal decoration — content-first approach

---

## 4. Animations & Interactions

| Element | Implementation |
|---------|---------------|
| **Scroll Behavior** | `scroll-behavior: smooth` globally on `<html>` |
| **Accordions** | `transition: max-height 0.3s ease-in-out`, expand from `0` to `1000vh`, icon rotates 180deg |
| **Hover Effects** | Basic CSS `:hover` and `:focus` — no elaborate hover animations detected |
| **Scroll Animations** | None detected. No GSAP, Framer Motion, AOS, or Intersection Observer usage |
| **Parallax** | None |
| **Video Backgrounds** | None |
| **Loading Animations** | None detected |
| **Carousels/Sliders** | None |
| **Modals/Popups** | None detected in page markup |
| **Sticky Nav** | Secondary product nav appears sticky |
| **Mobile Menu** | Dropdown-based with click-outside-to-close JS handler |

**Key Takeaway:** Extremely minimal animation. The site is almost entirely static with only basic accordion toggles. No scroll-triggered reveals, no parallax, no micro-interactions. This is a significant opportunity for CrowByte to differentiate.

---

## 5. UI/UX Patterns

### Feature Presentation
- **Three-column grid** for high-level feature categories (Find / Produce / Share)
- **Bullet lists with icons** for detailed feature breakdowns on the Features page
- **Alternating image+text sections** (standard SaaS landing page pattern)
- **No tabs, no accordions for features** (except in the nav dropdown)
- **No interactive demos** embedded on the marketing site
- **No feature comparison matrix** on the Pro page itself

### Navigation Structure
- **Mega dropdown menus** — Products, Solutions, Research, Academy, Support
- **Secondary sticky nav** on product pages — contextual to the current product
- **Tertiary nav** for sub-sections (certification pages have their own nav)
- **Breadcrumb-style flow** between product pages
- **No search in navigation** (search exists in Academy/docs)

### Information Architecture
```
portswigger.net/
├── burp/
│   ├── pro/ (Professional edition)
│   │   ├── features/
│   │   ├── workflow/
│   │   ├── pricing/
│   │   └── ...
│   ├── enterprise/ → now "DAST"
│   ├── communitydownload/
│   └── releases/
├── web-security/ (Academy)
├── customers/
├── research/
└── support/
```

---

## 6. Promotional Images & Visuals

| Type | Usage |
|------|-------|
| **Product Screenshots** | Primary visual strategy — real UI screenshots of Burp Suite (Proxy Intercept, Scanner, Intruder) shown at 1200w in WebP format |
| **Brand Imagery** | Hero images are stylized/branded rather than raw screenshots |
| **Company Logos** | SVG logos of major clients (Microsoft, Amazon, NASA, FedEx, Emirates, NBA, Barclays, Samsung) |
| **Award Badges** | Gartner Peer Insights Customers' Choice 2024, G2 awards |
| **Illustrations** | Minimal — mostly product screenshots over custom illustrations |
| **3D Renders** | None |
| **Video Content** | Referenced ("See Burp in action") but no embedded video players found on the main Pro page |
| **Photography** | None — no team photos, office photos, or lifestyle imagery on product pages |
| **Device Mockups** | Images appear to be floating/standalone, NOT embedded in laptop/browser frame mockups |
| **Discord Screenshot** | Community section shows Discord interface screenshot |

**Key Takeaway:** Heavy reliance on product screenshots. No custom illustrations, no 3D elements, no video embeds on the main product page. Very functional, not visually exciting.

---

## 7. Pricing Presentation

| Aspect | Details |
|--------|---------|
| **Price** | **$449/user/year** (previously $499, may have changed) — displayed as "BUY - $499" on the Pro page |
| **Model** | Single-tier pricing. No good/better/best comparison. One product, one price |
| **Trial** | Free trial available ("TRY FOR FREE" CTA) |
| **Comparison** | Community vs Pro comparison exists on the Community download page, NOT on the Pro page itself |
| **Comparison Format** | Side-by-side feature list (Community includes: proxy, Repeater, Decoder, Sequencer, Comparer. Pro adds: project files, full Intruder, scanning, OAST) |
| **Toggle** | No monthly/yearly toggle — single annual price |
| **Enterprise** | DAST edition has separate "REQUEST A DEMO" + "PRICING" flow (sales-led, no public price) |
| **Discounts** | Not visible on the public pages |

**Key Takeaway:** Extremely simple pricing — one product, one price, one CTA. No complex tier matrix. The simplicity is both a strength (no confusion) and a limitation (no expansion path shown).

---

## 8. CTA Strategy

### Primary CTAs (appear multiple times)
| CTA | Placement | Purpose |
|-----|-----------|---------|
| **"TRY FOR FREE"** | Hero, mid-page, features page (3+ placements) | Lead generation, trial signup |
| **"BUY - $499"** | Hero, bottom of page | Direct purchase |
| **"BUY NOW - $499"** | Bottom sticky or section | Purchase urgency |

### Secondary CTAs
| CTA | Placement | Purpose |
|-----|-----------|---------|
| **"FIND OUT MORE"** | Feature sections | Deeper engagement |
| **"View all features"** | After feature summary | Page navigation |
| **"READ MORE"** | Awards, testimonials | Social proof deep-dive |
| **"Read Microsoft's success"** | After testimonial | Case study funnel |
| **"Empower your pentesting workflow"** | Mid-page | Emotional/aspirational |
| **"REQUEST A TRIAL"** | Secondary nav | Alternative trial entry |
| **"JOIN THE DISCORD"** | Community section | Community building |

### CTA Patterns
- ALL CAPS text on primary buttons
- Price included directly in the buy button ("BUY - $499") — reduces friction
- "TRY FOR FREE" appears before "BUY" — trial-first approach
- CTAs repeat at natural scroll breakpoints (every 2-3 sections)
- No urgency tactics (no countdown timers, no "limited time" messaging)
- No social proof on buttons (no "Join 60,000+ users" on the CTA itself)

---

## 9. Unique/Clever Elements

### What PortSwigger Does Well

1. **Web Security Academy** — Free educational platform with interactive labs, gamification (Hall of Fame leaderboard), and Burp Suite swag for early solvers. This is their **#1 competitive moat** — it creates brand loyalty before purchase and drives tool adoption.

2. **Microsoft Quote as Lead Social Proof** — "At Microsoft, Burp Suite is what you use. It's not up for consideration." This single quote is devastating competitive positioning.

3. **Customer Numbers** — 60,000+ customers, 15,000+ organizations, 150+ countries, NPS of 72, 97% would recommend. They lean hard on proof.

4. **Gartner Recognition** — Customers' Choice badge adds enterprise credibility.

5. **Discord Community Integration** — Showing the actual Discord interface builds authenticity.

6. **"Test like a pro" Headline** — Simple, aspirational, identity-driven.

7. **Price in the Button** — "BUY - $499" removes a click from the purchase flow.

8. **Three-Phase Workflow** — Discovery → Attack → Reporting maps perfectly to the pentester mental model.

9. **Extensibility Story** — 300+ extensions / 250+ authors creates a platform/ecosystem narrative, not just a tool.

10. **Release Cadence** — Version numbers like "2026.3" show active development.

---

## 10. Weaknesses & CrowByte Opportunities

### Design & UX Weaknesses

| Weakness | CrowByte Opportunity |
|----------|---------------------|
| **No animations/micro-interactions** — The site feels static and dated. Zero scroll animations, no parallax, no hover effects beyond basics. | CrowByte can use Framer Motion for scroll reveals, hover animations on cards, parallax hero sections, and animated feature demos to feel modern and alive. |
| **Arial font only** — Using a system font with no typographic personality gives the site a generic, document-like feel. | Use a modern tech font stack: Inter, JetBrains Mono for code, or a custom brand typeface. Typography alone can signal "next generation." |
| **No dark mode** — For a security tool used by hackers who live in dark terminals, having only a light theme is a missed opportunity. | CrowByte is already dark-themed (Electron app). Carry this into the marketing site — dark backgrounds with neon accents scream "offensive security." |
| **No interactive demos** — You can't try Burp without downloading it. The "See Burp in action" section has no actual video or interactive element. | Embed interactive demos, terminal recordings (asciinema), or even a sandboxed web scanner on the marketing page. |
| **No video embeds** — Despite referencing "See Burp in action," there's no video player on the main product page. | Use embedded video walkthroughs, animated GIFs of features, or Loom-style quick demos. |
| **Built with low-code (TeleportHQ)** — The site is functional but limited by its builder. Custom interactivity is constrained. | Being built with React + Vite + Tailwind gives CrowByte unlimited creative freedom for the marketing site. |
| **No comparison with competitors** — They never mention or compare against other tools. | CrowByte can publish "CrowByte vs Burp Suite" comparison pages — aggressive but effective. |
| **Weak mobile experience** — Mega dropdowns and 1200w hero images suggest desktop-first design. | Build mobile-first with responsive grids and touch-optimized interactions. |

### Content & Strategy Weaknesses

| Weakness | CrowByte Opportunity |
|----------|---------------------|
| **No pricing tiers** — Single $499 price with no expansion path. No team pricing visible. | Offer Free/Pro/Team/Enterprise tiers with a clear upgrade path. Show a comparison matrix. |
| **No AI narrative beyond "Burp AI"** — They mention AI once as an "assistant" but don't go deep. | CrowByte is AI-native. Make AI the centerpiece — AI-driven recon, AI vulnerability analysis, AI report writing, AI agent swarms. This is THE differentiator. |
| **No real-time/collaborative features** — Burp is a single-user desktop tool. No team collaboration visible. | Build fleet management, shared missions, team dashboards, real-time collaboration on findings. CrowByte already has Fleet and MissionPlanner pages. |
| **No API-first story** — Burp's extensibility is through a Java API and BApp store. | Offer a modern REST/GraphQL API, webhooks, CLI tool, and SDK. Developer-first extensibility. |
| **No open-source community angle** — Community Edition is limited, not truly open. | Consider open-sourcing CrowByte's core scanner or recon modules. Build community around contributions. |
| **Desktop-only product** — Burp Suite is a Java desktop app. No SaaS version for Pro. | CrowByte as an Electron app is already more modern. Consider a cloud/SaaS tier for team access. |
| **Dated brand personality** — Corporate, professional, safe. No edge. | CrowByte can be bold, hacker-culture-authentic, with terminal aesthetics and offensive-security personality. |
| **No integration marketplace** — BApp store is Burp-only. No CI/CD native integrations for Pro. | Build native integrations with GitHub, GitLab, Jira, Slack, Discord from day one. |
| **Academy is separate from the tool** — Learning happens on the website, not in the product. | Embed learning/tutorials directly in CrowByte — contextual help, guided workflows, in-app Academy. |
| **No threat intelligence feeds** — Burp focuses on scanning, not intel. | CrowByte already integrates CVE intelligence, Shodan, and can add real-time threat feeds. |

### What NOT to Compete On (Burp's Unbeatable Strengths)

1. **Brand recognition** — "Every pentester knows Burp" is 20+ years of dominance. Don't fight this directly.
2. **Web Security Academy** — Building a competing free education platform would take years.
3. **Scanner accuracy** — PortSwigger Research team feeds cutting-edge vulnerability detection. This takes massive R&D.
4. **Extension ecosystem** — 300+ extensions with community authors. Network effects are hard to replicate.
5. **Enterprise trust** — Microsoft, Amazon, NASA logos. This takes time.

### CrowByte's Winning Angles

1. **AI-Native** — Burp bolted on "Burp AI" as an assistant. CrowByte is built around AI agents from the ground up.
2. **Modern UX** — Dark theme, animations, beautiful UI vs. Burp's Java Swing interface and Arial website.
3. **Team/Fleet Operations** — Multi-agent coordination, shared missions, fleet management. Burp is single-player.
4. **Unified Platform** — Recon + Scanning + Exploitation + Reporting + Intel in one tool. Burp is primarily a proxy/scanner.
5. **Real-time Intelligence** — CVE feeds, Shodan integration, live monitoring. Burp is point-in-time testing.
6. **Price Disruption** — A free tier with generous limits could undercut Burp's $499 barrier.
7. **Cloud-Native** — VPS agent swarms, remote scanning, distributed architecture vs. single desktop app.
8. **Developer Experience** — Modern tech stack, REST APIs, CLI tools vs. Java API and XML configs.

---

## Summary

PortSwigger's website for Burp Suite Pro is **functional, trustworthy, and content-rich but visually unremarkable**. It relies on brand authority, social proof, and the Web Security Academy ecosystem rather than modern web design or interactive experiences. The site was built with TeleportHQ (a low-code builder), uses Arial as its only font, has zero scroll animations, no dark mode, no video embeds, and no interactive demos.

CrowByte's biggest opportunities are in **modern design (dark theme, animations, micro-interactions), AI-native positioning, team collaboration, and a unified offensive security platform**. The goal shouldn't be to out-Burp Burp, but to represent the next generation of offensive security tooling — where Burp is the "industry standard incumbent" and CrowByte is the "AI-powered future."
