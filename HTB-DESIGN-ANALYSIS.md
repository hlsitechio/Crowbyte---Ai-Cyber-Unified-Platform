# HackTheBox (hackthebox.com) - Complete Design & UX Analysis
> Competitive intelligence for CrowByte Terminal
> Analyzed: 2026-03-24

---

## 1. TECH STACK

| Layer | Technology |
|-------|-----------|
| **CMS** | HubSpot (Portal ID: 5514032) |
| **CSS Framework** | Tailwind CSS (utility-first, custom design tokens) |
| **Frontend (Marketing)** | HubSpot Island Architecture (island-runtime.mjs) — server-rendered HTML with client-side hydration for interactive components |
| **Frontend (Platform)** | Vue.js (`htb-web-vue`) |
| **Analytics** | Google Tag Manager (GTM-N6XD42V), HockeyStack |
| **Consent** | Cookiebot |
| **Forms** | HubSpot Forms v2, ChiliPiper (enterprise lead routing) |
| **CDN** | HubSpot CDN (fs1.hubspotusercontent-na1.net) |
| **Legacy JS** | jQuery 1.7.1 (still loaded) |

**Key Insight**: Marketing site is HubSpot CMS + Tailwind + island hydration. The actual hacking platform (app.hackthebox.com) is a separate Vue.js SPA. This is a common pattern — marketing site optimized for SEO/conversion, app optimized for interactivity.

---

## 2. LAYOUT STRUCTURE

### Homepage Sections (in order)
1. **Sticky Nav** — Logo, mega-menu dropdowns, "Business" + "Sign In" + "Get Started" CTAs
2. **Hero** — "Cyber Mastery: Community Inspired. Enterprise Trusted" + Forrester Wave badge
3. **Tabbed Cards** — 3 value propositions with tab switching (Validate/Develop/Resilience)
4. **Logo Ribbon** — Auto-scrolling marquee of 25+ enterprise/government client logos
5. **3-Column Feature Cards** — "For Individuals" / "For Businesses" / "For Governments"
6. **Product News** — 3 announcement cards (latest features, reports)
7. **Solutions Accordion** — Expandable sections (Blue/Red/Purple Teams, AI Agents)
8. **Footer** — Multi-column links + social icons

### Navigation Mega-Menu Structure
```
Why HTB          → AI Operations, Operational Readiness, Workforce Development, Cyber Resilience
Platform         → For Teams | For Individuals | By Industry
Plans            → (direct link)
Resources        → Hub, Live Sessions, Community, Support
Company          → About, Newsroom, Careers, Social Impact
[Business] [Sign In] [Get Started]
```

The mega-menu uses `group-hover/menu` pattern with `backdrop-blur-md` glass-morphism overlay. Navigation items use `bg-neutral-600` card backgrounds with `rounded-lg` containers.

---

## 3. DESIGN LANGUAGE

### Color Palette (Exact Hex Values)

| Role | Hex | Usage |
|------|-----|-------|
| **HTB Green (Primary)** | `#9FEF00` | CTAs, highlights, brand identity, accent text |
| **Lime Green** | `#84cc16` | Gradients, secondary green accent |
| **Bright Green** | `#a2ff00` | Hover states, emphasis |
| **Deep Navy (BG)** | `#0b121f` | Primary page background |
| **True Dark (BG)** | `#0b0e14` | Deepest layer background (--color-layer-zero) |
| **Discord Blue** | `#5865F2` | Discord integration elements |
| **Purple/Indigo** | `#4752c4` | Secondary accent |
| **Slate Gray** | `#8799B5` | Secondary text, muted content |
| **Light Gray** | `#a3b3bc` | Tertiary text |
| **Off White** | `#e1e1e1` | Body text on dark bg |
| **Near White** | `#F4F4F4` | Headings, high-contrast text |
| **Gold/Amber** | `#FFC744` | VIP badges, premium indicators |

### CSS Custom Properties (Design Token System)
```css
--color-layer-zero: #0b0e14       /* deepest background */
--color-layer-background: [dark]   /* page background */
--gradient-color-100: [rgb value]  /* gradient system */
```

