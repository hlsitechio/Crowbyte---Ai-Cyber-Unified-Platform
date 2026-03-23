# CrowByte Terminal -- Onboarding and Setup Guide

**Applies to:** CrowByte Terminal v2.0.0
**Source files:**
- `apps/desktop/src/pages/SetupWizard.tsx`
- `apps/desktop/src/services/setupService.ts`

---

## Table of Contents

1. [Overview](#overview)
2. [When the Setup Wizard Runs](#when-the-setup-wizard-runs)
3. [Step 1: Welcome](#step-1-welcome)
4. [Step 2: License Activation](#step-2-license-activation)
5. [Step 3: Database Connection](#step-3-database-connection)
6. [Step 4: VPS Agent Swarm](#step-4-vps-agent-swarm)
7. [Step 5: Workspace Configuration](#step-5-workspace-configuration)
8. [Step 6: Launch](#step-6-launch)
9. [Post-Setup Configuration](#post-setup-configuration)
10. [Configuration Storage and Persistence](#configuration-storage-and-persistence)
11. [SetupConfig Interface Reference](#setupconfig-interface-reference)
12. [Feature Matrix by Tier](#feature-matrix-by-tier)
13. [License Key Format](#license-key-format)
14. [Setup Versioning](#setup-versioning)
15. [Resetting Setup](#resetting-setup)
16. [Troubleshooting](#troubleshooting)

---

## Overview

The CrowByte Terminal Setup Wizard is a multi-step onboarding flow that runs on first launch. It collects the configuration required to operate the application: legal acceptance, license activation, database connection, optional VPS configuration, and workspace naming.

The wizard is implemented as a full-screen overlay rendered by `App.tsx`. When setup has not been completed (or when the setup version has been bumped), the wizard is displayed instead of the main application. Once the user completes all steps and clicks "Launch CrowByte," the wizard sets `setupComplete: true` in the configuration, and the main application renders.

The wizard consists of 6 steps:

| Step | ID | Label | Icon | Purpose |
|------|----|-------|------|---------|
| 1 | `welcome` | Welcome | Shield | EULA and AUP acceptance |
| 2 | `license` | License | Key | License key activation or Community tier selection |
| 3 | `database` | Database | Database | Supabase connection (hosted or self-hosted) |
| 4 | `vps` | VPS Setup | Server | Optional OpenClaw agent swarm connection |
| 5 | `workspace` | Workspace | Building2 | Workspace name and admin email |
| 6 | `ready` | Launch | Rocket | Configuration review and launch |

---

## When the Setup Wizard Runs

The application entry point (`App.tsx`) checks setup status on load:

```typescript
const [setupComplete, setSetupComplete] = useState(setupService.isSetupComplete());
```

`isSetupComplete()` returns `true` only when both conditions are met:
- `config.setupComplete === true`
- `config.setupVersion === CURRENT_SETUP_VERSION` (currently `1`)

If setup is incomplete, `App.tsx` renders the `SetupWizard` component instead of the router and main layout. The wizard receives an `onComplete` callback that sets the React state to show the main application.

This means the wizard will re-trigger if:
- The application is launched for the first time on a machine.
- `localStorage` is cleared.
- The `CURRENT_SETUP_VERSION` constant is bumped in `setupService.ts` (breaking config change).

---

## Step 1: Welcome

**Component:** `WelcomeStep`

This step displays the CrowByte Terminal branding and requires the user to accept two legal agreements before proceeding.

### What is displayed

- CrowByte Terminal logo with Shield icon (emerald-to-cyan gradient).
- Application version: **CrowByte Terminal v2.0.0**.
- Publisher: **HLSITech -- Proprietary License**.
- A "First Run" badge.
- Expandable EULA preview showing the Dual-Use Software Warning.

### EULA preview contents

The inline EULA preview includes:

- A **DUAL-USE SOFTWARE WARNING** header (yellow text).
- A statement that CrowByte Terminal contains offensive security tools that can damage target systems.
- A requirement that users obtain explicit, written authorization from system owners before testing.
- A bullet list of acknowledgments the user makes by accepting:
  - Only authorized security testing.
  - Sole responsibility for legal compliance.
  - Full liability for damage caused.
  - No unauthorized access, surveillance, or malware development.
  - Subject to U.S. export controls (EAR/ECCN 5D002).
- A link to the full legal documents at `crowbyte.io/legal`.

### Required checkboxes

Both checkboxes must be checked before the "Accept & Continue" button becomes active:

1. **EULA + Privacy Policy:** "I have read and accept the End User License Agreement and Privacy Policy"
2. **Acceptable Use Policy:** "I accept the Acceptable Use Policy and confirm I will only use CrowByte for authorized security testing"

### Service call

When the user clicks "Accept & Continue," the wizard calls:

```typescript
setupService.acceptEula(EULA_VERSION); // EULA_VERSION = '1.0.0'
```

This records `eulaAcceptedAt` (ISO timestamp) and `eulaVersion` in the configuration.

---

## Step 2: License Activation

**Component:** `LicenseStep`

This step presents the four licensing tiers and accepts a license key or a free Community tier selection.

### Tier cards

The wizard displays a 2x2 grid of tier cards:

| Tier | Price | Icon | Included Features |
|------|-------|------|-------------------|
| **Community** | Free | Terminal | 3 targets, 3 endpoints, AI chat, Core scanning tools, CVE database |
| **Professional** | $299-499/yr | Zap | Unlimited targets, 25 endpoints, VPS agents, Fleet management, Remote desktop, API access, Export reports |
| **Team** | $799-1,499/yr | Users | Everything in Pro, Unlimited endpoints, Team collaboration, Custom agents, Priority support |
| **Enterprise** | Custom | Crown | Everything in Team, SSO/SAML, SLA, On-prem option, Dedicated support |

### License key input

- Input field with show/hide toggle (password masking by default).
- Placeholder text: `CB-PRO-XXXX-XXXX-XXXX-XXXX`.
- "Activate" button sends the key to `setupService.activateLicense()`.
- Success or error result is displayed inline with a colored indicator.

### Key validation

License keys are validated against the regex pattern:

```
/^CB-(PRO|TEAM|ENT)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
```

The tier prefix determines the license tier:

| Prefix | Tier |
|--------|------|
| `CB-PRO-` | Professional |
| `CB-TEAM-` | Team |
| `CB-ENT-` | Enterprise |

Keys are uppercased before validation. An invalid format returns an error message: "Invalid license key format. Expected: CB-PRO-XXXX-XXXX-XXXX-XXXX".

**Note:** License validation is currently performed locally (format check only). A `TODO` in the source marks the planned integration with Keygen.sh for server-side validation. When activated, the key will be sent to the Keygen.sh API along with the machine fingerprint for hardware-bound license enforcement.

Upon successful activation, `licenseValidUntil` is set to 365 days from the activation date.

### Community tier (free)

Clicking "Start with Community (free)" calls `setupService.activateLicense('community')`, which:
- Sets `licenseKey` to an empty string.
- Sets `licenseTier` to `'community'`.
- Applies Community feature limits.

### Navigation

The "Continue" button is disabled until a license has been successfully activated (either a valid key or Community selection).

---

## Step 3: Database Connection

**Component:** `DatabaseStep`

CrowByte uses Supabase (PostgreSQL) as its backend for authentication, data persistence, and real-time sync. This step configures the Supabase connection.

### Two options

The wizard presents two cards in a side-by-side layout:

#### CrowByte Hosted (Recommended)

- Icon: Sparkles (emerald).
- Description: "We manage everything. Zero config."
- Badge: "Recommended" (emerald).
- Selecting this sets:
  - `supabaseUrl` = `https://hosted.crowbyte.io`
  - `supabaseAnonKey` = `managed`
  - Connection status = success (no network test needed).

#### Self-Hosted

- Icon: Database (blue).
- Description: "Your own Supabase instance."
- Badge: "Enterprise" (blue).
- Selecting this reveals two input fields:
  - **Supabase Project URL** -- placeholder: `https://your-project.supabase.co`
  - **Anon (Public) Key** -- placeholder: `eyJhbGciOiJIUzI1NiIs...`
- A "Test Connection" button triggers validation.

### Connection test

For self-hosted connections, `setupService.configureSupabase(url, anonKey)` sends a GET request to `{url}/rest/v1/` with the anon key as both `apikey` and `Authorization: Bearer` headers. The connection is considered successful if the response status is `200` or `404` (a 404 from the REST endpoint still confirms Supabase is reachable).

On success, the service extracts the project reference from the URL pattern `https://{project-ref}.supabase.co` and stores it as `supabaseProjectRef`.

### Supabase tables

The database connection is used across the application for the following tables:

- `cves` -- CVE tracking (severity, CVSS, description, products, CWE, refs, exploit status)
- `knowledge_base` -- Research entries (title, content, category, priority, tags)
- `bookmarks` -- Saved URLs with categories and tags
- `bookmark_categories` -- Custom bookmark categories
- `custom_agents` -- Agent Builder configurations
- `red_team_ops` -- Red team operations and findings
- `user_settings` -- Preferences and workspace configuration
- `profiles` -- User profiles (auth-linked)
- `endpoints` -- Fleet device registry
- `analytics` -- Tool usage statistics

### Navigation

The "Continue" button is disabled until the connection status is `'success'` (either hosted selection or a passed connection test).

---

## Step 4: VPS Agent Swarm

**Component:** `VpsStep`

This step configures the optional connection to a remote VPS running the OpenClaw AI agent swarm. VPS agents enable remote scanning, AI-powered reconnaissance, and distributed task execution.

### Tier gate

If the user selected the Community tier in Step 2, a yellow warning banner is displayed:

> **Professional+ Required**
> VPS agents are available on Professional, Team, and Enterprise plans.

All input fields are disabled for Community tier users. Professional, Team, and Enterprise users can configure the VPS.

### Configuration fields

| Field | Placeholder | Description |
|-------|-------------|-------------|
| Hostname | `vps.example.com` | DNS hostname of the VPS |
| IP Address | `10.0.0.1` | IPv4 address of the VPS |
| Gateway Port | `18789` (default) | Port number for the OpenClaw gateway |

### Connection test

Clicking "Test VPS Connection" calls `setupService.configureVps(host, ip, port)`, which:

1. Constructs the gateway URL: `https://{host_or_ip}:{port}`
2. Sends a GET request to `{gateway_url}/health` with a 10-second timeout.
3. Regardless of whether the health check succeeds, the VPS configuration is saved (host, IP, port, `vpsEnabled: true`).
4. If the gateway responds successfully: status = `success`, message = "VPS gateway reachable".
5. If the gateway is unreachable: status = `warning`, message = "Config saved but VPS unreachable" (the configuration is still persisted).

### Skip option

Users can click "Skip for now" to bypass VPS configuration entirely. This calls `setupService.configureVps('', '', 0)`, which sets `vpsEnabled: false` and proceeds to the next step.

### OpenClaw agent swarm

When configured, the VPS connection enables access to 9 AI agents across 7 models:

- **Agents:** commander, recon, hunter, intel, analyst, sentinel, gpt, obsidian, main
- **Capabilities:** Distributed scanning, AI-assisted reconnaissance, remote desktop, fleet management

---

## Step 5: Workspace Configuration

**Component:** `WorkspaceStep`

This step collects the workspace identity.

### Fields

| Field | Required | Placeholder | Description |
|-------|----------|-------------|-------------|
| Workspace Name | Yes | "ACME Red Team" | Displayed in the sidebar and title bar |
| Admin Email | No | "admin@example.com" | For license management and support |

### Service call

On continue, the wizard calls:

```typescript
setupService.setWorkspace(workspaceName, adminEmail);
```

This stores both values in the configuration. The workspace name field is auto-focused on step entry.

### Validation

The "Continue" button is disabled if the workspace name is empty. Admin email is optional.

---

## Step 6: Launch

**Component:** `ReadyStep`

This is the final step. It presents a summary of all configuration choices and a launch button.

### Configuration summary

A summary card displays:

| Field | Value |
|-------|-------|
| License | Tier name (color-coded: Community=zinc, Professional=blue, Team=purple, Enterprise=amber) |
| Database | "Connected" (self-hosted) or "Hosted" (CrowByte hosted) |
| VPS | Hostname or IP if configured, "Not configured" otherwise |
| Workspace | Workspace name |

### Launch

Clicking "Launch CrowByte" calls:

```typescript
setupService.completeSetup();
```

This sets:
- `setupComplete = true`
- `completedAt` = current ISO timestamp

The wizard then invokes `onComplete()`, which updates the React state in `App.tsx` and causes the main application (router, sidebar, dashboard) to render.

### Post-launch note

The step footer displays: "You can change these settings anytime in Settings -> Configuration"

---

## Post-Setup Configuration

After the setup wizard completes:

- The full application renders with the main sidebar and Dashboard.
- **Supabase Auth login** is required after setup for user authentication (the setup wizard configures the connection; authentication is a separate step handled by the auth context).
- All configuration values can be modified later through the **Settings** page under the Configuration section.

---

## Configuration Storage and Persistence

### Storage key

All setup configuration is stored in the browser's `localStorage` under the key:

```
crowbyte_setup_config
```

### Persistence format

The configuration is serialized as a JSON string. The `SetupService` class loads the configuration from `localStorage` on construction and writes it back after every mutation.

### Machine ID generation

On first run, a machine fingerprint is generated from the following attributes:
- User agent string
- Browser language
- Screen dimensions and color depth (`{width}x{height}x{colorDepth}`)
- Timezone (from `Intl.DateTimeFormat`)
- Hardware concurrency (logical CPU count)

These are concatenated and hashed using a simple numeric hash function. The resulting ID follows the format: `cb-{hash_base36}-{timestamp_base36}`.

**Note:** The source code marks this as a placeholder. Production should use `crypto.subtle.digest` for a proper SHA-256 hash.

### Export and import

The `SetupService` provides methods for configuration backup:

- `exportConfig()` -- Returns the full configuration as a formatted JSON string.
- `importConfig(json)` -- Parses a JSON string and replaces the current configuration. Validates that `setupVersion` and `machineId` exist before accepting.

---

## SetupConfig Interface Reference

The complete `SetupConfig` interface stored in `localStorage`:

```typescript
interface SetupConfig {
  // Meta
  setupComplete: boolean;          // Whether setup wizard has been completed
  setupVersion: number;            // Config version (bump to re-trigger setup)
  completedAt: string | null;      // ISO timestamp of completion
  eulaAcceptedAt: string | null;   // ISO timestamp of EULA acceptance
  eulaVersion: string | null;      // Version of EULA that was accepted

  // License
  licenseKey: string;              // Full license key (uppercased) or empty for Community
  licenseTier: 'community' | 'professional' | 'team' | 'enterprise';
  licenseValidUntil: string | null; // ISO date when license expires
  machineId: string;               // Device fingerprint (cb-{hash}-{timestamp})

  // Infrastructure
  supabaseUrl: string;             // Supabase project URL
  supabaseAnonKey: string;         // Supabase anon (public) key
  supabaseProjectRef: string;      // Extracted from URL pattern

  // VPS (optional)
  vpsEnabled: boolean;             // Whether VPS is configured
  vpsHost: string;                 // VPS hostname
  vpsIp: string;                   // VPS IP address
  vpsGatewayPort: number;          // Gateway port (default: 18789)
  vpsSshUser: string;              // SSH user (default: 'root')

  // Workspace
  workspaceName: string;           // Display name for the workspace
  adminEmail: string;              // Admin contact email

  // Feature flags per tier
  features: {
    maxTargets: number;            // -1 = unlimited
    maxEndpoints: number;          // -1 = unlimited
    aiChat: boolean;
    vpsAgents: boolean;
    fleetManagement: boolean;
    remoteDesktop: boolean;
    apiAccess: boolean;
    customAgents: boolean;
    teamCollaboration: boolean;
    exportReports: boolean;
    prioritySupport: boolean;
  };
}
```

---

## Feature Matrix by Tier

The following table shows the exact feature flags set by `TIER_FEATURES` in `setupService.ts`:

| Feature | Community | Professional | Team | Enterprise |
|---------|-----------|-------------|------|------------|
| Max Targets | 3 | Unlimited | Unlimited | Unlimited |
| Max Endpoints | 3 | 25 | Unlimited | Unlimited |
| AI Chat | Yes | Yes | Yes | Yes |
| VPS Agents | No | Yes | Yes | Yes |
| Fleet Management | No | Yes | Yes | Yes |
| Remote Desktop | No | Yes | Yes | Yes |
| API Access | No | Yes | Yes | Yes |
| Custom Agents | No | Yes | Yes | Yes |
| Team Collaboration | No | No | Yes | Yes |
| Export Reports | No | Yes | Yes | Yes |
| Priority Support | No | No | Yes | Yes |

### Feature checking

The `SetupService` exposes a `hasFeature(feature)` method that returns a boolean for any feature key. For numeric features (`maxTargets`, `maxEndpoints`), it returns `true` if the value is non-zero (i.e., any limit or unlimited).

---

## License Key Format

License keys follow the pattern:

```
CB-{TIER}-XXXX-XXXX-XXXX-XXXX
```

Where:
- `CB` is a fixed prefix identifying CrowByte.
- `{TIER}` is one of `PRO`, `TEAM`, or `ENT`.
- Each `XXXX` segment contains 4 uppercase alphanumeric characters (`[A-Z0-9]`).

### Examples

```
CB-PRO-A1B2-C3D4-E5F6-G7H8    -> Professional tier
CB-TEAM-WXYZ-1234-ABCD-5678    -> Team tier
CB-ENT-0000-0000-0000-0000     -> Enterprise tier
```

Community tier does not use a license key.

### Validation regex

```regex
/^CB-(PRO|TEAM|ENT)-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/
```

Keys are case-insensitive on input (uppercased before validation and storage).

---

## Setup Versioning

The `CURRENT_SETUP_VERSION` constant (currently `1`) enables forced re-onboarding when breaking changes are introduced to the configuration schema.

When `loadConfig()` detects a stored `setupVersion` that does not match `CURRENT_SETUP_VERSION`, it:

1. Creates a fresh default configuration.
2. Preserves the user's `licenseKey` and `licenseTier` from the old configuration.
3. Requires the user to complete setup again with the new schema.

This means license information survives a version bump, but all other settings (database, VPS, workspace) must be reconfigured.

---

## Resetting Setup

The `SetupService` provides a `resetSetup()` method that:

1. Replaces the in-memory configuration with a fresh default.
2. Writes the default configuration to `localStorage`.

This can be invoked programmatically (for example, from a developer console or a Settings page action) to force the setup wizard to appear on the next application load.

```typescript
import { setupService } from '@/services/setupService';
setupService.resetSetup();
// Reload the application to trigger the wizard
```

---

## Troubleshooting

### Setup wizard does not appear

The wizard renders when `setupService.isSetupComplete()` returns `false`. If the wizard is not appearing when expected, check:

1. `localStorage` for the `crowbyte_setup_config` key.
2. Verify `setupComplete` is `false` or `setupVersion` does not match `CURRENT_SETUP_VERSION`.
3. Clear the key manually: `localStorage.removeItem('crowbyte_setup_config')`.

### Supabase connection test fails

- Verify the Project URL follows the format `https://{project-ref}.supabase.co`.
- Verify the Anon Key is the public (anon) key, not the service role key.
- The test sends a GET to `{url}/rest/v1/` -- ensure the Supabase project is active and the REST API is enabled.
- Network issues (firewall, proxy, VPN) can prevent the test request from reaching Supabase.

### VPS connection test shows warning

The VPS health check sends a GET to `https://{host}:{port}/health`. A warning status means:

- The configuration was saved successfully.
- The gateway was not reachable at test time.
- This is non-blocking -- the VPS can be tested again later from Settings.
- Common causes: VPS is powered off, gateway service not running, firewall blocking the port, incorrect hostname/IP.

### License key rejected

- Verify the key matches the format `CB-{TIER}-XXXX-XXXX-XXXX-XXXX`.
- Valid tier prefixes are `PRO`, `TEAM`, and `ENT` only.
- Each segment must be exactly 4 characters, uppercase alphanumeric.
- The key is uppercased automatically -- case does not matter on input.

---

*CrowByte Terminal v2.0.0 -- HLSITech*
