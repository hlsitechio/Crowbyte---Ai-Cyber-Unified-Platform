# CrowByte Terminal — Full Integration Plan
# Based on: "Cybersecurity Tool Gaps Report" (HLSI Tech, March 2026)

> This plan maps every gap identified in the research report to concrete CrowByte features,
> with architecture, Supabase schema, new pages/services, and implementation order.

---

## Current Inventory

### Existing Pages (24)
Dashboard, Analytics, Chat, Terminal, CVE, ThreatIntelligence, NetworkScanner,
CyberOps, RedTeam, MissionPlanner, AgentBuilder, AIAgent, Fleet, Connectors,
SecurityMonitor, Knowledge, Bookmarks, Memory, Tools, Logs, Documentation,
LandingPage, Auth, SetupWizard + 10 Settings sub-pages

### Existing Services (50+)
claude-provider, openclaw, veniceai, monitoring-agent, red-team, custom-agents,
network-scans, mission-planner, threat-intel (feeds/iocs/enrichment), bookmarks,
knowledge, analytics, cache, encryption, mcp-client, tavily, searchAgent,
hybrid-redteam-agent, cybersec-ai-agent, agent-tester, systemMonitor, etc.

### Existing Supabase Tables
cves, knowledge_base, bookmarks, bookmark_categories, custom_agents,
red_team_ops, user_settings, profiles, endpoints, analytics

---

## PHASE 1: UNIFIED FINDINGS ENGINE (Weeks 1-3)
> Report Gap: "The Correlation Gap" — tools generate findings in isolation

### Problem
Every tool (nmap, nuclei, sqlmap, Shodan, Burp import) produces results in its own
format on its own page. No cross-reference. No dedup. No correlation.

### New Supabase Tables

```sql
-- Central findings table — ALL tool outputs normalize here
CREATE TABLE findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),

  -- Source
  source TEXT NOT NULL,           -- 'nmap', 'nuclei', 'sqlmap', 'burp', 'manual', 'shodan'
  source_scan_id UUID,            -- links to scan that produced this
  source_raw JSONB,               -- original tool output preserved

  -- Target
  target_host TEXT NOT NULL,       -- IP or hostname
  target_port INTEGER,
  target_url TEXT,                 -- full URL if web vuln
  target_protocol TEXT,            -- http, https, tcp, udp

  -- Finding
  title TEXT NOT NULL,
  description TEXT,
  finding_type TEXT NOT NULL,      -- 'vuln', 'misconfig', 'info', 'exposure', 'credential'
  severity TEXT NOT NULL,          -- 'critical', 'high', 'medium', 'low', 'info'
  cvss_score DECIMAL(3,1),
  cve_ids TEXT[],                  -- linked CVEs
  cwe_ids TEXT[],                  -- linked CWEs

  -- Context (the 82% fix)
  is_reachable BOOLEAN,           -- runtime reachability confirmed?
  is_exploitable BOOLEAN,         -- exploit available/tested?
  runtime_context JSONB,          -- stack trace, dependency path, etc.
  adjusted_severity TEXT,          -- after context analysis
  confidence DECIMAL(3,2),        -- 0.00-1.00

  -- Status
  status TEXT DEFAULT 'open',     -- 'open', 'confirmed', 'false_positive', 'resolved', 'accepted_risk'
  triage_notes TEXT,
  triaged_by TEXT,                -- 'human', 'ai', 'auto-rule'
  triaged_at TIMESTAMPTZ,

  -- Chain
  chain_id UUID,                  -- group related findings into attack chains
  chain_position INTEGER,         -- order in chain (1=initial, 2=pivot, 3=impact)

  -- Report
  included_in_report BOOLEAN DEFAULT false,
  report_id UUID,

  -- Meta
  tags TEXT[],
  evidence JSONB,                 -- screenshots, request/response pairs, logs
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scans table — tracks every scan execution
CREATE TABLE scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  tool TEXT NOT NULL,              -- 'nmap', 'nuclei', 'sqlmap', etc.
  target TEXT NOT NULL,
  command TEXT,                    -- actual command run
  options JSONB,                   -- scan config
  status TEXT DEFAULT 'running',   -- 'running', 'completed', 'failed', 'cancelled'
  findings_count INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  raw_output TEXT,
  parsed_output JSONB
);

-- Attack chains — group findings into exploit chains
CREATE TABLE attack_chains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,              -- "SSRF -> SSRF to internal API -> RCE"
  target TEXT NOT NULL,
  impact TEXT,                     -- business impact description
  cvss_chain_score DECIMAL(3,1),  -- overall chain severity
  status TEXT DEFAULT 'in_progress',
  findings_ids UUID[],
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Correlation rules — auto-detect patterns
CREATE TABLE correlation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT NOT NULL,         -- 'dedup', 'chain', 'escalate', 'suppress'
  conditions JSONB NOT NULL,       -- matching criteria
  actions JSONB NOT NULL,          -- what to do on match
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### New Service: `src/services/findings-engine.ts`

```
FindingsEngine
  - ingestNmap(scanResult) → normalized findings[]
  - ingestNuclei(scanResult) → normalized findings[]
  - ingestSqlmap(scanResult) → normalized findings[]
  - ingestBurp(xmlFile) → normalized findings[]
  - ingestShodan(ipData) → normalized findings[]
  - ingestManual(finding) → normalized finding
  - correlate(findingId) → related findings[]
  - deduplicate(findings[]) → unique findings[]
  - chainDetect(findings[]) → attack_chains[]
  - getByHost(host) → all findings for target
  - getByChain(chainId) → ordered chain findings
  - search(query, filters) → findings[]
  - stats() → { total, by_severity, by_source, by_status }