Semantic Tailwind tokens throughout:
- `text-text-primary` (190 uses) — main headings
- `text-text-secondary` (66 uses) — body text
- `text-text-accent` (190 uses) — green highlights, links
- `text-text-nav` (171 uses) — navigation text
- `bg-neutral-600` (25 uses) — card backgrounds
- `bg-neutral-700` (13 uses) — darker card variants
- `bg-layer-00`, `bg-layer-02` — layered depth system
- `border-border-card` — default card borders
- `border-border-card-hover` — hover state borders

### Gradients
```css
/* Primary brand gradient */
linear-gradient(to right, #84cc16, rgba(11, 18, 31, 0))

/* Depth fade */
linear-gradient(to top, var(--color-layer-zero, #0b0e14), transparent)

/* Dark overlay */
linear-gradient(rgba(0, 0, 0, 0.45), ...)

/* Gradient borders (signature technique) */
padding: 1px; background: linear-gradient(...)  /* 1px wrapper creates gradient border */
```

### Typography

**Font**: System sans-serif stack (Tailwind `font-sans` default — no custom web font loaded on marketing site)

**Size Scale (by frequency of use)**:
| Class | ~Size | Usage Count | Role |
|-------|-------|-------------|------|
| `text-base` | 16px | 135 | Body text |
| `text-lg` | 18px | 107 | Feature descriptions |
| `text-sm` | 14px | 93 | Secondary text, nav items |
| `text-xl` | 20px | 49 | Sub-headings |
| `text-3xl` | 30px | 49 | Section headings |
| `text-4xl` | 36px | 25 | Hero sub-heads |
| `text-xs` | 12px | 27 | Labels, captions |
| `text-5xl` | 48px | 6 | Hero headlines |
| `text-6xl` | 60px | 3 | Primary hero text |
| `text-7xl` | 72px | 1 | Maximum impact text |

**Weights**: `font-bold` (headings), `font-semibold` (sub-headings), `font-normal` (body)

### Spacing System

**Gap values (frequency)**:
- `gap-4` (1rem) — 104 uses (most common)
- `gap-3` (0.75rem) — 88 uses
- `gap-6` (1.5rem) — 36 uses
- `gap-2` (0.5rem) — 30 uses
- `gap-8` (2rem) — 24 uses
- `gap-10` (2.5rem) — 6 uses
- `gap-12` (3rem) — 4 uses
- `gap-20` (5rem) — 2 uses (section spacing)

**Container widths**: `max-w-7xl` (80rem / 1280px) is the primary content container

### Border Radius
- `rounded-lg` (0.5rem) — 125 uses, dominant pattern
- `rounded-card` (custom token) — 55 uses
- `rounded-button` (custom token) — 14 uses
- `rounded-md` (0.375rem) — 7 uses
- `rounded-xl` (0.75rem) — 5 uses

### Glass-morphism / Blur
- `backdrop-blur-md` used on navigation overlay and dropdown menus

---

## 4. ANIMATIONS & INTERACTIONS

### Transition Classes
| Pattern | Usage |
|---------|-------|
| `transition-all duration-300` | General element transitions (hover, state changes) |
| `transition-opacity duration-200` | Fade in/out effects |
| `transition-transform duration-300` | Slide/scale animations |
| `transition-colors` | Color changes on hover |

### Hover Effects (by frequency)
- `hover:text-text-accent` — 169 uses (text turns green on hover)
- `hover:opacity-*` — 21 uses (opacity changes)
- `hover:border-border-card-hover` — 19 uses (card border highlight)
- `hover:bg-btn-hover-primary` — 2 uses (button background change)

### Group-Hover Interactions (Signature Pattern)
HTB uses Tailwind's `group-hover` extensively for compound hover effects:
- `group-hover/item:translate-x-1` — Arrow slides right on card hover (51 uses)
- `group-hover/item:scale-x-100` — Arrow line scales in (51 uses)
- `group-hover/item:opacity-100` — Elements fade in on parent hover (78 uses)
- `group-hover/item:text-text-accent` — Text color change (18 uses)
- `group-hover/menu:visible` — Menu shows on hover (6 uses)

**The Arrow Animation**: Most interactive cards have an arrow SVG that:
1. Starts with the arrow line at `scale-x-0 opacity-0`
2. On hover, line scales to `scale-x-100 opacity-100`
3. Simultaneously translates right `translate-x-1`
4. Uses `ease-out` easing
This creates a satisfying "draw and slide" arrow effect on every interactive card.

