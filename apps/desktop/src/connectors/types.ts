/**
 * CrowByte Connector Framework — Type Definitions
 *
 * Each connector = an MCP-compatible bridge to an external security platform.
 * When a company activates a connector, AI agents auto-bind to its tools.
 */

// ─── Connector Identity ─────────────────────────────────────────────────────

export type ConnectorCategory =
  | 'siem'
  | 'edr'
  | 'identity'
  | 'cloud'
  | 'vuln'
  | 'network'
  | 'mdm'
  | 'ticketing'
  | 'threat-intel'
  | 'infrastructure'
  | 'container'
  | 'cloud-infra';

export type ConnectorStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'degraded';

export type AuthMethod = 'oauth2' | 'api_key' | 'bearer_token' | 'basic' | 'certificate' | 'service_principal';

export interface AuthGuide {
  credentialUrl: string;               // Direct URL to create credentials
  credentialLabel: string;             // e.g. "Azure App Registration Portal"
  setupDocsUrl: string;               // Step-by-step setup guide
  steps: string[];                     // Quick-start steps shown in dialog
  notes?: string[];                    // Gotchas, warnings
  apiBaseUrl?: string;                 // e.g. "https://api.crowdstrike.com"
  regionUrls?: Record<string, string>; // Regional portal variants
  tokenFormat?: string;                // e.g. "Bearer <token>", "ApiToken <token>"
  tokenExpiry?: string;                // e.g. "30 minutes", "6 months", "Never"
  adminRequired?: boolean;             // Needs admin role to create creds?
  videoUrl?: string;                   // Optional tutorial video
}

export interface ConnectorManifest {
  id: string;                          // e.g. "microsoft-sentinel"
  name: string;                        // e.g. "Microsoft Sentinel"
  vendor: string;                      // e.g. "Microsoft"
  category: ConnectorCategory;
  icon: string;                        // Lucide icon name or URL
  description: string;
  authMethods: AuthMethod[];
  requiredScopes?: string[];           // OAuth2 scopes needed
  requiredPermissions?: string[];      // API permissions needed
  website: string;
  docsUrl: string;

  // Credential setup guide — shown in the connect dialog
  authGuide: AuthGuide;

  // What this connector provides
  capabilities: ConnectorCapability[];

  // Which agents auto-activate when this connector is live
  activatesAgents: string[];           // Agent IDs

  // MCP tools this connector exposes
  mcpTools: MCPToolDefinition[];

  // Data streams this connector can ingest
  dataStreams: DataStream[];
}

// ─── Capabilities ────────────────────────────────────────────────────────────

export interface ConnectorCapability {
  id: string;
  name: string;
  description: string;
  type: 'read' | 'write' | 'action' | 'stream';
  requiresPermission: AgentPermissionLevel;
}

// ─── MCP Tool Definitions ────────────────────────────────────────────────────

export interface MCPToolDefinition {
  name: string;                        // e.g. "sentinel_query_kql"
  description: string;
  category: 'investigate' | 'respond' | 'hunt' | 'report' | 'configure';
  permissionLevel: AgentPermissionLevel;
  inputSchema: Record<string, unknown>;
  rateLimit?: { maxPerMinute: number; maxPerHour: number };
  dangerous?: boolean;                 // Requires explicit approval
  reversible?: boolean;                // Can the action be undone
}

export interface DataStream {
  id: string;
  name: string;
  type: 'alerts' | 'events' | 'logs' | 'metrics' | 'incidents';
  format: 'json' | 'cef' | 'syslog' | 'csv';
  realtime: boolean;
  pollingIntervalMs?: number;
}

// ─── Connection Config ───────────────────────────────────────────────────────