```

### New Page: `src/pages/Findings.tsx`

Unified findings dashboard showing:
- All findings from all tools in one table
- Filter by: source, severity, status, host, finding_type
- Group by: host, severity, source, chain
- Correlation view: click a finding → see related findings across tools
- Chain view: visualize attack chains as flowcharts
- Bulk triage: select multiple → mark as FP / confirmed / resolved
- Stats cards: total findings, confirmed, FP rate, avg time-to-triage

### Modified Pages
- **NetworkScanner.tsx** — "Save to Findings" button after scan
- **CVE.tsx** — link CVE entries to findings
- **CyberOps.tsx** — tool outputs → auto-ingest to findings
- **RedTeam.tsx** — findings feed from red_team_ops
- **Dashboard.tsx** — findings summary widget

### New Route
```tsx
<Route path="/findings" element={<Findings />} />
```

---

## PHASE 2: AI TRIAGE ENGINE (Weeks 3-5)
> Report Gap: "Automation That Resolves" — SOAR escalates, doesn't resolve

### Problem
Current AI (Chat page) is conversational. No structured triage pipeline.
SOC gets 4,484 alerts/day, 67% uninvestigated, 71% burnout.

### New Service: `src/services/triage-engine.ts`

```
TriageEngine
  - autoTriage(finding) → { verdict, confidence, reasoning, actions[] }
  - enrichFinding(finding) → enriched finding (Shodan, CVE, WHOIS, DNS)
  - assessReachability(finding) → { reachable: bool, path: string }
  - suggestRemediation(finding) → remediation steps[]
  - executeRemediation(finding, action) → result
  - batchTriage(findings[]) → triaged findings[]
  - getTriageHistory(findingId) → triage events[]