### Opacity System
- `opacity-0` / `opacity-100` — 85 uses each (toggle visibility)
- `opacity-50` — 64 uses (semi-transparent overlays)
- `opacity-90` — 14 uses
- `opacity-80` — 10 uses

### Named Animations
- `animate-fade-in` — Custom fade-in animation (likely defined in Tailwind config)
- No GSAP, Framer Motion, or heavy animation libraries detected
- Enterprise page uses animated GIF backgrounds (`enterprise-platform_bg.gif`)

---

## 5. UI/UX PATTERNS

### Card Patterns

**Standard Feature Card**:
```
[Icon 32x32] [Title - text-sm font-semibold]  [Arrow →]
             [Description - text-xs text-text-nav]
Background: bg-neutral-600
Border: border-border-card → hover:border-border-card-hover
Radius: rounded-lg
Padding: p-2 (internal), mb-2 (margin bottom)
```

**Gradient Border Card** (premium/highlighted):
```
Outer wrapper: padding: 1px; background: linear-gradient(...)
Inner content: full background, rounded corners
Effect: creates a 1px gradient border that looks like a glowing edge
```

**Tabbed Content Card**:
- 3 tab buttons across the top
- Each tab reveals: title, body HTML, image, button group
- Smooth content switch (no page reload)

### Navigation Patterns
- **Sticky top nav** with glass-morphism blur
- **Mega-menu dropdowns** triggered by hover (group-hover/menu pattern)
- **Breadcrumb navigation** available on sub-pages
- **Skip-to-content** link for accessibility
- **Mobile**: Hamburger menu (responsive breakpoints)

### Interactive Elements
- **Expand/Collapse Accordions** — `expand_more` icon with rotation
- **Auto-scrolling Logo Carousel** — Client logos in infinite loop
- **Tabbed Content Switcher** — 3 tabs with smooth content transitions
- **HubSpot Forms** — Inline forms with ChiliPiper lead routing
- **Cookie Consent Banner** — Cookiebot integration

### Image Patterns
- SVG for all icons and brand logos (crisp at any size)
- PNG/JPG for hero images and screenshots (1920px wide)
- GIF for animated backgrounds (enterprise page)
- `loading="lazy"` on non-critical images
- `object-contain` for logos, `object-cover` for hero images
- `aspect-auto` for responsive images

---

## 6. PROMOTIONAL IMAGERY STYLE

### Visual Aesthetic
- **Dark-mode-first**: Everything sits on deep navy/charcoal backgrounds
- **Neon Green Accents**: `#9FEF00` is THE signature color — used for all highlights, CTAs, and brand identity
- **Terminal/Hacker Aesthetic**: Product screenshots show dark terminal-like UIs with green text
- **Cyber-noir**: Dark gradients with isolated bright accent points
- **No 3D renders**: HTB avoids 3D illustrations in favor of actual product screenshots and flat/minimal SVG icons
- **Animated GIFs**: Used sparingly for hero backgrounds on enterprise pages
- **Clean Mockups**: Platform screenshots are clean, not stylized with device frames

### Icon Style
- Monochromatic SVG icons (green on dark, or white)
- 32x32px standard size (`w-8 h-8`)
- Simple, flat design — no gradients or shadows within icons
- Lucide-style stroke icons (16x16 with 1.5px stroke) for arrows and UI chrome

---

## 7. PRICING PRESENTATION

### Structure
**3 Enterprise Tiers + 3 Government Tiers + 1 Education Tier**

| Tier | Price | CTA | Badge |
|------|-------|-----|-------|
| **Build** (Teams) | $250/seat/month | "Try it free for 14 days" | — |
| **Grow** (Business) | "Let's talk" | "Get a demo" | MOST POPULAR |
| **Scale** (Enterprise) | "Let's talk" | "Get a demo" | — |

### Design Patterns
- **Vertical card stack** (not horizontal comparison grid)
- **"MOST POPULAR" badge** on middle tier (Grow)
- **Feature lists** with checkmark icons (included) and lightning bolt icons (premium)
- **Four feature categories**: Skills Development, Optimized Experience, Team Management, Lab Access
- **Monthly/Annual toggle**: "Save 20%" emphasis for annual billing
- **CTF Credits incentive**: 5,000-10,000 credits included with annual plans
- **Trust badges at bottom**: SOC 2, ISO 27001/27701/9001, Cyber Essentials, ANAB, G2, Capterra

