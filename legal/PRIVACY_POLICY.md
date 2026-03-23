# CrowByte Terminal — Privacy Policy

**Effective Date:** [DATE]
**Last Updated:** [DATE]

---

## 1. Introduction

This Privacy Policy describes how **HLSITech** (doing business as **CrowByte**, "we," "us," or "our") collects, uses, shares, and protects information when you use **CrowByte Terminal** (the "Application"), a commercial desktop application for offensive security operations.

CrowByte Terminal is an Electron-based desktop application that runs locally on your machine and connects to cloud services for authentication, data persistence, AI-powered features, and security intelligence. This policy applies to all versions of the Application and any associated services accessible through it.

By installing or using CrowByte Terminal, you acknowledge that you have read and understood this Privacy Policy. If you do not agree with our practices, please do not use the Application.

**Company:** HLSITech (d/b/a CrowByte)
**Website:** [https://crowbyte.io](https://crowbyte.io)
**Contact:** [privacy@crowbyte.io](mailto:privacy@crowbyte.io)
**Data Protection Officer:** [dpo@crowbyte.io](mailto:dpo@crowbyte.io)

---

## 2. Information We Collect

We collect information across six categories. Each category is described below with specific data points.

### 2.1 Account & Identity Data

Information you provide when creating and managing your account:

- Full name
- Email address
- Username
- Profile picture
- Workspace name
- Authentication tokens (managed by Supabase Auth)
- Device fingerprints (SHA-256 hashed — we never store raw fingerprints)

### 2.2 Telemetry & Usage Data

Automatically collected data about how you interact with the Application:

- Feature usage events (which pages and tools you use, and how often)
- API response times and error rates
- Service call counts
- User agent string
- Screen resolution
- Timezone

### 2.3 Security Operations Data

Data generated through your use of CrowByte's security tooling:

- CVE searches and bookmarked vulnerabilities
- Vulnerability scan results metadata (severity, status, timestamps)
- Target IP addresses and domain information
- Red team operation logs (operation name, status, timestamps, target metadata)
- Knowledge base entries you create or import

> **Important:** The majority of security operations data is stored in your local application storage. Only metadata and data you explicitly save to the cloud is transmitted to Supabase.

### 2.4 AI Interaction Data

Data generated when you use AI-powered features:

- Chat prompts and responses exchanged with Claude (Anthropic) and OpenClaw
- Model selection preferences
- Conversation session metadata (timestamps, token counts)

### 2.5 VPS & Fleet Data

Data related to remote endpoint and agent management:

- Endpoint hostnames and IP addresses
- Agent task delegation records (task description, status, timestamps)
- VNC session metadata (connection times, duration — not screen content)

### 2.6 Technical Data

Data collected for application stability and support:

- Error logs and crash reports
- Electron version and build number
- Operating system name and version
- Performance metrics (memory usage, CPU load, render times)

---

## 3. How We Collect Information

### 3.1 Information You Provide Directly

- **Account creation:** Name, email, username, profile picture, and workspace name when you register.
- **User input:** Security operations data, knowledge base entries, AI chat prompts, target information, and any other content you enter into the Application.
- **Settings and preferences:** Configuration choices, model selections, and display preferences.

### 3.2 Information Collected Automatically

- **Telemetry events:** Feature usage, performance metrics, and error data collected by the Application during normal operation.
- **Device information:** Operating system, Electron version, screen resolution, timezone, and user agent string detected at launch.
- **Device fingerprint:** A SHA-256 hash generated from device attributes for session integrity. The raw attributes are never stored or transmitted.

### 3.3 Information From Third Parties

We do not currently purchase or receive personal information from third-party data brokers or external sources. All data originates from your direct use of the Application.

---

## 4. How We Use Information

We use collected information for the following purposes:

| Purpose | Data Categories Used |
|---|---|
| **Provide and operate the service** — Authenticate you, sync your data, deliver AI responses, execute security operations | Account, Security Ops, AI Interaction, VPS/Fleet |
| **Improve the product** — Identify popular features, optimize performance, prioritize development | Telemetry, Technical |
| **Ensure security** — Detect unauthorized access, prevent abuse, enforce rate limits | Account (fingerprints, tokens), Technical |
| **Provide support** — Diagnose issues, respond to bug reports, assist with account recovery | Account, Technical, Telemetry |
| **Analytics** — Understand aggregate usage patterns to guide product decisions | Telemetry (aggregated and anonymized) |
| **Legal compliance** — Meet regulatory obligations, respond to lawful requests | All categories as required |

We do **not** use your security operations data, AI conversations, or target information for any purpose other than delivering the service to you.

---

## 5. Legal Basis for Processing (GDPR)

If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, we process your personal data under the following legal bases:

| Legal Basis | Applies To |
|---|---|
| **Performance of a contract** (Art. 6(1)(b) GDPR) | Account data, security operations data, AI interaction data, and VPS/fleet data necessary to provide the service you signed up for. |
| **Legitimate interests** (Art. 6(1)(f) GDPR) | Telemetry and usage data for product improvement and analytics; technical data for security and stability. Our legitimate interest is maintaining and improving a reliable product. This does not override your fundamental rights. |
| **Consent** (Art. 6(1)(a) GDPR) | Optional telemetry beyond core functionality, if applicable. You may withdraw consent at any time through the Application settings. |
| **Legal obligation** (Art. 6(1)(c) GDPR) | Processing required to comply with applicable laws, regulations, or lawful government requests. |

---

## 6. Information Sharing & Third-Party Processors

### 6.1 We Do Not Sell Your Data

**We do not sell, rent, or trade your personal information to third parties. Period.**

### 6.2 Third-Party Service Processors

We share data with the following service providers, strictly to operate the Application:

| Service | Data Shared | Purpose | Hosting Location |
|---|---|---|---|
| **Supabase** | Account data, security ops metadata, knowledge base entries, bookmarks | Authentication, database storage, real-time sync | AWS (US regions) |
| **Anthropic (Claude API)** | AI chat prompts and conversation context | AI-powered chat and analysis features | United States |
| **NVD / NIST API** | CVE identifiers and search queries | Vulnerability intelligence lookups | United States |
| **Shodan API** | IP addresses and search queries (no user PII) | Network reconnaissance and intelligence | United States |
| **OpenClaw VPS** | Agent task delegations, chat prompts | Self-hosted AI agent orchestration | Brazil ([VPS_IP]) |

Each processor is bound by data processing agreements and is prohibited from using your data for their own purposes.

### 6.3 Legal Requirements

We may disclose your information if required to do so by law, or if we believe in good faith that such action is necessary to:

- Comply with a legal obligation, court order, or governmental request
- Protect and defend the rights or property of HLSITech
- Prevent fraud or address security issues
- Protect the personal safety of users or the public

### 6.4 Business Transfers

If HLSITech is involved in a merger, acquisition, or asset sale, your personal data may be transferred as part of that transaction. We will notify you via in-app notification and/or email before your data becomes subject to a different privacy policy.

---

## 7. Data Retention

| Data Category | Retention Period | Notes |
|---|---|---|
| **Account & Identity** | Duration of your account + 30 days after deletion | 30-day grace period allows for account recovery. After that, data is permanently deleted. |
| **Telemetry & Usage** | 12 months from collection | Automatically purged on a rolling basis. Aggregated, anonymized statistics may be retained indefinitely. |
| **Security Operations Data** | User-controlled | You may delete individual items (CVEs, bookmarks, scan results, knowledge entries) at any time. Data is removed from Supabase within 30 days of deletion. Local data is deleted immediately. |
| **AI Interaction Data** | Not stored server-side beyond the session | Chat history is maintained locally within the Application. Prompts sent to Anthropic are subject to [Anthropic's data retention policy](https://www.anthropic.com/privacy). OpenClaw interactions are processed on our self-hosted VPS. |
| **VPS & Fleet Data** | Duration of your account | Deleted when you remove endpoints or close your account. |
| **Technical Data** | 90 days | Error logs and crash reports are retained for debugging, then purged. |

You may request deletion of your data at any time by contacting [privacy@crowbyte.io](mailto:privacy@crowbyte.io) or using the in-app account management features.

---

## 8. Data Security

We implement the following technical and organizational measures to protect your data:

- **Encryption in transit:** All data transmitted between the Application and cloud services is encrypted using TLS 1.3.
- **Encryption at rest:** Data stored in Supabase is encrypted at rest using AES-256.
- **Row-Level Security (RLS):** Supabase enforces row-level security policies, ensuring users can only access their own data.
- **Hashed identifiers:** Device fingerprints are SHA-256 hashed before storage. Raw device attributes are never persisted.
- **No plaintext credentials:** Authentication tokens are managed by Supabase Auth. API keys are stored in encrypted local storage, never in plaintext configuration files.
- **Access controls:** Internal access to production databases and infrastructure is restricted to authorized personnel using multi-factor authentication.
- **Incident response:** We maintain an incident response plan. In the event of a data breach that affects your rights, we will notify you and the relevant supervisory authority within 72 hours as required by GDPR.

No system is 100% secure. While we take commercially reasonable precautions, we cannot guarantee absolute security. You are responsible for maintaining the security of your device and account credentials.

---

## 9. Your Rights Under GDPR

If you are located in the EEA, UK, or Switzerland, you have the following rights regarding your personal data:

| Right | Description |
|---|---|
| **Access** | Request a copy of the personal data we hold about you. |
| **Rectification** | Request correction of inaccurate or incomplete personal data. |
| **Erasure ("Right to be Forgotten")** | Request deletion of your personal data, subject to legal retention obligations. |
| **Data Portability** | Receive your personal data in a structured, commonly used, machine-readable format and transmit it to another controller. |
| **Restriction of Processing** | Request that we limit how we use your data in certain circumstances. |
| **Objection** | Object to processing based on legitimate interests, including profiling. |
| **Withdraw Consent** | Where processing is based on consent, withdraw that consent at any time without affecting the lawfulness of prior processing. |
| **Lodge a Complaint** | File a complaint with your local Data Protection Authority (DPA) if you believe your rights have been violated. |

To exercise any of these rights, contact us at [dpo@crowbyte.io](mailto:dpo@crowbyte.io). We will respond within 30 days. We may ask you to verify your identity before processing your request.

---

## 10. Your Rights Under CCPA

If you are a California resident, the California Consumer Privacy Act (CCPA) grants you the following rights:

- **Right to Know:** You may request that we disclose what personal information we collect, use, and share about you.
- **Right to Delete:** You may request deletion of personal information we have collected from you, subject to certain exceptions.
- **Right to Opt-Out of Sale:** We do **not** sell your personal information. There is no need to opt out, but we respect this right categorically.
- **Right to Non-Discrimination:** We will not discriminate against you for exercising your CCPA rights. You will not receive different pricing, service quality, or access levels.

To submit a CCPA request, contact us at [privacy@crowbyte.io](mailto:privacy@crowbyte.io). We will verify your identity and respond within 45 days.

---

## 11. Cookies & Tracking Technologies

### Desktop Application Context

CrowByte Terminal is a desktop application built on Electron. It does **not** use browser cookies in the traditional sense.

### What We Use Instead

| Technology | Purpose | User Control |
|---|---|---|
| **Local Storage (Electron)** | Store user preferences, session tokens, cached data, and security operations data locally on your device | Cleared by uninstalling the Application or using in-app settings |
| **Supabase Auth Tokens** | Maintain authenticated sessions between the Application and cloud services | Tokens expire automatically; you can sign out at any time |
| **Analytics Events** | Telemetry events sent to our analytics pipeline to measure feature usage and performance | Can be disabled in Application settings |

We do **not** use third-party advertising trackers, cross-site tracking pixels, or browser fingerprinting scripts.

---

## 12. Children's Privacy

CrowByte Terminal is an offensive security tool designed for adult professionals. It is **not intended for use by anyone under the age of 18**.

We do not knowingly collect personal information from children under 18. If you are a parent or guardian and believe your child has provided us with personal data, please contact us at [privacy@crowbyte.io](mailto:privacy@crowbyte.io). We will promptly delete such information.

This policy is compliant with the Children's Online Privacy Protection Act (COPPA) and equivalent international regulations.

---

## 13. International Data Transfers

Your data may be processed in the following jurisdictions:

| Location | Service | Data Types |
|---|---|---|
| **United States** | Supabase (AWS), Anthropic, NVD/NIST, Shodan | Account data, AI prompts, CVE queries, security ops metadata |
| **Brazil** | OpenClaw VPS | Agent task delegations, AI prompts |

If you are located in the EEA, UK, or Switzerland, these transfers are conducted under appropriate safeguards:

- **EU Standard Contractual Clauses (SCCs):** We use SCCs approved by the European Commission for transfers to processors in countries without an adequacy decision.
- **Data Processing Agreements:** All third-party processors are bound by contractual obligations to protect your data.
- **Supplementary measures:** We apply encryption in transit and at rest, access controls, and pseudonymization where appropriate to ensure an equivalent level of protection.

You may request a copy of the applicable transfer safeguards by contacting [dpo@crowbyte.io](mailto:dpo@crowbyte.io).

---

## 14. Changes to This Policy

We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors.

When we make changes:

- **Material changes:** We will provide at least **30 days' advance notice** via in-app notification before the changes take effect.
- **Non-material changes:** Minor clarifications or formatting updates may be made without advance notice.
- **Version history:** The "Last Updated" date at the top of this policy will always reflect the most recent revision.

Your continued use of CrowByte Terminal after the effective date of a revised policy constitutes your acceptance of the changes. If you do not agree with a revised policy, you should discontinue use of the Application and delete your account.

---

## 15. Data Flow Map

This section provides a clear overview of how data moves through CrowByte Terminal's architecture.

### 15.1 Architecture Overview

```
+---------------------------+
|   CrowByte Terminal       |
|   (Electron Desktop App)  |
|                           |
|  +---------------------+ |        +--------------------+
|  | Local Storage        | |        | Supabase (AWS)     |
|  | - Preferences        | |  TLS   | - Auth & Sessions  |
|  | - Cached CVE data    |<-------->| - User Profiles    |
|  | - Chat history       | |  1.3   | - Bookmarks        |
|  | - Scan results       | |        | - Knowledge Base   |
|  | - Auth tokens        | |        | - CVE Metadata     |
|  | - Red team logs      | |        | - Red Team Ops     |
|  +---------------------+ |        | - Custom Agents    |
|                           |        +--------------------+
|  +---------------------+ |
|  | AI Chat Engine       | |  TLS   +--------------------+
|  | - Claude Provider    |--------->| Anthropic API      |
|  | - OpenClaw Provider  |--+       | (Claude LLM)       |
|  +---------------------+ |  |     +--------------------+
|                           |  |
|  +---------------------+ |  | SSH/TLS
|  | Security Tools       | |  |     +--------------------+
|  | - CVE Lookup        -|--------->| NVD / NIST API     |
|  | - Network Scanner   -|--------->| Shodan API         |
|  | - Fleet Management  -|--+----->| OpenClaw VPS       |
|  +---------------------+ |       | (Self-Hosted, BR)  |
+---------------------------+       +--------------------+
```

### 15.2 What Stays Local vs. What Goes to the Cloud

| Data | Stays Local | Goes to Cloud | Destination |
|---|---|---|---|
| User preferences & settings | Yes | Yes (sync) | Supabase |
| Authentication tokens | Yes (encrypted) | Yes (managed by Supabase Auth) | Supabase |
| Chat history (full conversations) | **Yes** | **No** (only prompts in transit to AI) | Local only |
| AI prompts (in transit) | No (ephemeral) | Yes (during request) | Anthropic / OpenClaw |
| CVE search results | Yes (cached) | Yes (if bookmarked) | Supabase, NVD |
| Vulnerability scan results | **Yes** | **Metadata only** | Supabase |
| Target IPs and domains | **Yes** | Only via explicit API calls | Shodan, OpenClaw |
| Red team operation logs | Yes | Yes (operation metadata) | Supabase |
| Knowledge base entries | Yes | Yes (if cloud sync enabled) | Supabase |
| Fleet endpoint data | Yes | Yes (hostnames, IPs, task records) | Supabase, OpenClaw |
| Crash reports & error logs | Yes | Yes (anonymized) | Supabase |
| Device fingerprint | **Never stored raw** | SHA-256 hash only | Supabase |
| Telemetry events | Buffered locally | Yes (batched upload) | Analytics pipeline |

### 15.3 User-Controlled vs. Automatic Data

**User-Controlled Data** — You create, manage, and delete this data:
- Knowledge base entries
- Bookmarked CVEs
- Red team operation logs
- Saved scan results
- Fleet endpoints and agent configurations
- AI chat conversations (local)

**Automatic Data** — Collected during normal Application operation:
- Telemetry events (can be disabled in Settings)
- Error logs and crash reports
- Device information and fingerprint hash
- API performance metrics

You always have the ability to:
- Export your user-controlled data
- Delete individual items or your entire account
- Disable optional telemetry collection
- Clear local storage through the Application or by uninstalling

---

## 16. Contact Us

If you have questions, concerns, or requests regarding this Privacy Policy or our data practices:

**General Privacy Inquiries:**
Email: [privacy@crowbyte.io](mailto:privacy@crowbyte.io)

**Data Protection Officer:**
Email: [dpo@crowbyte.io](mailto:dpo@crowbyte.io)

**Mailing Address:**
HLSITech (d/b/a CrowByte)
[ADDRESS PLACEHOLDER]

We aim to respond to all inquiries within 30 days.

---

*This Privacy Policy is provided in a human-readable format. For questions about specific legal terms or compliance requirements, please contact our Data Protection Officer.*