```

### AI Triage Pipeline

```
Finding arrives
  │
  ├─ Step 1: DEDUP — seen this exact finding before? → merge
  │
  ├─ Step 2: ENRICH
  │   ├─ Shodan IP lookup → owner, geo, services
  │   ├─ CVE lookup → known exploits, EPSS score
  │   ├─ DNS/WHOIS → domain context
  │   └─ Internal context → previous findings on same host
  │
  ├─ Step 3: CONTEXT SCORE
  │   ├─ Is the vulnerable component reachable from internet?
  │   ├─ Is there a public exploit? (ExploitDB, Metasploit)
  │   ├─ What's the EPSS probability?
  │   ├─ Asset criticality (if known)
  │   └─ Re-calculate adjusted_severity
  │
  ├─ Step 4: AI VERDICT (Claude via claude-provider)
  │   ├─ Analyze enriched finding
  │   ├─ Compare to known FP patterns
  │   ├─ Verdict: confirm / false_positive / needs_investigation
  │   └─ Confidence: 0.0 - 1.0
  │
  ├─ Step 5: AUTO-RESOLVE (if confidence > 0.95)
  │   ├─ FP confirmed → auto-suppress, log reason
  │   ├─ Known vuln + known fix → suggest patch command
  │   ├─ Misconfig → generate remediation script
  │   └─ Credential exposure → auto-rotate if API available
  │
  └─ Step 6: HUMAN QUEUE (if confidence < 0.95)
      ├─ Add to triage queue with AI analysis attached
      ├─ Priority sorted by adjusted_severity
      └─ One-click confirm/reject AI verdict
```

### New Supabase Tables

```sql
CREATE TABLE triage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finding_id UUID REFERENCES findings(id),
  event_type TEXT NOT NULL,        -- 'auto_triage', 'human_triage', 'enrich', 'resolve'
  verdict TEXT,                    -- 'confirmed', 'false_positive', 'needs_investigation'
  confidence DECIMAL(3,2),
  reasoning TEXT,                  -- AI explanation
  enrichment_data JSONB,           -- Shodan/CVE/DNS data
  actions_taken JSONB,             -- what was done
  performed_by TEXT,               -- 'ai:claude', 'ai:openclaw', 'human:username'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE remediation_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_conditions JSONB,        -- when to auto-apply
  steps JSONB NOT NULL,            -- ordered remediation steps
  target_type TEXT,                -- 'server', 'cloud', 'container', 'application'
  auto_execute BOOLEAN DEFAULT false,
  success_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Modified Page: `SecurityMonitor.tsx`
- Add triage queue panel
- Real-time incoming findings with AI pre-triage
- One-click approve/reject AI verdict
- Remediation action buttons
- Triage metrics: auto-resolved %, avg time, FP rate

---

## PHASE 3: REPORT GENERATOR (Weeks 5-7)
> Report Gap: "The Reporting Black Hole" — most hated workflow in pentesting

### Problem
Hours transcribing findings into Word/PDF. No standardized format.
Tools like SysReptor/Pwndoc exist but none dominant.

### New Service: `src/services/report-generator.ts`

```
ReportGenerator
  - generateReport(config) → Report
  - addFinding(reportId, findingId) → void
  - removeFinding(reportId, findingId) → void
  - reorderFindings(reportId, order[]) → void
  - setTemplate(reportId, template) → void
  - renderPDF(reportId) → Uint8Array
  - renderMarkdown(reportId) → string
  - renderHTML(reportId) → string
  - exportHackerOne(reportId) → H1 format
  - exportBugcrowd(reportId) → Bugcrowd format
```

### Report Templates

```
Templates:
  - HackerOne submission
  - Bugcrowd submission
  - Pentest executive summary
  - Pentest technical report (full)
  - Vulnerability disclosure
  - Compliance report (PCI/SOC2)
  - Custom template builder
```

### New Supabase Tables

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  target TEXT,
  report_type TEXT NOT NULL,       -- 'pentest', 'bounty', 'disclosure', 'compliance'
  template TEXT NOT NULL,          -- 'hackerone', 'bugcrowd', 'pentest_full', 'custom'
  status TEXT DEFAULT 'draft',     -- 'draft', 'review', 'final', 'submitted'

  -- Content
  executive_summary TEXT,
  scope TEXT,
  methodology TEXT,
  findings_ids UUID[],             -- ordered finding references
  recommendations TEXT,

  -- Meta
  client_name TEXT,
  assessment_dates JSONB,          -- { start, end }
  assessor_name TEXT,
  classification TEXT,             -- 'confidential', 'internal', 'public'

  -- Export
  last_exported_at TIMESTAMPTZ,
  export_format TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  platform TEXT,                   -- 'hackerone', 'bugcrowd', 'generic', 'custom'
  sections JSONB NOT NULL,         -- template structure
  css_theme TEXT,                  -- custom styling
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### New Page: `src/pages/Reports.tsx`