### Pricing Psychology
- Only the lowest tier shows a number ($250) — higher tiers are "Let's talk"
- Free 14-day trial on entry tier creates low-friction entry
- "MOST POPULAR" badge uses social proof to push to middle tier
- Annual billing is the default/emphasized option
- Premium add-ons listed separately (Talent Search, Crisis Control, Event Credits, Custom Machines)

---

## 8. CTA STRATEGY

### Primary CTAs (by page)

| Page | Primary CTA | Secondary CTA | Style |
|------|------------|---------------|-------|
| Homepage | "Get Started" | "Get a demo" | Green accent button |
| Homepage Hero | "Read the report" (Forrester Wave) | — | Link with arrow |
| Hacker Page | "Join For Free" | "Learn To Hack" | Green / outlined |
| Business Page | "Get a Demo" | "14-Day Free Trial" | Stacked buttons |
| Pricing Page | "Try it free for 14 days" / "Get a demo" | — | Blue/green buttons |
| Labs Page | "Get Started" | "Sign Up" | Green accent |

### CTA Copy Patterns
- **Action-oriented verbs**: Get, Join, Start, Learn, Read, Explore
- **Low-commitment language**: "Free", "14 days", "Learn", "Explore"
- **Value-loaded**: "Get hands-on readiness", "Begin your journey", "Scale your team"
- **No pressure**: Avoids "Buy Now" or "Subscribe" — enterprise CTAs are always "Get a demo"
- **Dual CTA pattern**: Every page has a primary (high commitment) and secondary (low commitment) CTA

### Placement
- **Nav**: "Get Started" is always visible in top-right (sticky)
- **Hero**: Primary CTA below headline
- **Mid-page**: CTAs at end of each feature section
- **Bottom**: Full-width CTA section with form (enterprise) or button (individual)
- **Floating**: No floating/sticky bottom CTAs

---

## 9. UNIQUE / CLEVER ELEMENTS

### 1. Gradient Border Technique
The `padding: 1px` + gradient background wrapper is used extensively. It creates glowing gradient borders without using `border-image` (which has rendering issues). This is a well-known Tailwind trick but HTB uses it as a signature design element.

### 2. Arrow Draw Animation
The compound `group-hover` arrow effect (line scales from 0 to 100 + translates right) appears on nearly every interactive card (51+ instances). It creates a consistent, satisfying micro-interaction that makes the whole site feel responsive.

### 3. Semantic Design Token System
HTB has abstracted their colors into semantic tokens:
- `text-text-primary`, `text-text-secondary`, `text-text-accent`, `text-text-nav`
- `bg-layer-00`, `bg-layer-02`, `bg-neutral-600/700`
- `border-border-card`, `border-border-card-hover`
This makes theme changes trivial and ensures consistency.

### 4. Island Architecture
Marketing site uses HubSpot's island hydration — only interactive components (tabs, accordions, forms) get JavaScript. Static content is pure HTML. This means very fast page loads despite rich interactivity.

### 5. Dual Platform Strategy
Marketing site (hackthebox.com) = HubSpot CMS for SEO/conversion optimization.
Platform (app.hackthebox.com) = Vue.js SPA for rich interactivity.
Each is optimized for its purpose.

### 6. Enterprise vs Individual UX Split
The site fundamentally changes its personality:
- **Individual**: Gamification language ("PWN", "level up", "flags"), community stats, free tier emphasis
- **Enterprise**: ROI language ("readiness", "resilience", "measurable"), testimonials from named professionals, demo-first flow

### 7. Forrester Wave Badge
Prominently displayed in the hero — leveraging analyst recognition as the primary trust signal.

### 8. Client Logo Infinite Scroll
Auto-scrolling marquee of 25+ enterprise logos creates perception of massive adoption without taking much vertical space.

### 9. ChiliPiper Integration
Enterprise leads are routed through ChiliPiper for instant meeting booking — reducing friction between "Get a Demo" click and actual demo scheduling.

---

## 10. WEAKNESSES / OPPORTUNITIES FOR CROWBYTE

