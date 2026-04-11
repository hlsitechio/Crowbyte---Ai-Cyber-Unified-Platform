---
title: I replaced 15 browser tabs with one Electron app for bug bounty hunting
published: false
description: "I was drowning in terminals, note apps, and CVE tabs during every hunt. So I built CrowByte — an open-source cybersecurity command center that puts recon, AI chat, threat intel, and reporting in one window."
tags: showdev, cybersecurity, opensource, electron
cover_image: https://dev-to-uploads.s3.amazonaws.com/uploads/articles/REPLACE_WITH_UPLOADED_IMAGE.png
---

Every bug bounty hunt looks the same:

- Terminal 1: running `subfinder` and `httpx`
- Terminal 2: `nmap` scan going
- Browser tab 1: NVD, looking up CVEs
- Browser tab 2: Shodan
- Browser tab 3: writing notes in Notion
- Browser tab 4: HackerOne report draft
- Browser tab 5-15: various targets, docs, references

Fifteen tabs. Three terminals. Two note apps. One overwhelmed hunter.

I've been doing this for years and I finally snapped. I built the tool I wished existed.

## Meet CrowByte Terminal

![CrowByte Landing — The Unified AI Platform for Security Teams](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/REPLACE_LANDING_HERO.png)

CrowByte is an **open-source Electron app** that puts everything a bug bounty hunter needs in one window. It's not a wrapper around existing tools — it's a purpose-built command center.

**Try it now:** [crowbyte.io](https://crowbyte.io)

---

## The feature that changed my workflow: Quad-Split

Any page in CrowByte can be split into 2 or 4 independent panes. I run my terminal in the bottom-left, CVE lookup top-left, AI chat on the right, and threat feed bottom-right.

Each pane scrolls independently. You can drag-and-swap them. Double-click to zoom one pane full-screen with a backdrop blur. Close a quad pane and it gracefully drops to dual-split instead of collapsing everything.

This alone saved me from tab hell.

---

## What's inside

### AI Chat with 95 security tools

The built-in AI doesn't just chat — it has access to **95 tools** that chain together:

```
You: "Run recon on target.com and save anything interesting"

AI: [runs nmap] → [runs nuclei] → [saves 3 findings to DB]
    → [auto-triages by severity] → "Found 3 issues.
       1 critical: exposed admin panel on port 8443..."
```

Recon, CVE lookup, report generation, detection rules, alert triage — all callable from natural language.

### Mission Board

Every bounty target gets a mission card. Drag it through 11 stages:

**Draft → Planning → Recon → Active → Exploitation → Reporting → Submitted → Completed → Paid**

Each card tracks scope, tools used, findings, and has AI-powered plan suggestions (optimize, reduce risk, accelerate, enhance stealth).

No more losing track of which target is at which stage.

### Real-time threat intel

Connected to 7 live feeds — URLhaus, ThreatFox, Feodo C2 trackers, bruteforce blocklists — plus security news aggregation. IOCs update automatically via Supabase Realtime.

I've caught overlaps between my targets and active threat campaigns I would have missed otherwise.

### CVE database

Query NVD + Shodan in parallel, save to your personal DB. CVSS scores, affected products, exploit status, CWE classification — all searchable and bookmarkable.

```
$ cve-db search apache 2.4
CVE-2026-XXXXX  CRITICAL  9.8  Apache 2.4.x RCE via mod_proxy
CVE-2026-XXXXX  HIGH      8.1  Apache 2.4.x SSRF in mod_rewrite
```

---

## The one technical decision that made everything work

The entire split-screen system is a single React context — no external library, no complex state machine. Just one context with ~30 actions managing which page renders where:

```typescript
type SplitMode = 'none' | 'dual' | 'quad';

// Each pane is just a page ID + independent state
interface SplitPane {
  pageId: string;
  scrollPos: number;
  state: Record<string, unknown>;
}
```

The hardest part wasn't the split logic — it was making Supabase Realtime work across multiple panes showing the same feed without duplicate subscriptions. I built a singleton channel manager that ref-counts listeners:

```typescript
// First pane to show the feed creates the channel
// Second pane adds a callback to the same channel
// Last pane to close removes the channel
const activeFeedChannels = new Map<string, {
  channel: RealtimeChannel;
  listeners: Set<(item: FeedItem) => void>;
}>();
```

Simple pattern, but it eliminated a whole class of "why am I getting 4x the events" bugs.

---

## Tech stack

```
React 18 + TypeScript + Vite    (frontend)
Electron 39                     (desktop shell)
Radix UI + Tailwind CSS         (UI)
xterm.js + node-pty             (terminal)
Supabase                        (auth, DB, realtime)
Framer Motion                   (animations)
Recharts                        (dashboards)
```

18 pages total: Dashboard, Chat, CVE, Terminal, Missions, Red Team, CyberOps, Network Scanner, Fleet, Agent Builder, Knowledge Base, Bookmarks, Reports, Detection Lab, Alert Center, Sentinel, Settings, and full Documentation.

---

## It's open source and I need help

I've been building this solo. It started as a weekend project and turned into 113K lines of code across 53 pages. I'm looking for people who want to build the ultimate security command center together.

**Where I need help:**
- **React/TypeScript** — more integrations, better mobile UX
- **Security tooling** — scanner integrations, custom detection rules
- **Supabase/backend** — scheduled feed ingestion, edge functions
- **Design** — UI polish, landing page, branding
- **Docs** — user guides, contribution guides

If you think building offensive security tools is cool, hit me up.

---

## Try it

**Web:** [crowbyte.io](https://crowbyte.io)
**GitHub:** [github.com/rainkode](https://github.com/rainkode)

---

What tools do you wish existed for your security workflow? I'm always looking for what to build next.