- Report builder UI — drag findings from Findings page
- Live preview (split pane: editor | rendered)
- Auto-populate from confirmed findings
- Evidence attachment (screenshots auto-pulled from findings.evidence)
- AI-assisted writing: "Improve this description" / "Add business impact"
- Export: PDF, Markdown, HTML, HackerOne JSON, Bugcrowd JSON
- Report history with versioning

### New Route
```tsx
<Route path="/reports" element={<Reports />} />
```

---

## PHASE 4: DETECTION ENGINEERING (Weeks 7-9)
> Report Gap: Natural language -> detection rules, Detection rule CI/CD

### Problem
40% of new detections already written with AI (Block/Panther).
No tool lets you go from English → SIGMA → deployed in SIEM.

### New Service: `src/services/detection-engine.ts`

```
DetectionEngine
  - naturalLanguageToRule(description, format) → rule
  - generateSIGMA(description) → SIGMA YAML
  - generateKQL(description) → KQL query
  - generateSPL(description) → Splunk SPL
  - generateYARA(description) → YARA rule
  - testRule(rule, sampleLogs[]) → matches[]
  - validateRule(rule) → { valid, errors[] }
  - deployRule(rule, target) → deployment result
  - versionRule(ruleId) → git commit
  - getRuleHealth(ruleId) → { firing, last_match, fp_rate }
```

### New Supabase Tables

```sql
CREATE TABLE detection_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,                -- plain English description

  -- Rule content
  format TEXT NOT NULL,            -- 'sigma', 'kql', 'spl', 'yara', 'snort', 'suricata'
  rule_content TEXT NOT NULL,      -- the actual rule
  rule_metadata JSONB,             -- MITRE ATT&CK, severity, tags

  -- Lifecycle
  status TEXT DEFAULT 'draft',     -- 'draft', 'testing', 'active', 'disabled', 'retired'
  version INTEGER DEFAULT 1,

  -- Testing
  test_results JSONB,              -- { samples_tested, true_pos, false_pos, false_neg }
  last_tested_at TIMESTAMPTZ,

  -- Deployment
  deployed_to TEXT[],              -- ['splunk-prod', 'elastic-soc']
  deployed_at TIMESTAMPTZ,

  -- Health
  total_matches INTEGER DEFAULT 0,
  false_positive_count INTEGER DEFAULT 0,
  last_match_at TIMESTAMPTZ,

  -- AI
  generated_by TEXT,               -- 'human', 'ai:claude', 'ai:openclaw'
  ai_confidence DECIMAL(3,2),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE detection_test_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_id UUID REFERENCES detection_rules(id),
  sample_log TEXT NOT NULL,
  expected_match BOOLEAN,
  actual_match BOOLEAN,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### New Page: `src/pages/DetectionLab.tsx`

- Natural language input → AI generates rule in chosen format
- Side-by-side: English description | Generated rule | Test results
- Sample log paste/upload → test rule against it
- MITRE ATT&CK mapping (auto-suggested)
- Version history (git-style diff view)
- Deploy to connected SIEM (via Connectors page integrations)
- Rule health dashboard: firing rate, FP rate, last match

### New Route
```tsx
<Route path="/detection-lab" element={<DetectionLab />} />
```

---

## PHASE 5: MISSION PIPELINE (Weeks 9-11)
> Report Gap: Unified pentest workflow (recon -> exploit -> C2 -> report)

### Problem
Red teamers chain 10-20 tools manually. Spreadsheets + siloed tools.
Nobody built the full recon → exploit → report pipeline.

### Enhanced Service: `src/services/mission-planner.ts` (UPGRADE)

```
MissionPipeline (extends existing MissionPlanner)
  - createMission(target, scope) → Mission
  - addPhase(missionId, phase) → Phase
  - executePhase(phaseId) → results
  - autoAdvance(phaseId) → next phase with enriched context

  Phases:
    1. RECON
       - subfinder → httpx → alive hosts
       - nmap → open ports + services
       - Shodan enrichment
       - → auto-populate findings

    2. ENUMERATE
       - ffuf/dirsearch → directories
       - nuclei tech detect → stack fingerprint
       - API endpoint discovery
       - → findings + attack surface map

    3. VULNERABILITY SCAN
       - nuclei (critical+high templates)
       - sqlmap (detected injection points)
       - XSS scanning (dalfox)
       - SSRF/SSTI probes
       - → findings with evidence

    4. EXPLOIT
       - Exploit confirmed vulns
       - Chain findings → max impact
       - Capture evidence (request/response, screenshots)
       - → confirmed findings + chains

    5. POST-EXPLOIT (if authorized)
       - Privilege escalation checks
       - Lateral movement mapping
       - Data access audit
       - → impact assessment

    6. REPORT
       - Auto-generate from all phase findings
       - One-click export to platform format
       - → final deliverable
