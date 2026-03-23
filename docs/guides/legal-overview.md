# CrowByte Terminal -- Legal Framework Overview

**Applies to:** CrowByte Terminal v2.0.0
**Publisher:** HLSITech (d/b/a CrowByte)
**Legal contact:** legal@crowbyte.io
**Security contact:** security@crowbyte.io
**Privacy contact:** privacy@crowbyte.io / dpo@crowbyte.io

---

## Table of Contents

1. [Document Index](#document-index)
2. [End User License Agreement (EULA)](#end-user-license-agreement-eula)
3. [Terms of Service](#terms-of-service)
4. [Privacy Policy](#privacy-policy)
5. [Acceptable Use Policy (AUP)](#acceptable-use-policy-aup)
6. [Export Controls and ECCN Classification](#export-controls-and-eccn-classification)
7. [Indemnification and User Liability](#indemnification-and-user-liability)
8. [Dual-Use Software Classification](#dual-use-software-classification)
9. [Data Protection Compliance](#data-protection-compliance)
10. [Licensing Tiers and Restrictions](#licensing-tiers-and-restrictions)
11. [Contact Information](#contact-information)

---

## Document Index

CrowByte Terminal's legal framework consists of four primary documents. All are located in the `/legal/` directory at the repository root:

| Document | Path | Version | Purpose |
|----------|------|---------|---------|
| End User License Agreement | `/legal/EULA.md` | 1.0 | Software license grant, restrictions, IP ownership, warranties, liability, indemnification, export controls, tier-specific terms |
| Terms of Service | `/legal/TERMS_OF_SERVICE.md` | 1.0 | Service terms governing access, subscriptions, payment, data rights, SLAs, dispute resolution |
| Privacy Policy | `/legal/PRIVACY_POLICY.md` | 1.0 | Data collection, processing, retention, sharing, GDPR/CCPA compliance, user rights |
| Acceptable Use Policy | `/legal/ACCEPTABLE_USE_POLICY.md` | 1.0 | Authorized use requirements, prohibited activities, indemnification, law enforcement cooperation, responsible disclosure |

These documents are referenced in the Setup Wizard (Step 1: Welcome), which requires the user to accept both the EULA + Privacy Policy and the Acceptable Use Policy before proceeding.

The Terms of Service explicitly incorporates the EULA, AUP, and Privacy Policy by reference. In the event of a conflict, the Terms of Service controls unless a referenced policy expressly states otherwise.

---

## End User License Agreement (EULA)

**Path:** `/legal/EULA.md`

The EULA is the primary software licensing agreement between the user and HLSITech. It covers the following areas:

### License Grant (Section 2)

- **Type:** Limited, non-exclusive, non-transferable, non-sublicensable, revocable license.
- **Basis:** Per-user, per-seat. Each Authorized User requires a separate license.
- **Installation:** Up to 2 devices per license (e.g., workstation + laptop), but only 1 simultaneous instance per license.
- **Platforms:** Windows, macOS, Linux. Use on unsupported platforms is at the user's risk.
- **Scope:** Object code only. No rights to source code, build systems, or undocumented internal APIs.

### License Restrictions (Section 3)

Users may not:
- Reverse engineer, decompile, or disassemble the Software (except where applicable law permits for interoperability, after requesting information from HLSITech first).
- Modify or create derivative works.
- Redistribute, sublicense, rent, lease, or sell the Software.
- Use the Software for competitive benchmarking without prior written consent.
- Provide managed security services (pen-testing-as-a-service) to third parties without a separate MSP addendum.
- Remove proprietary notices or circumvent license controls.
- Exceed the feature set or usage limits of the licensed tier.

### Dual-Use Warning (Section 4)

The EULA prominently warns that CrowByte Terminal is an offensive security tool with capabilities that can cause severe and irreversible damage, including data loss, system downtime, network disruption, and complete system compromise. Users must:

- Obtain explicit, prior, written authorization from the lawful owner of any target system.
- Operate within a defined scope (contract, statement of work, or rules of engagement).
- Comply with all applicable laws in all jurisdictions where testing occurs.
- Immediately cease testing if the scope of authorization is found to be insufficient.

### License Activation (Section 5)

- Online activation required within 14 days of installation.
- Machine fingerprinting binds the license to specific hardware (non-PII system attributes, transmitted encrypted).
- Periodic license check-in every 7 days. A 14-day grace period is provided if the software cannot reach the activation server.
- After the grace period, the software reverts to Community Edition functionality.
- License keys are Confidential Information. Users must keep them secure, not publish them, and report any suspected compromise.

### Fees and Tiers (Section 6)

| Tier | Annual Fee (Per User) |
|------|----------------------|
| Community | Free ($0) |
| Professional | $299 -- $499 |
| Team | $799 -- $1,499 |
| Enterprise | Custom pricing |

- Annual subscription model with auto-renewal (30-day cancellation notice required).
- 14-day grace period on subscription expiration before reverting to Community Edition.
- Fees are non-refundable except in the case of warranty claims or termination for convenience by the Company (pro-rata refund).

### Warranties (Section 9)

- **Paid tiers:** 30-day limited warranty that the Software performs substantially in accordance with the Documentation. Remedy: repair, replacement, or refund.
- **All tiers:** AS-IS/AS-AVAILABLE disclaimer. No guarantee of results, completeness, or accuracy. The Company explicitly does not warrant that the Software will detect all vulnerabilities.
- **Community Edition:** No warranty whatsoever (Section 16). Liability capped at USD $50.00.

### Limitation of Liability (Section 10)

- No liability for indirect, incidental, special, consequential, or punitive damages.
- **Paid tiers:** Aggregate liability capped at 12 months of fees paid.
- **Community Edition:** Aggregate liability capped at USD $50.00.
- Carve-outs apply: indemnification obligations, willful misconduct, breach of license restrictions or authorized use provisions are not subject to the cap.

### Free/Community Edition Addendum (Section 16)

Community Edition users are subject to additional terms:
- No support obligation from the Company.
- Features may be modified or removed at any time without notice.
- The Community Edition may be discontinued entirely with commercially reasonable efforts to provide 30-day notice.
- In-app promotional notifications for paid tiers may be displayed.
- Telemetry collection may not be fully disableable.

### Academic License Addendum (Section 17)

A separate tier for accredited educational institutions, faculty, staff, and students:
- Non-commercial use only.
- 12-month term, renewable upon re-verification of eligibility.
- Student licenses expire on graduation, withdrawal, or loss of enrollment.
- Feature set determined by the Company (may match Professional tier).
- Same warranty disclaimer as Community Edition.

---

## Terms of Service

**Path:** `/legal/TERMS_OF_SERVICE.md`

The Terms of Service establishes the broader contractual relationship governing access to CrowByte Terminal and its associated cloud services. Key provisions:

### Scope

Covers the desktop application, cloud services (Supabase-backed), APIs, documentation, and all related software and services. Incorporates the EULA, AUP, and Privacy Policy by reference.

### Account Registration (Section 2)

- Users must be at least 18 years old.
- One account per natural person.
- Accurate, current, and complete information required.
- Users are responsible for all activity under their account.

### Subscription Plans and Payment (Section 4)

Mirrors the EULA tier structure with additional detail on:
- Billing cycles (annual).
- Auto-renewal mechanics.
- Price change notice requirements (45 days for renewals).
- Refund policy.
- Late payment consequences (1.5% monthly interest, access suspension after 15 days past due).

### User Content and Data (Section 7)

- Users retain ownership of all content they create (reports, findings, configurations, scripts).
- HLSITech receives a limited license to process User Content as needed to provide the service.
- Users are responsible for backing up their own data.
- HLSITech may remove content that violates the Terms or AUP.

### Third-Party Services (Section 8)

Acknowledges integration with external services:
- Supabase (database and auth)
- Anthropic Claude API (AI chat)
- NVD/NIST (CVE data)
- Shodan (network intelligence)
- OpenClaw VPS (self-hosted AI agents)

Each integration is subject to its own terms and privacy practices.

### Service Level (Section 9)

- Uptime targets for cloud-hosted services (specifics depend on tier).
- Enterprise tier eligible for custom SLA terms.
- Planned maintenance windows with advance notice.

### Dispute Resolution (Section 14)

- Informal resolution attempt first (30 days).
- Binding arbitration under AAA Commercial Arbitration Rules.
- Class action waiver.
- Injunctive relief carve-out for IP and Confidential Information protection.

---

## Privacy Policy

**Path:** `/legal/PRIVACY_POLICY.md`

The Privacy Policy details how CrowByte Terminal collects, uses, shares, and protects user information.

### Data categories collected

| Category | Examples |
|----------|---------|
| **Account & Identity** | Name, email, username, profile picture, workspace name, auth tokens, device fingerprints (SHA-256 hashed) |
| **Telemetry & Usage** | Feature usage events, API response times, error rates, user agent, screen resolution, timezone |
| **Security Operations** | CVE searches, scan result metadata, target IPs/domains, red team operation logs, knowledge base entries |
| **AI Interaction** | Chat prompts/responses (Claude and OpenClaw), model preferences, session metadata |
| **VPS & Fleet** | Endpoint hostnames/IPs, agent task records, VNC session metadata (not screen content) |
| **Technical** | Error logs, crash reports, Electron version, OS info, performance metrics |

### Data flow architecture

The Privacy Policy includes a full data flow diagram (Section 15) showing how data moves between:
- CrowByte Terminal (Electron desktop app with local storage)
- Supabase (AWS, US regions) -- auth, profiles, bookmarks, knowledge base, CVE metadata
- Anthropic API (US) -- AI chat prompts
- NVD/NIST API (US) -- CVE lookups
- Shodan API (US) -- network intelligence
- OpenClaw VPS (Brazil) -- AI agent orchestration

### What stays local vs. goes to cloud

Key distinction documented in the Privacy Policy:
- **Chat history** (full conversations) stays local. Only prompts are transmitted in-transit to AI providers.
- **Vulnerability scan results** stay local. Only metadata is synced to Supabase.
- **Target IPs and domains** stay local unless explicitly sent via API calls (Shodan, OpenClaw).
- **Device fingerprints** are SHA-256 hashed before storage. Raw attributes are never persisted.

### Data we do NOT sell

The Privacy Policy explicitly states: "We do not sell, rent, or trade your personal information to third parties. Period."

### Data retention

| Category | Retention |
|----------|-----------|
| Account & Identity | Account duration + 30 days |
| Telemetry & Usage | 12 months (rolling) |
| Security Operations | User-controlled (delete anytime) |
| AI Interaction | Not stored server-side beyond session |
| VPS & Fleet | Account duration |
| Technical | 90 days |

### Security measures

- TLS 1.3 for all data in transit.
- AES-256 encryption at rest (Supabase).
- Row-Level Security (RLS) on all Supabase tables.
- SHA-256 hashed device fingerprints.
- No plaintext credential storage.
- Multi-factor authentication for internal infrastructure access.
- 72-hour breach notification commitment (per GDPR).

### No cookies

CrowByte Terminal is a desktop application (Electron). It does not use browser cookies. Local storage, Supabase auth tokens, and analytics events serve equivalent functions and are documented accordingly.

### Children's privacy

The application is not intended for anyone under 18. No data is knowingly collected from minors.

---

## Acceptable Use Policy (AUP)

**Path:** `/legal/ACCEPTABLE_USE_POLICY.md`

The AUP is the most operationally significant legal document for CrowByte users. It defines what constitutes authorized use and what is prohibited.

### Authorization requirements (Section 3)

All use of CrowByte Terminal must satisfy these conditions:

1. **Written authorization** from the System Owner for all target systems, specifying scope, methods, and time windows.
2. **Scope compliance** -- testing must not exceed authorized boundaries.
3. **Documentation retention** -- authorization records must be kept for at least 3 years.
4. **Third-party infrastructure** -- if targets include cloud/hosting/SaaS systems, additional authorization from those providers is required.
5. **Professional competence** -- users represent they have the technical knowledge to use the Software responsibly.

### Permitted activities

- Authorized penetration testing and red team engagements.
- Vulnerability assessment of owned or authorized systems.
- Security auditing and compliance testing within scope.
- Defensive security (blue team) exercises.
- Security research on owned systems or in controlled labs.
- Bug bounty program participation (in compliance with program rules).
- Educational and training purposes on authorized systems.

### Prohibited activities (Section 4)

- Unauthorized access to any system (regardless of intent).
- Any activity violating CFAA (US), Computer Misuse Act (UK), Criminal Code 342.1 (Canada), Budapest Convention implementations (EU), or equivalent laws.
- Deployment of ransomware, cryptominers, wipers, or destructive malware.
- DoS/DDoS attacks.
- Data exfiltration, theft, or public disclosure of stolen data.
- Extortion or blackmail.
- Espionage or unauthorized surveillance.
- Interference with critical infrastructure, emergency services, or healthcare systems.
- "Hack back" or retaliatory operations.
- Testing beyond authorized scope or time windows.
- Circumvention of CrowByte's own license or security controls.
- Redistribution of the Software without written permission.

### Responsible disclosure (Section 8)

- Vulnerabilities discovered during authorized testing must be reported to the System Owner per the applicable ROE, disclosure policy, or bug bounty program rules.
- A minimum 90-day remediation period is recommended before public disclosure.
- No exploitative disclosure (extortion, competitive advantage, etc.).
- Vulnerabilities in CrowByte itself should be reported to security@crowbyte.io; CrowByte commits to acknowledging reports within 5 business days.

### Compliance monitoring (Section 13)

- CrowByte may collect anonymized usage telemetry for compliance monitoring.
- CrowByte reserves audit rights with reasonable notice.
- Automated abuse detection systems may flag patterns consistent with misuse (unauthorized target scanning, excessive volume, etc.) and trigger automated suspension pending review.

### Authorization verification checklist (Appendix A)

The AUP includes a pre-engagement checklist that users should complete before testing any target:

- Written authorization obtained from System Owner.
- Scope defined (IP ranges, domains, applications).
- Permitted methods and tools specified.
- Time windows specified.
- Cloud/hosting provider authorization obtained (if applicable).
- Rules of Engagement signed.
- Emergency contacts documented.
- Target backups confirmed.
- Professional liability / E&O insurance verified.
- Applicable laws reviewed for all relevant jurisdictions.
- Data handling and retention procedures agreed.
- Incident response procedures defined.
- Reporting format and timeline agreed.

### Jurisdiction quick reference (Appendix B)

The AUP provides a reference table covering computer crime laws in major jurisdictions:

| Jurisdiction | Law | Max Penalty |
|-------------|-----|-------------|
| United States | CFAA, 18 U.S.C. 1030 | 10-20 years |
| United Kingdom | Computer Misuse Act 1990 | 6 months - 5 years |
| Canada | Criminal Code 342.1 | 10 years |
| EU | Member state laws + EU Cybersecurity Act | Varies |
| Australia | Criminal Code Act 1995, Part 10.7 | 10 years |
| Germany | StGB Sections 202a-c | 3 years |
| France | Penal Code Art. 323-1 | 2-5 years |

---

## Export Controls and ECCN Classification

CrowByte Terminal is subject to U.S. export control regulations due to its nature as offensive security software with encryption capabilities.

### Classification

The Software may be classified under **ECCN 5D002** (Information Security -- Software) or **5D992** under the Export Administration Regulations (EAR) administered by the U.S. Department of Commerce, Bureau of Industry and Security (BIS).

ECCN 5D002 covers software that:
- Is specifically designed or modified for the development, production, or use of items controlled under Category 5, Part 2 (Information Security).
- Implements, develops, or tests cryptographic functionality described in the Commerce Control List.

### Implications for users

- Export, re-export, or transfer of the Software may require prior authorization from BIS.
- The Software may not be exported or made available to sanctioned countries or territories. As of the EULA effective date, this includes: **Cuba, Iran, North Korea, Syria, and the Crimea/Donetsk/Luhansk regions of Ukraine**.
- The Software may not be provided to individuals or entities on restricted party lists, including:
  - OFAC Specially Designated Nationals (SDN) List
  - BIS Entity List, Denied Persons List, and Unverified List
  - EU Consolidated Sanctions List
  - UK HM Treasury Financial Sanctions List
  - Canadian Consolidated Autonomous Sanctions List
- The Software may not be used for prohibited end-uses: weapons of mass destruction proliferation, military applications in embargoed countries, or surveillance of civilian populations in violation of international human rights standards.

### User representations

By accepting the EULA (Step 1 of the Setup Wizard), users represent and warrant that they:
- Are not located in, or a national/resident of, any sanctioned country.
- Are not listed on any restricted party list.
- Will not export or transfer the Software in violation of applicable export control laws.
- Will notify CrowByte immediately if any of the above representations cease to be accurate.

---

## Indemnification and User Liability

The indemnification framework is defined in both the EULA (Section 11) and the AUP (Section 5). This is one of the most critical aspects of the legal framework for users.

### User indemnification obligation

Users agree to indemnify, defend, and hold harmless HLSITech and all related parties (officers, directors, employees, agents, affiliates) from and against all losses, damages, liabilities, claims, costs, and expenses (including attorneys' fees) arising from:

- Use or misuse of the Software.
- Breach of the EULA, AUP, Privacy Policy, or any applicable law.
- Third-party claims that the user's activities infringed rights (IP, privacy, computer crime laws).
- Failure to obtain proper authorization before testing.
- Damage to target or third-party systems.
- Unauthorized access facilitated by use of the Software.
- Any legal action or investigation brought against HLSITech as a result of the user's activities.

### Key provision: unlimited liability for misuse

The AUP (Section 5.2) states explicitly:

> Your indemnification obligations under this section are not subject to any limitation of liability that may be set forth elsewhere in this AUP or the EULA.

This means the standard liability caps ($50 for Community, 12-month fees for paid tiers) do **not** apply to indemnification claims. Users bear full, uncapped financial responsibility for consequences of their actions.

### Survival

Indemnification obligations survive termination or expiration of the EULA, AUP, and all related agreements.

### Company indemnification

HLSITech provides reciprocal IP infringement indemnification: if a third party claims the Software (as provided by HLSITech, used per the EULA) infringes a valid US patent, copyright, or trademark, HLSITech will defend and indemnify the user, subject to standard conditions (prompt notice, sole control of defense, reasonable cooperation).

---

## Dual-Use Software Classification

CrowByte Terminal is explicitly classified as a **dual-use tool** throughout the legal framework. This classification carries specific legal implications.

### What "dual-use" means in context

The Software is designed to identify vulnerabilities, exploit weaknesses, and test security posture. These capabilities, while essential for legitimate security work, can be misused to cause severe harm. The EULA (Section 4.1) lists potential damage from misuse:

- Data loss or corruption.
- System downtime or instability.
- Network disruption.
- Unauthorized data exposure.
- Service degradation.
- Complete system compromise.

### Legal implications

- The Software may be subject to additional legal restrictions in certain jurisdictions beyond standard software licensing.
- Users must independently verify the legality of their use in their jurisdiction.
- The Company does not provide legal advice regarding specific use cases.
- The EULA strongly advises consulting qualified legal counsel before conducting security testing.

### Setup wizard integration

The dual-use warning is prominently displayed in Step 1 (Welcome) of the Setup Wizard. Users must affirmatively accept:
1. The EULA and Privacy Policy (which includes the dual-use warning).
2. The AUP and a confirmation that they will only use CrowByte for authorized security testing.

Both checkboxes must be checked before the wizard allows progression.

---

## Data Protection Compliance

### GDPR (EU/EEA/UK/Switzerland)

The Privacy Policy provides full GDPR compliance documentation:

- **Legal bases for processing:** Contract performance (Art. 6(1)(b)), legitimate interests (Art. 6(1)(f)), consent (Art. 6(1)(a)), and legal obligation (Art. 6(1)(c)).
- **User rights:** Access, rectification, erasure, data portability, restriction of processing, objection, withdrawal of consent, and right to lodge a complaint with a DPA.
- **International transfers:** Conducted under EU Standard Contractual Clauses (SCCs) with supplementary measures (encryption, access controls, pseudonymization).
- **Data Protection Officer:** dpo@crowbyte.io.
- **Breach notification:** Within 72 hours to the relevant supervisory authority.
- **Response timeline:** 30 days for all rights requests.

### CCPA (California)

- **Right to Know:** Users may request disclosure of collected personal information.
- **Right to Delete:** Users may request deletion, subject to exceptions.
- **Right to Opt-Out of Sale:** HLSITech does not sell personal information.
- **Non-Discrimination:** No adverse treatment for exercising CCPA rights.
- **Response timeline:** 45 days.

### Additional data protection references in the AUP

The AUP (Section 9) requires users conducting security testing to comply with all applicable data protection laws regarding any personal data encountered during testing, specifically citing:
- GDPR (EU)
- CCPA/CPRA (California)
- PIPEDA (Canada)
- Data Protection Act 2018 (UK)

Users must practice minimal data access, retain test data only as long as necessary, and notify the System Owner immediately if sensitive personal data is inadvertently accessed.

---

## Licensing Tiers and Restrictions

### Tier comparison

| Aspect | Community | Professional | Team | Enterprise |
|--------|-----------|-------------|------|------------|
| **Price** | Free | $299-499/yr | $799-1,499/yr | Custom |
| **Max Targets** | 3 | Unlimited | Unlimited | Unlimited |
| **Max Endpoints** | 3 | 25 | Unlimited | Unlimited |
| **AI Chat** | Yes | Yes | Yes | Yes |
| **Core Scanning** | Yes | Yes | Yes | Yes |
| **CVE Database** | Yes | Yes | Yes | Yes |
| **VPS Agents** | No | Yes | Yes | Yes |
| **Fleet Management** | No | Yes | Yes | Yes |
| **Remote Desktop** | No | Yes | Yes | Yes |
| **API Access** | No | Yes | Yes | Yes |
| **Custom Agents** | No | Yes | Yes | Yes |
| **Export Reports** | No | Yes | Yes | Yes |
| **Team Collaboration** | No | No | Yes | Yes |
| **Priority Support** | No | No | Yes | Yes |
| **SSO/SAML** | No | No | No | Yes |
| **Custom SLA** | No | No | No | Yes |
| **On-Prem Deployment** | No | No | No | Yes |
| **Dedicated Support** | No | No | No | Yes |
| **Warranty** | None (AS-IS) | 30-day limited | 30-day limited | 30-day limited |
| **Liability Cap** | $50 | 12-mo fees | 12-mo fees | 12-mo fees |
| **Telemetry Opt-Out** | Limited | Yes | Yes | Yes |
| **Support** | None guaranteed | Standard | Priority | Dedicated |

### Managed service restrictions

Using CrowByte Terminal to provide managed security services, pen-testing-as-a-service, or security-as-a-service to third parties requires a separate Managed Service Provider (MSP) addendum. This applies regardless of tier.

### Competitive benchmarking

Using the Software or disclosing performance/functional test results for developing or marketing competing products requires prior written consent from HLSITech.

---

## Contact Information

| Purpose | Contact |
|---------|---------|
| General Legal | legal@crowbyte.io |
| Privacy Inquiries | privacy@crowbyte.io |
| Data Protection Officer | dpo@crowbyte.io |
| Security Vulnerabilities | security@crowbyte.io |
| Abuse Reports | abuse@crowbyte.io |
| Company | HLSITech (d/b/a CrowByte) |
| Website | https://crowbyte.io |

---

*This document is a summary and reference guide. It does not replace or supersede the full legal documents located in `/legal/`. In the event of any discrepancy between this guide and the source legal documents, the source documents control.*

*CrowByte Terminal v2.0.0 -- HLSITech. All rights reserved.*