### 1. No Custom Typography
HTB uses system fonts. No distinctive typeface. CrowByte opportunity: **Use a distinctive monospace or tech font** (JetBrains Mono, Space Grotesk, or similar) to establish stronger visual identity.

### 2. Animation is Minimal
Despite the "hacker" brand, HTB's animations are limited to hover effects and fade-ins. No:
- Scroll-triggered animations
- Parallax effects
- WebGL/Canvas backgrounds
- Typed text effects
- Matrix rain / terminal animations
- Particle systems

CrowByte opportunity: **Rich scroll animations, terminal-style text reveals, particle/matrix backgrounds** would create a more immersive "hacker tool" feel.

### 3. Static Hero
The hero is a static image + text. No video background, no interactive element, no live demo preview. CrowByte opportunity: **Interactive hero** — show a live terminal, a real-time threat feed, or an animated cyber visualization.

### 4. Dated jQuery Dependency
They're still loading jQuery 1.7.1 (from 2011). This signals technical debt in the HubSpot layer. CrowByte is already modern (React/Electron) — lean into that.

### 5. HubSpot Lock-in Visible
Forms, CTAs, analytics — all HubSpot. This means their marketing site has HubSpot's characteristic "slightly generic" feel. CrowByte opportunity: **Fully custom-built site** feels more premium and authentic for a security tool.

### 6. No Dark/Light Toggle
Despite being a dark-mode-first site (perfect for their audience), there's no theme toggle. Some users prefer light mode. CrowByte opportunity: Offer both.

### 7. Individual Pricing is Hidden
The individual/hacker pricing isn't prominently displayed on the pricing page (which focuses on enterprise). This frustrates individual users. CrowByte opportunity: **Transparent individual pricing** prominently displayed.

### 8. Mobile Experience is Adequate, Not Great
The responsive design works but doesn't feel native. Mega-menus on mobile are clunky. CrowByte opportunity: **Mobile-first design** with touch-optimized interactions.

### 9. No Interactive Product Demo
HTB talks about labs but never lets you try one from the marketing site. CrowByte opportunity: **Embed a live interactive demo** directly on the landing page.

### 10. Generic Enterprise Pages
The business/enterprise pages follow a standard SaaS template (hero → features → logos → testimonials → CTA). Nothing distinctive. CrowByte opportunity: **Break the mold** — use unique layouts, interactive infographics, or real-time data visualizations to showcase capabilities.

### 11. Content Overload
The homepage has 7+ distinct sections. It tries to speak to individuals, businesses, AND governments all at once. CrowByte opportunity: **Focused messaging** — know your primary audience and speak to them first.

### 12. No Community Feed / Live Activity
Despite 4.3M members, the marketing site shows no live community activity. CrowByte opportunity: **Real-time activity feed** (recent solves, active users, live challenges) creates FOMO and shows the platform is alive.

---

## SUMMARY: HTB Design DNA

| Attribute | HTB's Approach |
|-----------|---------------|
| **Mood** | Professional cybersecurity, dark-mode, enterprise-credible |
| **Signature Color** | `#9FEF00` neon green on `#0b121f` dark navy |
| **Signature Interaction** | Arrow draw animation on card hover |
| **Layout Philosophy** | Section-based, card-heavy, tabbed content |
| **Typography** | Clean but generic (system fonts, no distinctive face) |
| **Tech Approach** | CMS-powered marketing + separate Vue.js platform |
| **Conversion Strategy** | Low-friction free tier for individuals, demo-first for enterprise |
| **Biggest Strength** | Enterprise credibility (Forrester, SOC2, client logos) |
| **Biggest Weakness** | Static, template-feeling design — doesn't match the "hacker" energy of the brand |

### Design Elements CrowByte Should Steal
1. The neon-on-dark color scheme (but pick a different signature color — cyan/electric blue?)
2. Semantic design token system for maintainability
3. Gradient border technique
4. Client logo auto-scroll marquee
5. Dual CTA pattern (high + low commitment)

### Design Elements CrowByte Should Surpass
1. Add rich scroll animations (GSAP/Framer Motion)
2. Interactive hero with live terminal or visualization
3. Custom typography for brand distinction
4. Real-time community/activity feeds
5. Embedded interactive demos
6. WebGL/Canvas backgrounds for the cyberpunk feel
7. Better mobile experience