```

### Enhanced Page: `MissionPlanner.tsx` (UPGRADE)

Current MissionPlanner is phase-based but static. Upgrade to:
- Visual pipeline with drag-drop phases
- Each phase card shows: tool(s), target(s), status, findings count
- Click phase → expand to see all tool outputs
- Auto-advance: phase 1 output feeds phase 2 input
- Real-time progress tracking
- Findings auto-flow into Findings Engine (Phase 1)
- Final phase auto-generates report (Phase 3)

---

## PHASE 6: ALERT INGESTION & SIEM BRIDGE (Weeks 11-13)
> Report Gap: Cross-vendor correlation engine, unified investigation timeline

### Problem
SOC analysts swivel-chair between SIEM, EDR, identity consoles.
No unified view. 87% of incidents require 2+ data sources.

### New Service: `src/services/alert-ingestion.ts`

```
AlertIngestion
  - connectSplunk(config) → stream
  - connectElastic(config) → stream
  - connectSentinel(config) → stream
  - connectSyslog(port) → stream
  - connectWebhook(path) → endpoint
  - ingestAlert(source, alert) → normalized alert
  - correlateAlerts(timeWindow) → correlated groups
  - createTimeline(alertGroup) → unified timeline
```

### New Supabase Tables

```sql
CREATE TABLE alert_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,       -- 'splunk', 'elastic', 'sentinel', 'syslog', 'webhook', 'crowdstrike'
  connection_config JSONB,         -- encrypted connection details
  status TEXT DEFAULT 'disconnected',
  last_seen_at TIMESTAMPTZ,
  alerts_ingested INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  source_id UUID REFERENCES alert_sources(id),

  -- Normalized fields
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL,
  source_type TEXT NOT NULL,       -- which SIEM/EDR
  original_id TEXT,                -- ID in source system
  original_data JSONB,             -- raw alert preserved

  -- Context
  affected_host TEXT,
  affected_user TEXT,
  source_ip TEXT,
  dest_ip TEXT,
  mitre_tactics TEXT[],
  mitre_techniques TEXT[],

  -- Triage
  status TEXT DEFAULT 'new',       -- 'new', 'triaging', 'escalated', 'resolved', 'false_positive'
  assigned_to TEXT,
  correlation_group_id UUID,

  -- Timeline
  alert_time TIMESTAMPTZ NOT NULL,
  ingested_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE investigation_timelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  description TEXT,
  alert_ids UUID[],
  finding_ids UUID[],              -- cross-link with findings engine
  timeline_events JSONB,           -- ordered events from all sources
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Enhanced Page: `Connectors.tsx` (UPGRADE)

