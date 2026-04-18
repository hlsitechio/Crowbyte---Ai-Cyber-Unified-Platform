# CrowByte — Architecture Diagrams

---

## 1. Infrastructure Topology

```mermaid
graph TB
    subgraph CLIENT["CLIENT"]
        U["User Browser / Electron App"]
    end

    subgraph CF["CLOUDFLARE EDGE"]
        CDN["CDN + Cache\nDDOS Protection\nBot Fight Mode\nDNSSEC"]
    end

    subgraph PROD["VPS 1 — PRODUCTION  147.93.44.58"]
        direction TB
        NGINX["nginx\n:80 / :443"]
        API["crowbyte-api\nExpress :3000"]
        TERM["crowbyte-terminal\nWebSocket :18822"]
        MAIL["mailer.mjs\nResend :3002"]
        GATE["download-gate.mjs\n:3001"]
        OAUTH["oauth-proxy.js\n:19858"]
        WEB["/opt/crowbyte/web\nStatic SPA"]
        IPT["iptables\nCROWBYTE-CF chain\nCF IPs only on 80/443"]
        F2B["fail2ban\n4 jails"]
    end

    subgraph OPENCLAW["VPS 2 — OPENCLAW  187.124.85.249"]
        direction TB
        GW["openclaw-gateway\n:18789"]
        PROXY["nvidia-proxy\n:19990"]
        D3["d3bugr Docker\n:3000\n142 security tools"]
        SENT["crowbyte-central\nSentinel :7890"]
        SCHED["30+ scheduled services\ndigest / intel / cve / alerts"]
        NVAPI["NVIDIA Cloud API\nDeepSeek · Qwen · Mistral\nKimi · Devstral · GLM5"]
    end

    subgraph WIN["VPS 3 — WINDOWS BUILD  147.93.180.110"]
        VSRC["Source Code\nC:\\crowbyte\\apps\\desktop"]
        EBUILDER["electron-builder\nNSIS + MSI"]
        REL["release/\n*.exe *.msi"]
    end

    subgraph SUPABASE["SUPABASE CLOUD"]
        DB["PostgreSQL\n20+ tables"]
        AUTH["Supabase Auth\nEmail + GitHub OAuth"]
        EDGE["Edge Functions\npassword-reset\ncontact-form\npaypal"]
    end

    U -->|"HTTPS"| CF
    CF -->|"Proxied"| NGINX
    NGINX --> WEB
    NGINX -->|"/api/*"| API
    NGINX -->|"/terminal"| TERM
    IPT -.->|"guards"| NGINX
    F2B -.->|"bans IPs"| IPT

    API --> DB
    API --> MAIL
    U -->|"AI chat\nElectron IPC"| GW
    GW --> PROXY
    PROXY --> NVAPI

    WIN -->|"rsync builds"| PROD
    API --> SUPABASE
    AUTH --> DB

    style PROD fill:#1a1a2e,stroke:#a855f7,color:#e2e8f0
    style OPENCLAW fill:#0f2027,stroke:#06b6d4,color:#e2e8f0
    style WIN fill:#1a0a00,stroke:#f97316,color:#e2e8f0
    style SUPABASE fill:#003300,stroke:#22c55e,color:#e2e8f0
    style CF fill:#2d1b00,stroke:#f59e0b,color:#e2e8f0
    style CLIENT fill:#1a1a1a,stroke:#6b7280,color:#e2e8f0
```

---

## 2. AI Routing

```mermaid
flowchart TD
    A["User Action"] --> B{Platform?}

    B -->|Electron| C{Feature type?}
    B -->|Web| D{Feature type?}

    C -->|"Chat page"| E["Claude Provider\nclaude -p CLI\nfull MCP access"]
    C -->|"Inline AI\nper-row action"| F["Section Agent\nsection-agent.ts"]
    C -->|"Any other AI call"| G["OpenClaw\nopenclaw.ts"]
    C -->|"Privacy mode\n(user has Venice key)"| H["VeniceAI\nveniceai-electron.ts"]
    C -->|"SOC / Sentinel"| I["Sentinel AI\nsentinel-ai.ts"]

    D -->|"Chat page"| J["Web AI Chat\nweb-ai-chat.ts"]
    D -->|"Inline AI"| F
    D -->|"Any other AI call"| G

    F --> G
    J --> G
    I --> K["Sentinel Central\nVPS port 7890"]
    K --> L["DeepSeek V3\nNVIDIA Cloud"]

    G --> M["nvidia-proxy\n:19990"]
    M --> N["NVIDIA Cloud API"]

    E --> O["Anthropic API\nclaude-sonnet-4-6"]

    N --> P["DeepSeek V3.2 — default\nQwen3 Coder 480B — code\nQwen3.5 397B — reasoning\nMistral Large 675B — balanced\nKimi K2 — long context\nDevstral 123B — security"]

    style E fill:#1e3a5f,stroke:#60a5fa,color:#e2e8f0
    style G fill:#1a2e1a,stroke:#4ade80,color:#e2e8f0
    style O fill:#2d1b4e,stroke:#a855f7,color:#e2e8f0
    style P fill:#0f2027,stroke:#06b6d4,color:#e2e8f0
```