export interface ConnectorConfig {
  connectorId: string;
  orgId: string;
  status: ConnectorStatus;
  auth: ConnectorAuth;
  settings: Record<string, unknown>;
  enabledCapabilities: string[];
  lastSyncAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  healthCheckUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConnectorAuth {
  method: AuthMethod;
  // OAuth2
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  scopes?: string[];
  // API UilKeySkeleton
  apiKey?: string;
  apiSecret?: string;
  // Endpoint
  baseUrl?: string;
  region?: string;
}

// ─── Agent System ────────────────────────────────────────────────────────────

export type AgentPermissionLevel =
  | 'observe'      // Read-only: view alerts, logs, dashboards
  | 'triage'       // Can classify, tag, assign, close alerts
  | 'respond'      // Can take response actions (isolate, block, disable)
  | 'contain'      // Full containment (quarantine, wipe, revoke all)
  | 'admin';       // Configure the platform itself

export interface AgentRole {
  id: string;
  name: string;                        // e.g. "Sentinel Hunter"
  description: string;
  domain: ConnectorCategory;
  permissionLevel: AgentPermissionLevel;
  autoActivateOn: string[];            // Connector IDs that activate this agent

  // What the agent is allowed to do
  allowedTools: string[];              // MCP tool names
  blockedTools: string[];              // Explicitly blocked tools

  // Escalation
  escalatesTo?: string;                // Agent role ID to escalate to
  requiresApprovalFor: string[];       // Tool names that need human approval

  // System prompt template
  systemPrompt: string;

  // Runtime config
  model: string;                       // AI model to use
  maxActionsPerIncident: number;
  cooldownMs: number;
  enabled: boolean;
}

export interface AgentPermissionGrant {
  id: string;
  orgId: string;
  agentRoleId: string;
  grantedBy: string;                   // User ID of SOC manager
  permissionLevel: AgentPermissionLevel;
  scope: PermissionScope;
  expiresAt?: string;
  conditions?: PermissionCondition[];
  createdAt: string;
}

export interface PermissionScope {
  connectors: string[];                // Which connectors this grant covers
  assetGroups?: string[];              // Limit to specific asset groups
  severityMin?: number;                // Only act on alerts above this severity
  timeWindow?: { start: string; end: string }; // Active hours
}

export interface PermissionCondition {
  type: 'require_approval' | 'max_per_hour' | 'severity_threshold' | 'business_hours_only';
  value: string | number | boolean;
}

// ─── Events & Alerts ─────────────────────────────────────────────────────────

export interface NormalizedAlert {
  id: string;
  source: string;                      // Connector ID
  sourceAlertId: string;               // Original alert ID in the platform
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number;                  // 0-100
  status: 'new' | 'triaged' | 'investigating' | 'responding' | 'resolved' | 'false_positive';
  assignedAgent?: string;              // Agent role ID handling this
  assignedUser?: string;               // Human assigned

  // MITRE ATT&CK mapping
  tactics?: string[];
  techniques?: string[];

  // Entities involved
  entities: AlertEntity[];

  // AI enrichment
  aiSummary?: string;
  aiRiskScore?: number;                // 0-100 AI-computed risk
  aiRecommendation?: string;
  correlatedAlerts?: string[];         // Related alert IDs across platforms

  // Timeline
  detectedAt: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
  resolvedAt?: string;

  // Raw data
  rawPayload: Record<string, unknown>;
}

export interface AlertEntity {
  type: 'host' | 'user' | 'ip' | 'domain' | 'file' | 'process' | 'email' | 'url';
  value: string;
  metadata?: Record<string, unknown>;
}

// ─── Agent Action Log ────────────────────────────────────────────────────────

export interface AgentAction {
  id: string;
  agentRoleId: string;
  connectorId: string;
  alertId?: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  toolOutput?: Record<string, unknown>;
  status: 'pending_approval' | 'approved' | 'executing' | 'completed' | 'failed' | 'denied';
  approvedBy?: string;                 // User ID if human-approved
  permissionLevel: AgentPermissionLevel;
  reasoning: string;                   // AI's explanation for taking this action
  timestamp: string;
  durationMs?: number;
}

// ─── Connector Registry (runtime) ────────────────────────────────────────────

export interface ConnectorInstance {
  manifest: ConnectorManifest;
  config: ConnectorConfig;
  status: ConnectorStatus;
  lastHealthCheck?: Date;
  activeAgents: string[];
  alertCount24h: number;
  actionCount24h: number;
}