Current Connectors page exists but needs:
- SIEM connection wizard (Splunk API, Elastic API, Sentinel API)
- Syslog listener config
- Webhook endpoint generator
- Connection health monitoring
- Alert flow metrics per source

### New Page: `src/pages/AlertCenter.tsx`

- Real-time alert feed from all connected sources
- Unified investigation timeline (endpoint + identity + cloud + email)
- AI auto-triage on incoming alerts (reuse Phase 2 triage engine)
- Correlation groups: related alerts auto-grouped
- MITRE ATT&CK overlay on timeline
- One-click escalate → creates finding in Findings Engine

### New Route
```tsx
<Route path="/alert-center" element={<AlertCenter />} />
```

---

## PHASE 7: CLOUD SECURITY POSTURE (Weeks 13-15)
> Report Gap: Runtime + static reachability, automated cloud remediation

### Problem
82% of "critical" dependency CVEs aren't critical in context.
CSPM generates 4,700 findings/week. Teams need context, not volume.

### New Service: `src/services/cloud-security.ts`

```
CloudSecurity
  - connectAWS(credentials) → account context
  - connectAzure(credentials) → account context
  - connectGCP(credentials) → account context
  - scanIAM(account) → misconfigs[]
  - scanS3/Blob/GCS(account) → exposures[]
  - scanNetwork(account) → findings[]
  - assessReachability(finding) → reachability path
  - generateRemediation(finding) → terraform/CLI fix
  - executeRemediation(finding, fix) → result
  - importSBOM(file) → dependency tree
  - analyzeReachability(sbom, runtime) → filtered vulns
```

### New Page: `src/pages/CloudSecurity.tsx`

- Multi-cloud dashboard (AWS/Azure/GCP)
- IAM attack path visualization
- S3/Blob public exposure scanner
- SBOM import + reachability analysis
- "100 criticals → 18 real" filter view
- One-click Terraform remediation generation
- Cloud asset inventory

### New Route
```tsx
<Route path="/cloud-security" element={<CloudSecurity />} />
```

---

## IMPLEMENTATION ORDER & DEPENDENCIES

```
Week 1-3:   PHASE 1 — Findings Engine (FOUNDATION — everything else builds on this)
                │
Week 3-5:   PHASE 2 — AI Triage Engine (needs Findings)
                │
Week 5-7:   PHASE 3 — Report Generator (needs Findings)
                │
Week 7-9:   PHASE 4 — Detection Lab (independent, can parallel with Phase 3)
                │
Week 9-11:  PHASE 5 — Mission Pipeline (needs Findings + Triage)
                │
Week 11-13: PHASE 6 — Alert Center (needs Findings + Triage)
                │
Week 13-15: PHASE 7 — Cloud Security (needs Findings + Triage)
```

### Dependency Graph

```
                    ┌──────────────┐
                    │   FINDINGS   │ ← EVERYTHING depends on this
                    │   ENGINE     │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
        ┌─────▼─────┐ ┌───▼────┐ ┌─────▼──────┐
        │  AI TRIAGE │ │REPORTS │ │ DETECTION  │
        │  ENGINE    │ │  GEN   │ │    LAB     │
        └─────┬──────┘ └───┬────┘ └────────────┘
              │            │
    ┌─────────┼────────┐   │
    │         │        │   │
┌───▼────┐ ┌─▼──────┐ │   │
│MISSION │ │ ALERT  │ │   │
│PIPELINE│ │ CENTER │ │   │
└────────┘ └────────┘ │   │
                      │   │
               ┌──────▼───▼──┐
               │    CLOUD    │
               │  SECURITY   │
               └─────────────┘
```

---

## NEW SIDEBAR NAVIGATION