---

## 3. Deploy Pipeline

```mermaid
flowchart LR
    subgraph DEV["DEV  Kali Linux"]
        SRC["Source Code\n/mnt/bounty/Claude/crowbyte"]
        CMD["npm run deploy:web"]
    end

    subgraph BUILD["BUILD STEPS"]
        direction TB
        S1["1. TypeScript check\ntsc --noEmit"]
        S2["2. Vite build\nVITE_BUILD_TARGET=web\ndist/web/"]
        S3["3. Verify\nindex.html + bundles exist"]
        S4["4. rsync\n→ /opt/crowbyte/staging_incoming/"]
        S5["5. Atomic mv\nstaging → /opt/crowbyte/web/"]
        S6["6. Health check\ncurl crowbyte.io → 200"]
        S1 --> S2 --> S3 --> S4 --> S5 --> S6
    end

    subgraph ROLLBACK["ROLLBACK  auto"]
        R["mv web → web_broken\nmv web_prev_TIMESTAMP → web"]
    end

    subgraph CF["CLOUDFLARE"]
        PURGE["Cache Purge\nAPI call"]
    end

    subgraph PROD["PROD VPS"]
        LIVE["/opt/crowbyte/web/\nLIVE"]
        PREV["/opt/crowbyte/web_prev_*/\n3 kept"]
    end

    SRC --> CMD --> BUILD
    S6 -->|"fail"| ROLLBACK
    S6 -->|"pass"| PURGE
    S5 --> LIVE
    LIVE -.->|"rotated"| PREV

    style DEV fill:#1a1a2e,stroke:#6b7280,color:#e2e8f0
    style BUILD fill:#0a1628,stroke:#3b82f6,color:#e2e8f0
    style ROLLBACK fill:#2d0a0a,stroke:#ef4444,color:#e2e8f0
    style CF fill:#2d1b00,stroke:#f59e0b,color:#e2e8f0
    style PROD fill:#0a2818,stroke:#22c55e,color:#e2e8f0
```

---

## 4. Security Layers

```mermaid
flowchart TB
    ATK["Attacker / Bot / Scanner"]

    ATK --> L1

    subgraph L1["LAYER 1 — Cloudflare Edge"]
        CF1["DDoS protection"]
        CF2["Bot Fight Mode"]
        CF3["IP reputation"]
        CF4["Cache (assets/fonts 30d)"]
    end

    L1 --> L2

    subgraph L2["LAYER 2 — iptables  CROWBYTE-CF chain"]
        IP1["Only Cloudflare IPs\nallowed on :80/:443"]
        IP2["Tailscale 100.0.0.0/8\nalways allowed"]
        IP3["Everything else → DROP"]
    end

    L2 --> L3

    subgraph L3["LAYER 3 — nginx"]
        N1["Security headers\nHSTS · CSP · X-Frame"]
        N2["Canary endpoints\n/.env /.git /admin *.php\n→ 200 fake content + log"]
        N3["Rate limiting\n20 req/min /api/errors"]
    end

    L3 --> L4

    subgraph L4["LAYER 4 — fail2ban"]
        F1["crowbyte-canary\n1 hit → 30d ban"]
        F2["crowbyte-bots\n2 hits/1h → 30d ban"]
        F3["crowbyte-auth\n10 fails/60s → 7d ban"]
        F4["nginx-4xx\n20 errors/60s → 24h ban"]
    end

    L4 --> L5

    subgraph L5["LAYER 5 — App"]
        A1["Auth (Supabase JWT)"]
        A2["RLS on all tables"]
        A3["Service key Electron only"]
    end

    style L1 fill:#2d1b00,stroke:#f59e0b,color:#e2e8f0
    style L2 fill:#2d0a0a,stroke:#ef4444,color:#e2e8f0
    style L3 fill:#1a2e1a,stroke:#22c55e,color:#e2e8f0
    style L4 fill:#1a1a2e,stroke:#a855f7,color:#e2e8f0
    style L5 fill:#0f2027,stroke:#06b6d4,color:#e2e8f0
```

---

## 5. Auth Flow