```
Current sidebar + additions:

COMMAND
  Dashboard
  Chat
  Terminal

INTELLIGENCE
  CVE Database
  Threat Intelligence
  + Findings          ← NEW (Phase 1)
  + Alert Center      ← NEW (Phase 6)
  + Detection Lab     ← NEW (Phase 4)

OPERATIONS
  Mission Planner     ← UPGRADED (Phase 5)
  Red Team
  Network Scanner
  CyberOps
  + Cloud Security    ← NEW (Phase 7)

MANAGEMENT
  + Reports           ← NEW (Phase 3)
  Fleet
  Connectors          ← UPGRADED (Phase 6)
  Security Monitor    ← UPGRADED (Phase 2)

TOOLS
  Agent Builder
  AI Agent
  Tools
  Knowledge
  Bookmarks
  Memory

SYSTEM
  Analytics
  Logs
  Documentation
  Settings
```

---

## PRICING ALIGNMENT (from Landing Page)

| Feature | Free | Pro $29 | Team $79 | Enterprise |
|---------|------|---------|----------|------------|
| Findings Engine | 50/mo | Unlimited | Unlimited | Unlimited |
| AI Triage | 10/mo | 500/mo | 5000/mo | Unlimited |
| Report Gen | 2/mo | Unlimited | Unlimited | Custom templates |
| Detection Lab | 5 rules | 100 rules | Unlimited | + SIEM deploy |
| Mission Pipeline | 1 active | 10 active | Unlimited | Unlimited |
| Alert Ingestion | - | 1 source | 5 sources | Unlimited |
| Cloud Security | - | 1 account | 5 accounts | Unlimited |

---

## TECH DECISIONS

| Decision | Choice | Why |
|----------|--------|-----|
| Findings normalization | Supabase PostgreSQL + JSONB | Already have Supabase, JSONB handles varied tool outputs |
| AI Triage model | Claude via claude-provider | Already integrated, MCP tools for enrichment |
| Report PDF | @react-pdf/renderer | React native, no external service |
| Detection rules | SIGMA as canonical | Industry standard, transpiles to KQL/SPL/etc |
| SIEM integration | REST API polling | Simpler than streaming, works with Splunk/Elastic/Sentinel |
| Cloud APIs | AWS SDK / Azure SDK / GCP SDK | Direct, no wrapper needed |
| Rule versioning | Supabase + version column | Keep it simple, full git later |

---

## ESTIMATED LOC PER PHASE

| Phase | New Files | Est. Lines | Complexity |
|-------|-----------|------------|------------|
| 1. Findings Engine | 3 (service + page + types) | ~2,500 | Medium |
| 2. AI Triage | 2 (service + components) | ~1,800 | High |
| 3. Reports | 3 (service + page + templates) | ~3,000 | Medium |
| 4. Detection Lab | 3 (service + page + transpiler) | ~2,200 | High |
| 5. Mission Pipeline | 2 (upgrade service + page) | ~1,500 | Medium |
| 6. Alert Center | 3 (service + page + connectors) | ~2,800 | High |
| 7. Cloud Security | 3 (service + page + providers) | ~3,200 | High |
| **Total** | **~19 new files** | **~17,000** | |

---

## WHAT THIS MAKES US

After all 7 phases, CrowByte becomes:

```
Enterprise charges:          CrowByte delivers:
Splunk    $300K-$3.5M/yr     Alert Center + Findings    $29/mo
Cortex    $360K/yr           Triage + Mission Pipeline   $29/mo
CrowdStrike $100K-$800K     Security Monitor + Fleet     $29/mo
Cobalt Strike $3.5K/user    Red Team + d3bugr tools      $29/mo
Burp Ent  $6K-$50K          142 MCP scanning tools       $29/mo
Snyk      scales to $$$     Cloud Security               $29/mo
                                                    ─────────────
Total enterprise: $500K+/yr  CrowByte Pro: $348/yr
```

The report says practitioners need:
1. Tools that reduce noise through contextual intelligence ← Findings Engine + AI Triage
2. Automation that resolves, not escalates ← Triage Engine + Remediation Playbooks
3. Cross-vendor, honestly priced ← $29/mo, vendor-agnostic, AI-native

**We're not building another SIEM. We're building the integration layer nobody else built.**