```mermaid
sequenceDiagram
    participant U as User
    participant APP as CrowByte App
    participant SB as Supabase Auth
    participant GH as GitHub

    Note over U,GH: Email / Password Login
    U->>APP: Enter credentials
    APP->>SB: signInWithPassword()
    SB-->>APP: Session + JWT
    APP->>APP: window.location.hash = "#/dashboard"

    Note over U,GH: GitHub OAuth Login
    U->>APP: Click "Sign in with GitHub"
    APP->>SB: signInWithOAuth({ redirectTo: origin + "/" })
    SB->>GH: Redirect to GitHub
    GH-->>U: Authorize page
    U->>GH: Approve
    GH-->>APP: Redirect to origin/?code=xxxx
    APP->>APP: useEffect detects ?code=
    APP->>SB: exchangeCodeForSession(code)
    SB-->>APP: Session + JWT
    APP->>APP: window.location.hash = "#/dashboard"

    Note over U,GH: Protected Route Access
    U->>APP: Navigate to /#/dashboard
    APP->>APP: ProtectedRoute checks session
    APP->>SB: getSession()
    SB-->>APP: Valid session
    APP-->>U: Render Dashboard
```

---

## 6. Data Flow — Electron vs Web

```mermaid
flowchart LR
    subgraph ELECTRON["ELECTRON BUILD"]
        direction TB
        E_MAIN["electron/main.cjs\nNode.js process"]
        E_PRE["preload.js\ncontextBridge"]
        E_RENDER["Renderer\nReact app\nIS_ELECTRON=true"]

        E_RENDER <-->|"IPC"| E_PRE
        E_PRE <-->|"IPC"| E_MAIN
        E_MAIN -->|"spawn"| CLAUDE["claude -p\nFull MCP access"]
        E_MAIN -->|"node-pty"| PTY["Shell / tmux"]
        E_MAIN -->|"node-pty"| TERM2["Terminal"]
    end

    subgraph WEB["WEB BUILD"]
        direction TB
        W_RENDER["Browser\nReact app\nIS_WEB=true"]
        W_RENDER -->|"HTTPS"| API2["Express API\n:3000"]
        W_RENDER -->|"HTTPS"| SB2["Supabase"]
        W_RENDER -->|"WS"| WSTERM["Terminal WS\n:18822"]
    end

    subgraph SHARED["SHARED SERVICES"]
        direction TB
        OC["OpenClaw\nopenclaw.ts"]
        SUPA["Supabase Client\nsupabase.ts"]
        SECT["Section Agent\nsection-agent.ts"]
    end

    E_RENDER --> SHARED
    W_RENDER --> SHARED
    OC -->|"HTTP"| GW2["OpenClaw Gateway\n:18789"]
    SUPA -->|"HTTPS"| DB2["Supabase DB"]

    style ELECTRON fill:#1a1a2e,stroke:#a855f7,color:#e2e8f0
    style WEB fill:#0f2027,stroke:#06b6d4,color:#e2e8f0
    style SHARED fill:#1a2e1a,stroke:#4ade80,color:#e2e8f0
```

---

## 7. Database Schema (Key Tables)

```mermaid
erDiagram
    profiles {
        uuid id PK
        text username
        text avatar_url
        text role
        timestamp created_at
    }

    cves {
        text id PK
        float cvss_score
        text severity
        text description
        jsonb affected_products
        date published_date
    }

    findings {
        uuid id PK
        uuid user_id FK
        text title
        text severity
        float cvss
        text status
        text evidence
        timestamp created_at
    }

    red_team_ops {
        uuid id PK
        uuid user_id FK
        text name
        text phase
        text status
        jsonb scope
        timestamp created_at
    }

    threat_iocs {
        uuid id PK
        text value
        text type
        text feed_name
        text threat_type
        timestamp first_seen
        timestamp last_seen
    }

    endpoints {
        uuid id PK
        uuid user_id FK
        text hostname
        text ip
        text os
        text status
        timestamp last_seen
    }

    missions {
        uuid id PK
        uuid user_id FK
        text title
        text phase
        jsonb objectives
        text status
    }

    profiles ||--o{ findings : "owns"
    profiles ||--o{ red_team_ops : "owns"
    profiles ||--o{ endpoints : "owns"
    profiles ||--o{ missions : "owns"
```

---

## 8. Electron Window Lifecycle

```mermaid
stateDiagram-v2
    [*] --> AppLaunch

    AppLaunch --> CheckOnboarding : app.whenReady()

    CheckOnboarding --> OnboardingWindow : onboardingComplete = false
    CheckOnboarding --> MainWindow : onboardingComplete = true

    OnboardingWindow --> Hidden : show:false + BrowserWindow created
    Hidden --> Visible : ready-to-show event fires
    Visible --> OnboardingComplete : user completes / skips

    OnboardingComplete --> OnboardingWindow_Closed : mainWindow.close()
    OnboardingWindow_Closed --> MainWindow : createWindow() called

    MainWindow --> MainHidden : show:false + BrowserWindow created
    MainHidden --> MainVisible : ready-to-show event fires
    MainVisible --> Running : React hydrated, UI ready

    Running --> Minimized : user minimizes
    Minimized --> Running : user restores
    Running --> [*] : window.close() / app.quit()

    note right of MainHidden : Prevents white flash\nbefore React loads
```
