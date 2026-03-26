/**
 * Alert Center — Alert Ingestion & SIEM Bridge
 * Phase 6 of the Cybersecurity Gaps Integration Plan.
 * Cross-vendor alert ingestion, normalization, correlation, and investigation timelines.
 * "87% of incidents require 2+ data sources. We unify them all."
 */

import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  MagnifyingGlass,
  Plus,
  X,
  CaretRight,
  CaretDown,
  CheckCircle,
  ShieldCheck,
  ShieldSlash,
  Lightning,
  Clock,
  Eye,
  TreeStructure,
  ArrowSquareOut,
  Copy,
  Plugs,
  Target,
  GitBranch,
  ArrowsClockwise,
  PencilSimple,
  Cube,
  Users,
  Desktop,
  WebhooksLogo,
  ListBullets,
  Graph,
  Archive,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";

import type {
  Alert,
  AlertSource,
  AlertStatus,
  SourceType,
  SourceStatus,
  InvestigationTimeline,
  TimelineEvent,
  CorrelationGroup,
} from "@/services/alert-ingestion";

// ─── Severity Colors ────────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<string, { badge: string; dot: string; text: string }> = {
  critical: {
    badge: "bg-red-500/20 text-red-400 border border-red-500/30",
    dot: "bg-red-500",
    text: "text-red-400",
  },
  high: {
    badge: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
    dot: "bg-orange-500",
    text: "text-orange-400",
  },
  medium: {
    badge: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
    dot: "bg-yellow-500",
    text: "text-yellow-400",
  },
  low: {
    badge: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
    dot: "bg-blue-500",
    text: "text-blue-400",
  },
  info: {
    badge: "bg-zinc-500/20 text-zinc-400 border border-zinc-500/30",
    dot: "bg-zinc-500",
    text: "text-zinc-400",
  },
};

const STATUS_COLORS: Record<AlertStatus, string> = {
  new: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
  triaging: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  escalated: "bg-orange-500/20 text-orange-400 border border-orange-500/30",
  resolved: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  false_positive: "bg-zinc-600/20 text-zinc-500 border border-zinc-600/30",
};

const STATUS_LABELS: Record<AlertStatus, string> = {
  new: "New",
  triaging: "Triaging",
  escalated: "Escalated",
  resolved: "Resolved",
  false_positive: "False Positive",
};

const SOURCE_STATUS_COLORS: Record<SourceStatus, { bg: string; dot: string }> = {
  connected: { bg: "bg-emerald-500/20 text-emerald-400", dot: "bg-emerald-500" },
  disconnected: { bg: "bg-zinc-600/20 text-zinc-500", dot: "bg-zinc-500" },
  error: { bg: "bg-red-500/20 text-red-400", dot: "bg-red-500" },
  syncing: { bg: "bg-blue-500/20 text-blue-400", dot: "bg-blue-500" },
};

const SOURCE_ICONS: Record<SourceType, typeof Cube> = {
  splunk: Lightning,
  elastic: MagnifyingGlass,
  sentinel: ShieldCheck,
  crowdstrike: Target,
  pagerduty: Bell,
  syslog: ListBullets,
  webhook: WebhooksLogo,
  manual: PencilSimple,
};

const TIMELINE_STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
  closed: "bg-zinc-600/20 text-zinc-500 border border-zinc-600/30",
  archived: "bg-purple-500/20 text-purple-400 border border-purple-500/30",
};

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_ALERTS: Alert[] = [
  {
    id: "a1b2c3d4-0001-4000-a000-000000000001",
    user_id: "user-1",
    source_id: "src-splunk-01",
    title: "Suspicious PowerShell Execution with Encoded Command",
    description: "PowerShell.exe invoked with -EncodedCommand flag from non-standard parent process (explorer.exe → cmd.exe → powershell.exe). Base64 payload decoded to IEX (New-Object Net.WebClient).DownloadString targeting external C2.",
    severity: "critical",
    source_type: "splunk",
    original_id: "SPL-2026-44821",
    original_data: { search_name: "Encoded PowerShell Detection", severity: "critical", host: "PROD-WEB-01", _time: "2026-03-26T02:14:33Z" },
    affected_host: "PROD-WEB-01",
    affected_user: "svc_deploy",
    source_ip: "10.0.4.22",
    dest_ip: "185.220.101.34",
    mitre_tactics: ["Execution", "Command and Control"],
    mitre_techniques: ["T1059.001", "T1071.001"],
    status: "new",
    correlation_group_id: "cg-001",
    alert_time: "2026-03-26T02:14:33Z",
    ingested_at: "2026-03-26T02:14:35Z",
  },
  {
    id: "a1b2c3d4-0001-4000-a000-000000000002",
    user_id: "user-1",
    source_id: "src-cs-01",
    title: "CrowdStrike: Credential Dumping via LSASS Memory Access",
    description: "Process mimikatz.exe attempted to access LSASS process memory. Credential theft technique detected on domain controller.",
    severity: "critical",
    source_type: "crowdstrike",
    original_id: "CS-DET-88412",
    original_data: { display_name: "LSASS Memory Access", max_severity: 95, hostname: "DC-PRIMARY-01" },
    affected_host: "DC-PRIMARY-01",
    affected_user: "SYSTEM",
    source_ip: "10.0.1.5",
    mitre_tactics: ["Credential Access"],
    mitre_techniques: ["T1003.001"],
    status: "triaging",
    assigned_to: "analyst-1",
    alert_time: "2026-03-26T01:58:11Z",
    ingested_at: "2026-03-26T01:58:14Z",
  },
  {
    id: "a1b2c3d4-0001-4000-a000-000000000003",
    user_id: "user-1",
    source_id: "src-elastic-01",
    title: "Brute Force Login Attempts Detected — 847 Failed Auth in 5min",
    description: "Elastic SIEM detected 847 failed authentication attempts against SSH service from single source IP within a 5-minute window. Threshold: 50/5min.",
    severity: "high",
    source_type: "elastic",
    original_id: "EL-RULE-3391",
    original_data: { "rule.name": "Brute Force Detection", "rule.severity": "high", "host.name": "PROD-SSH-GW-01" },
    affected_host: "PROD-SSH-GW-01",
    source_ip: "45.155.205.99",
    dest_ip: "10.0.2.10",
    mitre_tactics: ["Credential Access", "Initial Access"],
    mitre_techniques: ["T1110.001", "T1078"],
    status: "new",
    alert_time: "2026-03-26T03:22:07Z",
    ingested_at: "2026-03-26T03:22:09Z",
  },
  {
    id: "a1b2c3d4-0001-4000-a000-000000000004",
    user_id: "user-1",
    source_id: "src-sentinel-01",
    title: "Azure Sentinel: Anomalous Service Principal Activity",
    description: "Service principal 'sp-deploy-prod' performed 23 role assignments across 8 subscriptions in 2 minutes. Normal baseline: 0-2 assignments per day.",
    severity: "high",
    source_type: "sentinel",
    original_id: "SENT-INC-7821",
    original_data: { AlertName: "Anomalous SP Activity", Severity: "High", CompromisedEntity: "sp-deploy-prod" },
    affected_host: "AZURE-MGMT",
    affected_user: "sp-deploy-prod",
    mitre_tactics: ["Privilege Escalation", "Persistence"],
    mitre_techniques: ["T1548.002", "T1098"],
    status: "new",
    alert_time: "2026-03-26T04:05:19Z",
    ingested_at: "2026-03-26T04:05:22Z",
  },
  {
    id: "a1b2c3d4-0001-4000-a000-000000000005",
    user_id: "user-1",
    source_id: "src-splunk-01",
    title: "Lateral Movement: SMB Admin Share Access from Non-Admin Workstation",
    description: "User jdoe accessed \\\\DB-MASTER-02\\C$ from workstation WS-SALES-14. User is not in Domain Admins group. Possible compromised credential.",
    severity: "high",
    source_type: "splunk",
    original_id: "SPL-2026-44830",
    original_data: { search_name: "SMB Lateral Movement", severity: "high", host: "DB-MASTER-02" },
    affected_host: "DB-MASTER-02",
    affected_user: "jdoe",
    source_ip: "10.0.8.114",
    dest_ip: "10.0.3.20",
    mitre_tactics: ["Lateral Movement"],
    mitre_techniques: ["T1021.002"],
    status: "new",
    correlation_group_id: "cg-002",
    alert_time: "2026-03-26T02:31:45Z",
    ingested_at: "2026-03-26T02:31:48Z",
  },
  {
    id: "a1b2c3d4-0001-4000-a000-000000000006",
    user_id: "user-1",
    source_id: "src-syslog-01",
    title: "Firewall: Outbound Connection to Known C2 Infrastructure",
    description: "Palo Alto firewall logged outbound connection to 91.215.85.142 (ThreatFeed: Cobalt Strike C2) from internal host PROD-WEB-01 on port 443/tcp.",
    severity: "critical",
    source_type: "syslog",
    original_id: "FW-LOG-9928341",
    original_data: { message: "THREAT C2 Outbound", hostname: "PA-FW-01", severity: 2 },
    affected_host: "PROD-WEB-01",
    source_ip: "10.0.4.22",
    dest_ip: "91.215.85.142",
    mitre_tactics: ["Command and Control"],
    mitre_techniques: ["T1071.001", "T1573"],
    status: "new",
    correlation_group_id: "cg-001",
    alert_time: "2026-03-26T02:15:01Z",
    ingested_at: "2026-03-26T02:15:04Z",
  },
  {
    id: "a1b2c3d4-0001-4000-a000-000000000007",
    user_id: "user-1",
    source_id: "src-cs-01",
    title: "CrowdStrike: Suspicious DLL Side-Loading Detected",
    description: "Legitimate signed binary used to load unsigned DLL from temp directory. Process: C:\\Windows\\System32\\msiexec.exe loading C:\\Users\\Public\\malware.dll.",
    severity: "high",
    source_type: "crowdstrike",
    original_id: "CS-DET-88445",
    original_data: { display_name: "DLL Side-Loading", max_severity: 72, hostname: "WS-DEV-03" },
    affected_host: "WS-DEV-03",
    affected_user: "dev_admin",
    source_ip: "10.0.6.33",
    mitre_tactics: ["Defense Evasion", "Execution"],
    mitre_techniques: ["T1574.002", "T1059"],
    status: "new",
    alert_time: "2026-03-26T03:41:22Z",
    ingested_at: "2026-03-26T03:41:25Z",
  },
  {
    id: "a1b2c3d4-0001-4000-a000-000000000008",
    user_id: "user-1",
    source_id: "src-webhook-01",
    title: "GitHub: Secrets Detected in Push to Public Repository",
    description: "GitHub Advanced Security detected AWS access key (AKIA*****) and database connection string in commit abc123f pushed to public repo org/infrastructure.",
    severity: "critical",
    source_type: "webhook",
    original_id: "GH-SEC-2026-1141",
    original_data: { title: "Secret scanning alert", severity: "critical", target: "github.com/org/infrastructure" },
    affected_host: "github.com/org/infrastructure",
    affected_user: "dev_intern",
    mitre_tactics: ["Credential Access", "Collection"],
    mitre_techniques: ["T1552.001"],
    status: "new",
    alert_time: "2026-03-26T05:02:33Z",
    ingested_at: "2026-03-26T05:02:35Z",
  },
  {
    id: "a1b2c3d4-0001-4000-a000-000000000009",
    user_id: "user-1",
    source_id: "src-elastic-01",
    title: "DNS Tunneling Activity Detected — High Entropy Subdomains",
    description: "DNS resolver logged queries with high-entropy subdomains (avg 4.2 bits/char) to domain data.evil-tunnel.xyz. Pattern consistent with DNS data exfiltration.",
    severity: "medium",
    source_type: "elastic",
    original_id: "EL-RULE-3405",
    original_data: { "rule.name": "DNS Tunneling Detection", "rule.severity": "medium", "host.name": "PROD-APP-02" },
    affected_host: "PROD-APP-02",
    source_ip: "10.0.5.18",
    dest_ip: "8.8.8.8",
    mitre_tactics: ["Exfiltration", "Command and Control"],
    mitre_techniques: ["T1048.003", "T1071.004"],
    status: "triaging",
    assigned_to: "analyst-2",
    alert_time: "2026-03-26T01:12:44Z",
    ingested_at: "2026-03-26T01:12:47Z",
  },
  {
    id: "a1b2c3d4-0001-4000-a000-000000000010",
    user_id: "user-1",
    source_id: "src-splunk-01",
    title: "Scheduled Task Created for Persistence — SYSTEM Context",
    description: "schtasks.exe created task 'WindowsUpdate' running as SYSTEM, pointing to C:\\ProgramData\\update.exe. Non-standard binary path detected.",
    severity: "high",
    source_type: "splunk",
    original_id: "SPL-2026-44842",
    original_data: { search_name: "Persistence Scheduled Task", severity: "high", host: "PROD-WEB-01" },
    affected_host: "PROD-WEB-01",
    source_ip: "10.0.4.22",
    mitre_tactics: ["Persistence", "Execution"],
    mitre_techniques: ["T1053.005"],
    status: "new",
    correlation_group_id: "cg-001",
    alert_time: "2026-03-26T02:18:55Z",
    ingested_at: "2026-03-26T02:18:58Z",
  },
  {
    id: "a1b2c3d4-0001-4000-a000-000000000011",
    user_id: "user-1",
    source_id: "src-sentinel-01",
    title: "Azure AD: Impossible Travel — Login from Two Countries in 3min",
    description: "User maria.garcia logged in from Frankfurt, DE (IP: 3.120.x.x) and Lagos, NG (IP: 102.89.x.x) within 3 minutes. Physical distance: 5,100 km.",
    severity: "medium",
    source_type: "sentinel",
    original_id: "SENT-INC-7834",
    original_data: { AlertName: "Impossible Travel", Severity: "Medium", CompromisedEntity: "maria.garcia@corp.com" },
    affected_host: "AZURE-AD",
    affected_user: "maria.garcia@corp.com",
    source_ip: "102.89.44.12",
    mitre_tactics: ["Initial Access"],
    mitre_techniques: ["T1078.004"],
    status: "new",
    alert_time: "2026-03-26T04:33:18Z",
    ingested_at: "2026-03-26T04:33:21Z",
  },
  {
    id: "a1b2c3d4-0001-4000-a000-000000000012",
    user_id: "user-1",
    source_id: "src-cs-01",
    title: "CrowdStrike: Ransomware Behavior — Mass File Encryption",
    description: "Process vssadmin.exe deleted shadow copies followed by rapid file rename operations (.encrypted extension) across 14 network shares. Kill chain: T1490 → T1486.",
    severity: "critical",
    source_type: "crowdstrike",
    original_id: "CS-DET-88501",
    original_data: { display_name: "Ransomware Behavior", max_severity: 100, hostname: "FILE-SRV-01" },
    affected_host: "FILE-SRV-01",
    affected_user: "SYSTEM",
    source_ip: "10.0.3.50",
    mitre_tactics: ["Impact"],
    mitre_techniques: ["T1486", "T1490"],
    status: "escalated",
    finding_id: "finding-001",
    alert_time: "2026-03-26T05:11:02Z",
    ingested_at: "2026-03-26T05:11:05Z",
  },
  {
    id: "a1b2c3d4-0001-4000-a000-000000000013",
    user_id: "user-1",
    source_id: "src-syslog-01",
    title: "IDS: SQL Injection Attempt Against Production API",
    description: "Suricata IDS triggered rule SID:2024897 — SQL injection pattern detected in HTTP POST body to /api/v2/users/search endpoint. Payload: ' OR 1=1; DROP TABLE--",
    severity: "medium",
    source_type: "syslog",
    original_id: "SURI-2024897-41",
    original_data: { message: "SQL Injection Attempt", hostname: "IDS-01", severity: 4 },
    affected_host: "PROD-API-01",
    source_ip: "194.26.135.78",
    dest_ip: "10.0.2.5",
    mitre_tactics: ["Initial Access"],
    mitre_techniques: ["T1190"],
    status: "resolved",
    resolved_at: "2026-03-26T04:00:00Z",
    alert_time: "2026-03-26T03:55:22Z",
    ingested_at: "2026-03-26T03:55:25Z",
  },
  {
    id: "a1b2c3d4-0001-4000-a000-000000000014",
    user_id: "user-1",
    source_id: "src-webhook-01",
    title: "Datadog: Anomalous Outbound Data Transfer — 4.7GB in 12min",
    description: "Datadog monitor triggered on PROD-DB-02: 4.7GB data transferred to external IP 185.143.223.x over port 8443. Normal baseline: <100MB/hour.",
    severity: "high",
    source_type: "webhook",
    original_id: "DD-MON-2026-441",
    original_data: { title: "Anomalous Outbound Transfer", severity: "high", target: "PROD-DB-02" },
    affected_host: "PROD-DB-02",
    source_ip: "10.0.3.21",
    dest_ip: "185.143.223.88",
    mitre_tactics: ["Exfiltration"],
    mitre_techniques: ["T1048.001"],
    status: "new",
    alert_time: "2026-03-26T04:45:11Z",
    ingested_at: "2026-03-26T04:45:14Z",
  },
  {
    id: "a1b2c3d4-0001-4000-a000-000000000015",
    user_id: "user-1",
    source_id: "src-elastic-01",
    title: "Process Injection via CreateRemoteThread on svchost.exe",
    description: "Elastic Endpoint detected CreateRemoteThread API call targeting svchost.exe (PID 4412) from unknown process C:\\Temp\\loader.exe. Shellcode injection suspected.",
    severity: "critical",
    source_type: "elastic",
    original_id: "EL-RULE-3412",
    original_data: { "rule.name": "Process Injection Detection", "rule.severity": "critical", "host.name": "PROD-WEB-01" },
    affected_host: "PROD-WEB-01",
    source_ip: "10.0.4.22",
    mitre_tactics: ["Defense Evasion", "Privilege Escalation"],
    mitre_techniques: ["T1055.003"],
    status: "new",
    correlation_group_id: "cg-001",
    alert_time: "2026-03-26T02:16:12Z",
    ingested_at: "2026-03-26T02:16:15Z",
  },
  {
    id: "a1b2c3d4-0001-4000-a000-000000000016",
    user_id: "user-1",
    source_id: "src-syslog-01",
    title: "VPN: Concurrent Sessions from Different Geolocations",
    description: "User admin_ops has active VPN sessions from US (NY) and RU (Moscow) simultaneously. Session IDs: VPN-88412, VPN-88419.",
    severity: "medium",
    source_type: "syslog",
    original_id: "VPN-ALERT-8841",
    original_data: { message: "Concurrent VPN geo-anomaly", hostname: "VPN-GW-01", severity: 4 },
    affected_host: "VPN-GW-01",
    affected_user: "admin_ops",
    source_ip: "178.62.11.44",
    mitre_tactics: ["Initial Access"],
    mitre_techniques: ["T1078"],
    status: "false_positive",
    resolved_at: "2026-03-26T05:30:00Z",
    alert_time: "2026-03-26T05:15:33Z",
    ingested_at: "2026-03-26T05:15:36Z",
  },
  {
    id: "a1b2c3d4-0001-4000-a000-000000000017",
    user_id: "user-1",
    source_id: "src-splunk-01",
    title: "Windows Event: New Local Admin Account Created",
    description: "Event ID 4720 followed by 4732 — new user 'support_tmp' added to local Administrators group on DB-MASTER-02. Created by user jdoe.",
    severity: "high",
    source_type: "splunk",
    original_id: "SPL-2026-44855",
    original_data: { search_name: "Local Admin Creation", severity: "high", host: "DB-MASTER-02" },
    affected_host: "DB-MASTER-02",
    affected_user: "jdoe",
    source_ip: "10.0.8.114",
    mitre_tactics: ["Persistence", "Privilege Escalation"],
    mitre_techniques: ["T1136.001", "T1078.003"],
    status: "new",
    correlation_group_id: "cg-002",
    alert_time: "2026-03-26T02:33:10Z",
    ingested_at: "2026-03-26T02:33:13Z",
  },
];

const MOCK_SOURCES: AlertSource[] = [
  {
    id: "src-splunk-01",
    user_id: "user-1",
    name: "Splunk Enterprise (PROD)",
    source_type: "splunk",
    connection_config: { url: "https://splunk.corp.internal:8089", poll_interval_ms: 30000 },
    status: "connected",
    last_seen_at: "2026-03-26T05:14:00Z",
    alerts_ingested: 1847,
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-03-26T05:14:00Z",
  },
  {
    id: "src-elastic-01",
    user_id: "user-1",
    name: "Elastic SIEM Cluster",
    source_type: "elastic",
    connection_config: { url: "https://elastic.corp.internal:9200", index: ".siem-signals-*" },
    status: "connected",
    last_seen_at: "2026-03-26T05:13:45Z",
    alerts_ingested: 2341,
    created_at: "2026-01-20T14:30:00Z",
    updated_at: "2026-03-26T05:13:45Z",
  },
  {
    id: "src-cs-01",
    user_id: "user-1",
    name: "CrowdStrike Falcon",
    source_type: "crowdstrike",
    connection_config: { url: "https://api.crowdstrike.com", client_id: "cs-client-prod" },
    status: "connected",
    last_seen_at: "2026-03-26T05:12:30Z",
    alerts_ingested: 956,
    created_at: "2026-02-01T09:00:00Z",
    updated_at: "2026-03-26T05:12:30Z",
  },
  {
    id: "src-sentinel-01",
    user_id: "user-1",
    name: "Microsoft Sentinel",
    source_type: "sentinel",
    connection_config: { workspace_id: "ws-prod-001", poll_interval_ms: 60000 },
    status: "error",
    last_seen_at: "2026-03-26T03:45:00Z",
    alerts_ingested: 412,
    error_message: "Token expired — re-authenticate via Azure AD",
    created_at: "2026-02-10T11:00:00Z",
    updated_at: "2026-03-26T03:45:00Z",
  },
  {
    id: "src-syslog-01",
    user_id: "user-1",
    name: "Syslog Collector (PA/Suricata)",
    source_type: "syslog",
    connection_config: { port: 514 },
    status: "connected",
    last_seen_at: "2026-03-26T05:14:10Z",
    alerts_ingested: 5629,
    created_at: "2025-12-01T08:00:00Z",
    updated_at: "2026-03-26T05:14:10Z",
  },
  {
    id: "src-webhook-01",
    user_id: "user-1",
    name: "Webhook Receiver (GitHub/Datadog)",
    source_type: "webhook",
    connection_config: { url: "https://crowbyte.internal/api/webhooks/ingest" },
    status: "connected",
    last_seen_at: "2026-03-26T05:02:35Z",
    alerts_ingested: 234,
    created_at: "2026-03-01T16:00:00Z",
    updated_at: "2026-03-26T05:02:35Z",
  },
];

const MOCK_INVESTIGATIONS: InvestigationTimeline[] = [
  {
    id: "inv-001",
    user_id: "user-1",
    name: "PROD-WEB-01 Full Compromise Investigation",
    description: "Multi-stage attack on PROD-WEB-01: initial access via encoded PowerShell, C2 callback to Cobalt Strike, process injection into svchost, scheduled task persistence. Active incident response.",
    alert_ids: ["a1b2c3d4-0001-4000-a000-000000000001", "a1b2c3d4-0001-4000-a000-000000000006", "a1b2c3d4-0001-4000-a000-000000000010", "a1b2c3d4-0001-4000-a000-000000000015"],
    finding_ids: [],
    timeline_events: [
      { id: "evt-1", timestamp: "2026-03-26T02:14:33Z", source: "splunk", event_type: "alert", title: "Encoded PowerShell execution detected", severity: "critical" },
      { id: "evt-2", timestamp: "2026-03-26T02:15:01Z", source: "syslog", event_type: "alert", title: "Outbound C2 connection to 91.215.85.142", severity: "critical" },
      { id: "evt-3", timestamp: "2026-03-26T02:16:12Z", source: "elastic", event_type: "alert", title: "Process injection into svchost.exe", severity: "critical" },
      { id: "evt-4", timestamp: "2026-03-26T02:18:55Z", source: "splunk", event_type: "alert", title: "Persistence via scheduled task 'WindowsUpdate'", severity: "high" },
      { id: "evt-5", timestamp: "2026-03-26T02:30:00Z", source: "manual", event_type: "note", title: "IR team notified — host isolated from network", severity: "info" },
      { id: "evt-6", timestamp: "2026-03-26T03:00:00Z", source: "manual", event_type: "action", title: "Memory dump acquired for forensic analysis", severity: "info" },
    ],
    status: "active",
    severity: "critical",
    lead_analyst: "analyst-1",
    created_at: "2026-03-26T02:20:00Z",
    updated_at: "2026-03-26T03:00:00Z",
  },
  {
    id: "inv-002",
    user_id: "user-1",
    name: "DB-MASTER-02 Lateral Movement Chain",
    description: "User jdoe's credentials appear compromised. SMB admin share access from non-admin workstation followed by local admin account creation on database server.",
    alert_ids: ["a1b2c3d4-0001-4000-a000-000000000005", "a1b2c3d4-0001-4000-a000-000000000017"],
    finding_ids: [],
    timeline_events: [
      { id: "evt-7", timestamp: "2026-03-26T02:31:45Z", source: "splunk", event_type: "alert", title: "SMB C$ access from WS-SALES-14 to DB-MASTER-02", severity: "high" },
      { id: "evt-8", timestamp: "2026-03-26T02:33:10Z", source: "splunk", event_type: "alert", title: "Local admin 'support_tmp' created on DB-MASTER-02", severity: "high" },
      { id: "evt-9", timestamp: "2026-03-26T02:40:00Z", source: "manual", event_type: "note", title: "jdoe's password reset — forced MFA re-enrollment", severity: "info" },
    ],
    status: "active",
    severity: "high",
    lead_analyst: "analyst-2",
    created_at: "2026-03-26T02:35:00Z",
    updated_at: "2026-03-26T02:40:00Z",
  },
  {
    id: "inv-003",
    user_id: "user-1",
    name: "Ransomware Containment — FILE-SRV-01",
    description: "CrowdStrike detected ransomware behavior on FILE-SRV-01. Shadow copies deleted, mass file encryption across 14 shares. Host isolated. Backups verified.",
    alert_ids: ["a1b2c3d4-0001-4000-a000-000000000012"],
    finding_ids: ["finding-001"],
    timeline_events: [
      { id: "evt-10", timestamp: "2026-03-26T05:11:02Z", source: "crowdstrike", event_type: "alert", title: "Ransomware behavior detected — mass encryption", severity: "critical" },
      { id: "evt-11", timestamp: "2026-03-26T05:12:00Z", source: "manual", event_type: "action", title: "Host isolated via CrowdStrike network containment", severity: "critical" },
      { id: "evt-12", timestamp: "2026-03-26T05:15:00Z", source: "manual", event_type: "action", title: "Backup integrity verified — last good: 05:00 UTC", severity: "info" },
      { id: "evt-13", timestamp: "2026-03-26T05:20:00Z", source: "manual", event_type: "note", title: "Escalated to finding — full report generated", severity: "info" },
    ],
    status: "closed",
    severity: "critical",
    lead_analyst: "analyst-1",
    created_at: "2026-03-26T05:12:00Z",
    updated_at: "2026-03-26T05:20:00Z",
  },
];

const MOCK_CORRELATION_GROUPS: CorrelationGroup[] = [
  {
    id: "cg-001",
    alerts: MOCK_ALERTS.filter(a => a.correlation_group_id === "cg-001"),
    severity: "critical",
    affected_hosts: ["PROD-WEB-01"],
    affected_users: ["svc_deploy"],
    mitre_tactics: ["Execution", "Command and Control", "Persistence", "Defense Evasion", "Privilege Escalation"],
    time_range: { start: "2026-03-26T02:14:33Z", end: "2026-03-26T02:18:55Z" },
    description: "4 correlated alerts affecting PROD-WEB-01 — full kill chain from execution to persistence",
  },
  {
    id: "cg-002",
    alerts: MOCK_ALERTS.filter(a => a.correlation_group_id === "cg-002"),
    severity: "high",
    affected_hosts: ["DB-MASTER-02"],
    affected_users: ["jdoe"],
    mitre_tactics: ["Lateral Movement", "Persistence", "Privilege Escalation"],
    time_range: { start: "2026-03-26T02:31:45Z", end: "2026-03-26T02:33:10Z" },
    description: "2 correlated alerts affecting DB-MASTER-02 — lateral movement followed by admin creation",
  },
  {
    id: "cg-003",
    alerts: [MOCK_ALERTS[2], MOCK_ALERTS[10]],
    severity: "high",
    affected_hosts: ["PROD-SSH-GW-01", "AZURE-AD"],
    affected_users: ["maria.garcia@corp.com"],
    mitre_tactics: ["Credential Access", "Initial Access"],
    time_range: { start: "2026-03-26T03:22:07Z", end: "2026-03-26T04:33:18Z" },
    description: "2 correlated alerts — brute force + impossible travel suggest credential compromise",
  },
  {
    id: "cg-004",
    alerts: [MOCK_ALERTS[8], MOCK_ALERTS[13]],
    severity: "high",
    affected_hosts: ["PROD-APP-02", "PROD-DB-02"],
    affected_users: [],
    mitre_tactics: ["Exfiltration", "Command and Control"],
    time_range: { start: "2026-03-26T01:12:44Z", end: "2026-03-26T04:45:11Z" },
    description: "2 correlated alerts — DNS tunneling + anomalous outbound transfer indicate data exfiltration",
  },
  {
    id: "cg-005",
    alerts: [MOCK_ALERTS[1], MOCK_ALERTS[6]],
    severity: "critical",
    affected_hosts: ["DC-PRIMARY-01", "WS-DEV-03"],
    affected_users: ["SYSTEM", "dev_admin"],
    mitre_tactics: ["Credential Access", "Defense Evasion", "Execution"],
    time_range: { start: "2026-03-26T01:58:11Z", end: "2026-03-26T03:41:22Z" },
    description: "2 correlated alerts — LSASS dump on DC + DLL side-loading on dev workstation",
  },
  {
    id: "cg-006",
    alerts: [MOCK_ALERTS[7], MOCK_ALERTS[11]],
    severity: "critical",
    affected_hosts: ["github.com/org/infrastructure", "FILE-SRV-01"],
    affected_users: ["dev_intern", "SYSTEM"],
    mitre_tactics: ["Credential Access", "Collection", "Impact"],
    time_range: { start: "2026-03-26T05:02:33Z", end: "2026-03-26T05:11:02Z" },
    description: "2 correlated alerts — leaked secrets + ransomware activity within same window",
  },
];

// ─── Source Health Sparkline Data ────────────────────────────────────────────

const SPARKLINE_DATA: Record<string, number[]> = {
  "src-splunk-01": [12, 18, 14, 22, 31, 28, 19, 24, 33, 27, 21, 16, 25, 30, 22, 18, 26, 29, 35, 28],
  "src-elastic-01": [8, 14, 11, 19, 26, 23, 15, 20, 28, 22, 17, 12, 21, 25, 18, 14, 22, 24, 30, 23],
  "src-cs-01": [5, 8, 6, 12, 15, 11, 9, 14, 18, 13, 10, 7, 13, 16, 11, 8, 14, 15, 20, 14],
  "src-sentinel-01": [4, 6, 5, 9, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "src-syslog-01": [45, 52, 48, 61, 73, 68, 55, 62, 78, 65, 58, 50, 63, 72, 60, 53, 64, 70, 82, 66],
  "src-webhook-01": [2, 3, 1, 4, 5, 3, 2, 4, 6, 4, 3, 2, 4, 5, 3, 2, 4, 4, 7, 5],
};

// ─── Animations ─────────────────────────────────────────────────────────────

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
};

const slideIn = {
  initial: { opacity: 0, x: 300 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 300 },
  transition: { type: "spring", damping: 25, stiffness: 200 },
};

// ─── Mini Sparkline Component ───────────────────────────────────────────────

function Sparkline({ data, color = "#22c55e", width = 120, height = 28 }: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
    </svg>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AlertCenter() {
  const { toast } = useToast();

  // ─── State ──────────────────────────────────────────────────────────────────

  const [activeTab, setActiveTab] = useState("feed");
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [sources] = useState<AlertSource[]>(MOCK_SOURCES);
  const [investigations, setInvestigations] = useState<InvestigationTimeline[]>(MOCK_INVESTIGATIONS);
  const [correlationGroups] = useState<CorrelationGroup[]>(MOCK_CORRELATION_GROUPS);

  // Feed filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterSourceType, setFilterSourceType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedAlertIds, setSelectedAlertIds] = useState<Set<string>>(new Set());
  const [detailAlert, setDetailAlert] = useState<Alert | null>(null);
  const [showOriginalJson, setShowOriginalJson] = useState(false);

  // Sources
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceType, setNewSourceType] = useState<SourceType>("splunk");
  const [newSourceUrl, setNewSourceUrl] = useState("");
  const [newSourceApiKey, setNewSourceApiKey] = useState("");

  // Investigations
  const [showCreateInvestigation, setShowCreateInvestigation] = useState(false);
  const [newInvName, setNewInvName] = useState("");
  const [newInvDescription, setNewInvDescription] = useState("");
  const [newInvSeverity, setNewInvSeverity] = useState("medium");
  const [expandedInvId, setExpandedInvId] = useState<string | null>(null);

  // Correlation
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  // ─── Filtered Alerts ──────────────────────────────────────────────────────

  const filteredAlerts = useMemo(() => {
    return alerts.filter(a => {
      if (filterSeverity !== "all" && a.severity !== filterSeverity) return false;
      if (filterSourceType !== "all" && a.source_type !== filterSourceType) return false;
      if (filterStatus !== "all" && a.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchTitle = a.title.toLowerCase().includes(q);
        const matchHost = a.affected_host?.toLowerCase().includes(q);
        const matchIp = a.source_ip?.toLowerCase().includes(q) || a.dest_ip?.toLowerCase().includes(q);
        if (!matchTitle && !matchHost && !matchIp) return false;
      }
      return true;
    });
  }, [alerts, filterSeverity, filterSourceType, filterStatus, searchQuery]);

  // ─── Stats ────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const bySev: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    for (const a of alerts) {
      bySev[a.severity] = (bySev[a.severity] || 0) + 1;
      bySource[a.source_type] = (bySource[a.source_type] || 0) + 1;
    }
    return {
      total: alerts.length,
      newCount: alerts.filter(a => a.status === "new").length,
      criticalCount: alerts.filter(a => a.severity === "critical").length,
      sourcesConnected: sources.filter(s => s.status === "connected").length,
      activeInvestigations: investigations.filter(i => i.status === "active").length,
      bySev,
      bySource,
    };
  }, [alerts, sources, investigations]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const toggleAlertSelection = useCallback((id: string) => {
    setSelectedAlertIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback(() => {
    if (selectedAlertIds.size === filteredAlerts.length) {
      setSelectedAlertIds(new Set());
    } else {
      setSelectedAlertIds(new Set(filteredAlerts.map(a => a.id)));
    }
  }, [filteredAlerts, selectedAlertIds]);

  const bulkAction = useCallback((action: "resolved" | "escalated" | "false_positive") => {
    if (selectedAlertIds.size === 0) return;
    setAlerts(prev => prev.map(a => {
      if (selectedAlertIds.has(a.id)) {
        return {
          ...a,
          status: action as AlertStatus,
          ...(action === "resolved" || action === "false_positive" ? { resolved_at: new Date().toISOString() } : {}),
        };
      }
      return a;
    }));
    toast({
      title: `${selectedAlertIds.size} alerts updated`,
      description: `Marked as ${STATUS_LABELS[action as AlertStatus] || action}`,
    });
    setSelectedAlertIds(new Set());
  }, [selectedAlertIds, toast]);

  const handleCreateInvestigation = useCallback(() => {
    if (!newInvName.trim()) return;
    const newInv: InvestigationTimeline = {
      id: `inv-${Date.now()}`,
      user_id: "user-1",
      name: newInvName,
      description: newInvDescription,
      alert_ids: [],
      finding_ids: [],
      timeline_events: [{
        id: `evt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        source: "manual",
        event_type: "note",
        title: "Investigation created",
        severity: "info",
      }],
      status: "active",
      severity: newInvSeverity,
      lead_analyst: "analyst-1",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setInvestigations(prev => [newInv, ...prev]);
    setShowCreateInvestigation(false);
    setNewInvName("");
    setNewInvDescription("");
    setNewInvSeverity("medium");
    toast({ title: "Investigation created", description: newInv.name });
  }, [newInvName, newInvDescription, newInvSeverity, toast]);

  const handleAddSource = useCallback(() => {
    if (!newSourceName.trim()) return;
    toast({
      title: "Source added",
      description: `${newSourceName} (${newSourceType}) — testing connection...`,
    });
    setShowAddSource(false);
    setNewSourceName("");
    setNewSourceUrl("");
    setNewSourceApiKey("");
  }, [newSourceName, newSourceType, toast]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-zinc-950 overflow-hidden">
        {/* Header */}
        <motion.div
          className="flex-none px-6 py-4 border-b border-zinc-800/50"
          {...fadeIn}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <Bell weight="duotone" className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-zinc-100">Alert Center</h1>
                <p className="text-xs text-zinc-500">
                  SIEM Bridge — {stats.total} alerts from {sources.length} sources
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Summary badges */}
              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/30 text-xs">
                {stats.criticalCount} Critical
              </Badge>
              <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30 text-xs">
                {stats.newCount} New
              </Badge>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-xs">
                {stats.sourcesConnected}/{sources.length} Sources
              </Badge>
              <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/30 text-xs">
                {stats.activeInvestigations} Active Investigations
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="flex-none px-6 pt-3 border-b border-zinc-800/50">
            <TabsList className="bg-zinc-900/50 border border-zinc-800/50">
              <TabsTrigger value="feed" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-1.5 text-xs">
                <Bell weight="duotone" className="w-3.5 h-3.5" />
                Alert Feed
                <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 bg-red-500/10 text-red-400 border-red-500/30">
                  {stats.newCount}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="sources" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-1.5 text-xs">
                <Plugs weight="duotone" className="w-3.5 h-3.5" />
                Sources
                <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 bg-zinc-700/50 text-zinc-400 border-zinc-600/30">
                  {sources.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="investigations" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-1.5 text-xs">
                <GitBranch weight="duotone" className="w-3.5 h-3.5" />
                Investigations
                <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 bg-zinc-700/50 text-zinc-400 border-zinc-600/30">
                  {investigations.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="correlation" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 gap-1.5 text-xs">
                <Graph weight="duotone" className="w-3.5 h-3.5" />
                Correlation
                <Badge variant="outline" className="ml-1 text-[10px] px-1.5 py-0 bg-zinc-700/50 text-zinc-400 border-zinc-600/30">
                  {correlationGroups.length}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 1: Alert Feed
              ═══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="feed" className="flex-1 flex min-h-0 mt-0 p-0">
            <div className="flex-1 flex flex-col min-h-0">
              {/* Filter bar */}
              <div className="flex-none px-6 py-3 border-b border-zinc-800/30 flex items-center gap-3 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-[360px]">
                  <MagnifyingGlass weight="duotone" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    placeholder="Search alerts by title, host, or IP..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-9 bg-zinc-900/50 border-zinc-800/50 text-zinc-200 placeholder:text-zinc-600 h-8 text-xs"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                      <X className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300" />
                    </button>
                  )}
                </div>

                <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                  <SelectTrigger className="w-[130px] h-8 text-xs bg-zinc-900/50 border-zinc-800/50 text-zinc-300">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterSourceType} onValueChange={setFilterSourceType}>
                  <SelectTrigger className="w-[140px] h-8 text-xs bg-zinc-900/50 border-zinc-800/50 text-zinc-300">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="all">All Sources</SelectItem>
                    <SelectItem value="splunk">Splunk</SelectItem>
                    <SelectItem value="elastic">Elastic</SelectItem>
                    <SelectItem value="sentinel">Sentinel</SelectItem>
                    <SelectItem value="crowdstrike">CrowdStrike</SelectItem>
                    <SelectItem value="syslog">Syslog</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[130px] h-8 text-xs bg-zinc-900/50 border-zinc-800/50 text-zinc-300">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="triaging">Triaging</SelectItem>
                    <SelectItem value="escalated">Escalated</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="false_positive">False Positive</SelectItem>
                  </SelectContent>
                </Select>

                <Separator orientation="vertical" className="h-6 bg-zinc-800" />

                <span className="text-[10px] text-zinc-500">{filteredAlerts.length} alerts</span>

                {selectedAlertIds.size > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-6 bg-zinc-800" />
                    <span className="text-[10px] text-cyan-400">{selectedAlertIds.size} selected</span>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                      onClick={() => bulkAction("resolved")}
                    >
                      <CheckCircle weight="duotone" className="w-3 h-3 mr-1" />
                      Resolve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
                      onClick={() => bulkAction("escalated")}
                    >
                      <ArrowSquareOut weight="duotone" className="w-3 h-3 mr-1" />
                      Escalate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[10px] bg-zinc-600/20 border-zinc-600/30 text-zinc-400 hover:bg-zinc-600/30"
                      onClick={() => bulkAction("false_positive")}
                    >
                      <ShieldSlash weight="duotone" className="w-3 h-3 mr-1" />
                      False Positive
                    </Button>
                  </>
                )}
              </div>

              {/* Alert list + Detail panel */}
              <div className="flex-1 flex min-h-0">
                {/* Alert List */}
                <ScrollArea className={`flex-1 ${detailAlert ? "max-w-[55%]" : ""}`}>
                  <div className="p-4 space-y-2">
                    {/* Select All */}
                    <div className="flex items-center gap-2 px-2 py-1">
                      <Checkbox
                        checked={selectedAlertIds.size === filteredAlerts.length && filteredAlerts.length > 0}
                        onCheckedChange={selectAllFiltered}
                        className="border-zinc-600"
                      />
                      <span className="text-[10px] text-zinc-500">Select all</span>
                    </div>

                    <motion.div variants={stagger} initial="initial" animate="animate">
                      <AnimatePresence mode="popLayout">
                        {filteredAlerts.map(alert => {
                          const sevColor = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.medium;
                          const StatusIcon = SOURCE_ICONS[alert.source_type] || Cube;
                          const isSelected = selectedAlertIds.has(alert.id);
                          const isDetail = detailAlert?.id === alert.id;

                          return (
                            <motion.div
                              key={alert.id}
                              layout
                              variants={fadeIn}
                              className={`
                                group relative flex items-start gap-3 px-3 py-3 rounded-lg border cursor-pointer transition-colors mb-2
                                ${isDetail
                                  ? "bg-zinc-800/60 border-zinc-700/60"
                                  : "bg-zinc-900/40 border-zinc-800/30 hover:bg-zinc-900/60 hover:border-zinc-700/40"
                                }
                              `}
                              onClick={() => setDetailAlert(isDetail ? null : alert)}
                            >
                              {/* Checkbox */}
                              <div className="pt-0.5" onClick={e => e.stopPropagation()}>
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleAlertSelection(alert.id)}
                                  className="border-zinc-600"
                                />
                              </div>

                              {/* Severity dot */}
                              <div className="pt-1.5">
                                <div className={`w-2.5 h-2.5 rounded-full ${sevColor.dot} ${
                                  alert.severity === "critical" ? "animate-pulse" : ""
                                }`} />
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-200 truncate">{alert.title}</p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sevColor.badge}`}>
                                        {alert.severity}
                                      </Badge>
                                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[alert.status]}`}>
                                        {STATUS_LABELS[alert.status]}
                                      </Badge>
                                      <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                        <StatusIcon weight="duotone" className="w-3 h-3" />
                                        {alert.source_type}
                                      </span>
                                      {alert.affected_host && (
                                        <span className="flex items-center gap-1 text-[10px] text-zinc-500">
                                          <Desktop weight="duotone" className="w-3 h-3" />
                                          {alert.affected_host}
                                        </span>
                                      )}
                                    </div>
                                    {/* MITRE tags */}
                                    {(alert.mitre_tactics.length > 0 || alert.mitre_techniques.length > 0) && (
                                      <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                        {alert.mitre_tactics.map(t => (
                                          <Badge key={t} variant="outline" className="text-[9px] px-1 py-0 bg-violet-500/10 text-violet-400 border-violet-500/20">
                                            {t}
                                          </Badge>
                                        ))}
                                        {alert.mitre_techniques.map(t => (
                                          <Badge key={t} variant="outline" className="text-[9px] px-1 py-0 bg-zinc-700/40 text-zinc-400 border-zinc-600/30 font-mono">
                                            {t}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-[10px] text-zinc-600 whitespace-nowrap flex-none">
                                    {formatDistanceToNow(new Date(alert.alert_time), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>

                      {filteredAlerts.length === 0 && (
                        <div className="text-center py-12 text-zinc-600">
                          <Bell weight="duotone" className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">No alerts match your filters</p>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </ScrollArea>

                {/* Detail Panel */}
                <AnimatePresence>
                  {detailAlert && (
                    <motion.div
                      key="detail-panel"
                      {...slideIn}
                      className="w-[45%] border-l border-zinc-800/50 bg-zinc-950 flex flex-col min-h-0"
                    >
                      <ScrollArea className="flex-1">
                        <div className="p-5">
                          {/* Header */}
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex-1">
                              <h3 className="text-sm font-semibold text-zinc-100">{detailAlert.title}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className={`text-[10px] ${SEVERITY_COLORS[detailAlert.severity]?.badge}`}>
                                  {detailAlert.severity}
                                </Badge>
                                <Badge variant="outline" className={`text-[10px] ${STATUS_COLORS[detailAlert.status]}`}>
                                  {STATUS_LABELS[detailAlert.status]}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-zinc-500 hover:text-zinc-300"
                              onClick={() => setDetailAlert(null)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>

                          {/* Description */}
                          {detailAlert.description && (
                            <div className="mb-4">
                              <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Description</Label>
                              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{detailAlert.description}</p>
                            </div>
                          )}

                          {/* Metadata grid */}
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/30">
                              <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Source</Label>
                              <p className="text-xs text-zinc-300 mt-0.5 flex items-center gap-1">
                                {(() => { const Icon = SOURCE_ICONS[detailAlert.source_type]; return <Icon weight="duotone" className="w-3.5 h-3.5" />; })()}
                                {detailAlert.source_type}
                              </p>
                            </div>
                            <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/30">
                              <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Alert Time</Label>
                              <p className="text-xs text-zinc-300 mt-0.5">{format(new Date(detailAlert.alert_time), "MMM dd HH:mm:ss")}</p>
                            </div>
                            {detailAlert.affected_host && (
                              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/30">
                                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Affected Host</Label>
                                <p className="text-xs text-zinc-300 mt-0.5 font-mono">{detailAlert.affected_host}</p>
                              </div>
                            )}
                            {detailAlert.affected_user && (
                              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/30">
                                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Affected User</Label>
                                <p className="text-xs text-zinc-300 mt-0.5 font-mono">{detailAlert.affected_user}</p>
                              </div>
                            )}
                            {detailAlert.source_ip && (
                              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/30">
                                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Source IP</Label>
                                <p className="text-xs text-zinc-300 mt-0.5 font-mono">{detailAlert.source_ip}</p>
                              </div>
                            )}
                            {detailAlert.dest_ip && (
                              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/30">
                                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Dest IP</Label>
                                <p className="text-xs text-zinc-300 mt-0.5 font-mono">{detailAlert.dest_ip}</p>
                              </div>
                            )}
                            {detailAlert.original_id && (
                              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/30">
                                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Original ID</Label>
                                <p className="text-xs text-zinc-300 mt-0.5 font-mono">{detailAlert.original_id}</p>
                              </div>
                            )}
                            {detailAlert.assigned_to && (
                              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800/30">
                                <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Assigned To</Label>
                                <p className="text-xs text-zinc-300 mt-0.5">{detailAlert.assigned_to}</p>
                              </div>
                            )}
                          </div>

                          {/* MITRE ATT&CK */}
                          {(detailAlert.mitre_tactics.length > 0 || detailAlert.mitre_techniques.length > 0) && (
                            <div className="mb-4">
                              <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">MITRE ATT&CK</Label>
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {detailAlert.mitre_tactics.map(t => (
                                  <Badge key={t} variant="outline" className="text-[10px] bg-violet-500/10 text-violet-400 border-violet-500/20">
                                    {t}
                                  </Badge>
                                ))}
                                {detailAlert.mitre_techniques.map(t => (
                                  <Badge key={t} variant="outline" className="text-[10px] bg-zinc-700/40 text-zinc-400 border-zinc-600/30 font-mono">
                                    {t}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Original JSON */}
                          <div className="mb-4">
                            <button
                              onClick={() => setShowOriginalJson(!showOriginalJson)}
                              className="flex items-center gap-1.5 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
                            >
                              {showOriginalJson ? <CaretDown className="w-3 h-3" /> : <CaretRight className="w-3 h-3" />}
                              <span className="uppercase tracking-wider">Original JSON</span>
                            </button>
                            <AnimatePresence>
                              {showOriginalJson && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <pre className="mt-2 p-3 bg-zinc-900/80 rounded-lg border border-zinc-800/30 text-[10px] text-zinc-400 font-mono overflow-x-auto max-h-[200px] overflow-y-auto">
                                    {JSON.stringify(detailAlert.original_data, null, 2)}
                                  </pre>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          <Separator className="bg-zinc-800/50 my-4" />

                          {/* Actions */}
                          <Label className="text-[10px] text-zinc-500 uppercase tracking-wider">Remediation Actions</Label>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                              onClick={() => {
                                setAlerts(prev => prev.map(a => a.id === detailAlert.id ? { ...a, status: "resolved" as AlertStatus, resolved_at: new Date().toISOString() } : a));
                                setDetailAlert({ ...detailAlert, status: "resolved" });
                                toast({ title: "Alert resolved" });
                              }}
                            >
                              <CheckCircle weight="duotone" className="w-3.5 h-3.5 mr-1" />
                              Mark Resolved
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
                              onClick={() => {
                                setAlerts(prev => prev.map(a => a.id === detailAlert.id ? { ...a, status: "escalated" as AlertStatus } : a));
                                setDetailAlert({ ...detailAlert, status: "escalated" });
                                toast({ title: "Alert escalated to finding" });
                              }}
                            >
                              <ArrowSquareOut weight="duotone" className="w-3.5 h-3.5 mr-1" />
                              Escalate to Finding
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs bg-zinc-600/20 border-zinc-600/30 text-zinc-400 hover:bg-zinc-600/30"
                              onClick={() => {
                                setAlerts(prev => prev.map(a => a.id === detailAlert.id ? { ...a, status: "false_positive" as AlertStatus, resolved_at: new Date().toISOString() } : a));
                                setDetailAlert({ ...detailAlert, status: "false_positive" });
                                toast({ title: "Marked as false positive" });
                              }}
                            >
                              <ShieldSlash weight="duotone" className="w-3.5 h-3.5 mr-1" />
                              False Positive
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs bg-yellow-500/10 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/20"
                              onClick={() => {
                                setAlerts(prev => prev.map(a => a.id === detailAlert.id ? { ...a, status: "triaging" as AlertStatus } : a));
                                setDetailAlert({ ...detailAlert, status: "triaging" });
                                toast({ title: "Alert set to triaging" });
                              }}
                            >
                              <Eye weight="duotone" className="w-3.5 h-3.5 mr-1" />
                              Start Triage
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs bg-zinc-700/30 border-zinc-700/40 text-zinc-400 hover:bg-zinc-700/40"
                              onClick={() => {
                                navigator.clipboard.writeText(JSON.stringify(detailAlert, null, 2));
                                toast({ title: "Alert data copied to clipboard" });
                              }}
                            >
                              <Copy weight="duotone" className="w-3.5 h-3.5 mr-1" />
                              Copy JSON
                            </Button>
                          </div>
                        </div>
                      </ScrollArea>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 2: Sources
              ═══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="sources" className="flex-1 min-h-0 mt-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-200">Connected Sources</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {sources.filter(s => s.status === "connected").length} connected, {sources.filter(s => s.status === "error").length} errors
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                    onClick={() => setShowAddSource(true)}
                  >
                    <Plus weight="bold" className="w-3.5 h-3.5 mr-1" />
                    Add Source
                  </Button>
                </div>

                {/* Source Grid */}
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                  variants={stagger}
                  initial="initial"
                  animate="animate"
                >
                  {sources.map(source => {
                    const statusColor = SOURCE_STATUS_COLORS[source.status];
                    const Icon = SOURCE_ICONS[source.source_type] || Cube;
                    const sparkData = SPARKLINE_DATA[source.id] || [];
                    const sparkColor = source.status === "connected" ? "#22c55e"
                      : source.status === "error" ? "#ef4444"
                      : "#71717a";

                    return (
                      <motion.div key={source.id} variants={fadeIn}>
                        <Card className="bg-zinc-900/50 border-zinc-800/50 hover:border-zinc-700/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`p-2 rounded-lg ${
                                  source.status === "connected" ? "bg-emerald-500/10 border border-emerald-500/20"
                                  : source.status === "error" ? "bg-red-500/10 border border-red-500/20"
                                  : "bg-zinc-800/50 border border-zinc-700/30"
                                }`}>
                                  <Icon weight="duotone" className={`w-4 h-4 ${
                                    source.status === "connected" ? "text-emerald-400"
                                    : source.status === "error" ? "text-red-400"
                                    : "text-zinc-500"
                                  }`} />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-zinc-200">{source.name}</p>
                                  <p className="text-[10px] text-zinc-500 capitalize">{source.source_type}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${statusColor.dot} ${
                                  source.status === "syncing" ? "animate-pulse" : ""
                                }`} />
                                <span className={`text-[10px] capitalize ${statusColor.bg.split(" ")[1]}`}>
                                  {source.status}
                                </span>
                              </div>
                            </div>

                            {/* Error message */}
                            {source.error_message && (
                              <div className="mb-3 p-2 rounded bg-red-500/10 border border-red-500/20">
                                <p className="text-[10px] text-red-400">{source.error_message}</p>
                              </div>
                            )}

                            {/* Sparkline */}
                            <div className="mb-3">
                              <Sparkline data={sparkData} color={sparkColor} width={240} height={24} />
                            </div>

                            {/* Stats */}
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-zinc-500">
                                <span className="text-zinc-300 font-medium">{source.alerts_ingested.toLocaleString()}</span> alerts ingested
                              </span>
                              {source.last_seen_at && (
                                <span className="text-zinc-600">
                                  Last: {formatDistanceToNow(new Date(source.last_seen_at), { addSuffix: true })}
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 3: Investigations
              ═══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="investigations" className="flex-1 min-h-0 mt-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-200">Investigations</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {investigations.filter(i => i.status === "active").length} active, {investigations.filter(i => i.status === "closed").length} closed
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                    onClick={() => setShowCreateInvestigation(true)}
                  >
                    <Plus weight="bold" className="w-3.5 h-3.5 mr-1" />
                    New Investigation
                  </Button>
                </div>

                {/* Investigation list */}
                <motion.div className="space-y-4" variants={stagger} initial="initial" animate="animate">
                  {investigations.map(inv => {
                    const isExpanded = expandedInvId === inv.id;
                    const sevColor = SEVERITY_COLORS[inv.severity] || SEVERITY_COLORS.medium;

                    return (
                      <motion.div key={inv.id} variants={fadeIn} layout>
                        <Card className="bg-zinc-900/50 border-zinc-800/50">
                          <CardContent className="p-0">
                            {/* Investigation Header */}
                            <button
                              className="w-full flex items-start gap-3 p-4 text-left hover:bg-zinc-800/30 transition-colors rounded-t-lg"
                              onClick={() => setExpandedInvId(isExpanded ? null : inv.id)}
                            >
                              <div className="pt-0.5">
                                {isExpanded
                                  ? <CaretDown weight="bold" className="w-4 h-4 text-zinc-500" />
                                  : <CaretRight weight="bold" className="w-4 h-4 text-zinc-500" />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="text-sm font-medium text-zinc-200 truncate">{inv.name}</h3>
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sevColor.badge}`}>
                                    {inv.severity}
                                  </Badge>
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${TIMELINE_STATUS_COLORS[inv.status]}`}>
                                    {inv.status}
                                  </Badge>
                                </div>
                                {inv.description && (
                                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{inv.description}</p>
                                )}
                                <div className="flex items-center gap-3 mt-1.5 text-[10px] text-zinc-600">
                                  <span className="flex items-center gap-1">
                                    <Bell weight="duotone" className="w-3 h-3" />
                                    {inv.alert_ids.length} alerts
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <ListBullets weight="duotone" className="w-3 h-3" />
                                    {inv.timeline_events.length} events
                                  </span>
                                  {inv.lead_analyst && (
                                    <span className="flex items-center gap-1">
                                      <Users weight="duotone" className="w-3 h-3" />
                                      {inv.lead_analyst}
                                    </span>
                                  )}
                                  <span className="flex items-center gap-1">
                                    <Clock weight="duotone" className="w-3 h-3" />
                                    {formatDistanceToNow(new Date(inv.updated_at), { addSuffix: true })}
                                  </span>
                                </div>
                              </div>
                            </button>

                            {/* Expanded Timeline */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <Separator className="bg-zinc-800/50" />
                                  <div className="p-4 pl-11">
                                    <Label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-3 block">
                                      Timeline
                                    </Label>
                                    <div className="relative ml-3">
                                      {/* Timeline line */}
                                      <div className="absolute left-0 top-2 bottom-2 w-px bg-zinc-800" />

                                      {inv.timeline_events.map((evt, idx) => {
                                        const evtSevColor = SEVERITY_COLORS[evt.severity || "info"] || SEVERITY_COLORS.info;
                                        const isAlert = evt.event_type === "alert";
                                        const isAction = evt.event_type === "action";

                                        return (
                                          <div key={evt.id} className="relative flex items-start gap-3 pb-4 last:pb-0">
                                            {/* Timeline dot */}
                                            <div className={`absolute -left-[4px] top-1.5 w-[9px] h-[9px] rounded-full border-2 border-zinc-950 ${evtSevColor.dot}`} />

                                            <div className="ml-4 flex-1">
                                              <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-zinc-600 font-mono">
                                                  {format(new Date(evt.timestamp), "HH:mm:ss")}
                                                </span>
                                                <Badge variant="outline" className={`text-[9px] px-1 py-0 ${
                                                  isAlert ? "bg-red-500/10 text-red-400 border-red-500/20"
                                                  : isAction ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                                                  : "bg-zinc-700/30 text-zinc-400 border-zinc-600/20"
                                                }`}>
                                                  {evt.event_type}
                                                </Badge>
                                                <span className="text-[10px] text-zinc-600">{evt.source}</span>
                                              </div>
                                              <p className="text-xs text-zinc-300 mt-0.5">{evt.title}</p>
                                              {evt.description && (
                                                <p className="text-[10px] text-zinc-500 mt-0.5">{evt.description}</p>
                                              )}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>

                                    {/* Investigation actions */}
                                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-zinc-800/30">
                                      {inv.status === "active" && (
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="h-7 text-[10px] bg-zinc-700/20 border-zinc-700/30 text-zinc-400 hover:bg-zinc-700/30"
                                          onClick={() => {
                                            setInvestigations(prev => prev.map(i =>
                                              i.id === inv.id ? { ...i, status: "closed" as const, updated_at: new Date().toISOString() } : i
                                            ));
                                            toast({ title: "Investigation closed" });
                                          }}
                                        >
                                          <CheckCircle weight="duotone" className="w-3 h-3 mr-1" />
                                          Close Investigation
                                        </Button>
                                      )}
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[10px] bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
                                        onClick={() => {
                                          setInvestigations(prev => prev.map(i =>
                                            i.id === inv.id ? { ...i, status: "archived" as const, updated_at: new Date().toISOString() } : i
                                          ));
                                          toast({ title: "Investigation archived" });
                                        }}
                                      >
                                        <Archive weight="duotone" className="w-3 h-3 mr-1" />
                                        Archive
                                      </Button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            </ScrollArea>
          </TabsContent>

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB 4: Correlation
              ═══════════════════════════════════════════════════════════════════════ */}
          <TabsContent value="correlation" className="flex-1 min-h-0 mt-0 p-0">
            <ScrollArea className="h-full">
              <div className="p-6">
                {/* Header + Stats */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="text-sm font-semibold text-zinc-200">Alert Correlation</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Auto-grouped by host, IP, and user within 15-minute windows
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-violet-500/10 border-violet-500/30 text-violet-400 hover:bg-violet-500/20"
                    onClick={() => toast({ title: "Correlation engine running", description: "Re-analyzing alert relationships..." })}
                  >
                    <ArrowsClockwise weight="duotone" className="w-3.5 h-3.5 mr-1" />
                    Re-correlate
                  </Button>
                </div>

                {/* Correlation Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                  <Card className="bg-zinc-900/50 border-zinc-800/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-zinc-100">{correlationGroups.length}</p>
                      <p className="text-[10px] text-zinc-500">Total Groups</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-zinc-900/50 border-zinc-800/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-zinc-100">
                        {(correlationGroups.reduce((sum, g) => sum + g.alerts.length, 0) / Math.max(correlationGroups.length, 1)).toFixed(1)}
                      </p>
                      <p className="text-[10px] text-zinc-500">Avg Alerts/Group</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-zinc-900/50 border-zinc-800/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-red-400">
                        {correlationGroups.filter(g => g.severity === "critical").length}
                      </p>
                      <p className="text-[10px] text-zinc-500">Critical Groups</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-zinc-900/50 border-zinc-800/50">
                    <CardContent className="p-3 text-center">
                      <p className="text-lg font-bold text-zinc-100">
                        {[...new Set(correlationGroups.flatMap(g => g.affected_hosts))].length}
                      </p>
                      <p className="text-[10px] text-zinc-500">Affected Hosts</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Correlation Groups */}
                <motion.div className="space-y-4" variants={stagger} initial="initial" animate="animate">
                  {correlationGroups.map(group => {
                    const isExpanded = expandedGroupId === group.id;
                    const sevColor = SEVERITY_COLORS[group.severity] || SEVERITY_COLORS.medium;

                    return (
                      <motion.div key={group.id} variants={fadeIn} layout>
                        <Card className={`bg-zinc-900/50 border-zinc-800/50 ${
                          group.severity === "critical" ? "border-l-2 border-l-red-500/50" : ""
                        }`}>
                          <CardContent className="p-0">
                            {/* Group Header */}
                            <button
                              className="w-full flex items-start gap-3 p-4 text-left hover:bg-zinc-800/30 transition-colors rounded-t-lg"
                              onClick={() => setExpandedGroupId(isExpanded ? null : group.id)}
                            >
                              <div className="pt-0.5">
                                {isExpanded
                                  ? <CaretDown weight="bold" className="w-4 h-4 text-zinc-500" />
                                  : <CaretRight weight="bold" className="w-4 h-4 text-zinc-500" />
                                }
                              </div>
                              <div className={`p-1.5 rounded-lg ${
                                group.severity === "critical" ? "bg-red-500/10 border border-red-500/20"
                                : "bg-orange-500/10 border border-orange-500/20"
                              }`}>
                                <Graph weight="duotone" className={`w-4 h-4 ${sevColor.text}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${sevColor.badge}`}>
                                    {group.severity}
                                  </Badge>
                                  <span className="text-sm font-medium text-zinc-200">
                                    {group.alerts.length} correlated alerts
                                  </span>
                                </div>
                                <p className="text-xs text-zinc-400">{group.description}</p>
                                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                  {/* Affected hosts */}
                                  {group.affected_hosts.map(h => (
                                    <span key={h} className="flex items-center gap-1 text-[10px] text-zinc-500">
                                      <Desktop weight="duotone" className="w-3 h-3" />
                                      {h}
                                    </span>
                                  ))}
                                  {/* Time range */}
                                  <span className="flex items-center gap-1 text-[10px] text-zinc-600">
                                    <Clock weight="duotone" className="w-3 h-3" />
                                    {format(new Date(group.time_range.start), "HH:mm:ss")} — {format(new Date(group.time_range.end), "HH:mm:ss")}
                                  </span>
                                </div>
                                {/* MITRE Tactics */}
                                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                  {group.mitre_tactics.map(t => (
                                    <Badge key={t} variant="outline" className="text-[9px] px-1 py-0 bg-violet-500/10 text-violet-400 border-violet-500/20">
                                      {t}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </button>

                            {/* Expanded: show constituent alerts */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <Separator className="bg-zinc-800/50" />
                                  <div className="p-4 pl-14 space-y-2">
                                    <Label className="text-[10px] text-zinc-500 uppercase tracking-wider mb-2 block">
                                      Constituent Alerts
                                    </Label>
                                    {group.alerts.map(alert => {
                                      const alertSev = SEVERITY_COLORS[alert.severity] || SEVERITY_COLORS.medium;
                                      const AlertIcon = SOURCE_ICONS[alert.source_type] || Cube;
                                      return (
                                        <div
                                          key={alert.id}
                                          className="flex items-start gap-2 p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/30 cursor-pointer hover:bg-zinc-800/40 transition-colors"
                                          onClick={() => {
                                            setDetailAlert(alert);
                                            setActiveTab("feed");
                                          }}
                                        >
                                          <div className={`w-2 h-2 rounded-full mt-1.5 ${alertSev.dot}`} />
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs text-zinc-300 truncate">{alert.title}</p>
                                            <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500">
                                              <AlertIcon weight="duotone" className="w-3 h-3" />
                                              <span>{alert.source_type}</span>
                                              <span className="font-mono">{alert.affected_host}</span>
                                              <span>{format(new Date(alert.alert_time), "HH:mm:ss")}</span>
                                            </div>
                                          </div>
                                          <Badge variant="outline" className={`text-[9px] px-1 py-0 ${alertSev.badge}`}>
                                            {alert.severity}
                                          </Badge>
                                        </div>
                                      );
                                    })}

                                    {/* Group Actions */}
                                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800/30">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[10px] bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                                        onClick={() => {
                                          const newInv: InvestigationTimeline = {
                                            id: `inv-from-${group.id}`,
                                            user_id: "user-1",
                                            name: `Investigation: ${group.affected_hosts.join(", ")}`,
                                            description: group.description,
                                            alert_ids: group.alerts.map(a => a.id),
                                            finding_ids: [],
                                            timeline_events: group.alerts.map(a => ({
                                              id: `evt-${a.id}`,
                                              timestamp: a.alert_time,
                                              source: a.source_type,
                                              event_type: "alert" as const,
                                              title: a.title,
                                              severity: a.severity,
                                            })),
                                            status: "active",
                                            severity: group.severity,
                                            lead_analyst: "analyst-1",
                                            created_at: new Date().toISOString(),
                                            updated_at: new Date().toISOString(),
                                          };
                                          setInvestigations(prev => [newInv, ...prev]);
                                          toast({ title: "Investigation created from correlation group" });
                                        }}
                                      >
                                        <GitBranch weight="duotone" className="w-3 h-3 mr-1" />
                                        Create Investigation
                                      </Button>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-[10px] bg-orange-500/10 border-orange-500/30 text-orange-400 hover:bg-orange-500/20"
                                        onClick={() => {
                                          setAlerts(prev => prev.map(a =>
                                            group.alerts.some(ga => ga.id === a.id) ? { ...a, status: "escalated" as AlertStatus } : a
                                          ));
                                          toast({ title: `${group.alerts.length} alerts escalated` });
                                        }}
                                      >
                                        <ArrowSquareOut weight="duotone" className="w-3 h-3 mr-1" />
                                        Escalate All
                                      </Button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </motion.div>

                {/* Correlation Rules Info */}
                <Card className="bg-zinc-900/30 border-zinc-800/40 mt-6">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs text-zinc-400 flex items-center gap-2">
                      <TreeStructure weight="duotone" className="w-4 h-4" />
                      Correlation Rules
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="space-y-2">
                      {[
                        { name: "Host Affinity", desc: "Group alerts sharing the same affected host within the time window", status: "active" },
                        { name: "IP Correlation", desc: "Group alerts with matching source or destination IPs", status: "active" },
                        { name: "User Correlation", desc: "Group alerts involving the same affected user account", status: "active" },
                        { name: "Kill Chain Progression", desc: "Detect MITRE tactic progression (Recon → Initial Access → Execution → ...)", status: "active" },
                        { name: "Cross-Source Enrichment", desc: "Match alerts across different SIEM sources by common IOCs", status: "active" },
                      ].map(rule => (
                        <div key={rule.name} className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/50 border border-zinc-800/30">
                          <div>
                            <p className="text-xs text-zinc-300">{rule.name}</p>
                            <p className="text-[10px] text-zinc-600 mt-0.5">{rule.desc}</p>
                          </div>
                          <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                            {rule.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>

        {/* ═══════════════════════════════════════════════════════════════════════
            DIALOGS
            ═══════════════════════════════════════════════════════════════════════ */}

        {/* Add Source Dialog */}
        <Dialog open={showAddSource} onOpenChange={setShowAddSource}>
          <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-zinc-100 flex items-center gap-2">
                <Plugs weight="duotone" className="w-5 h-5 text-cyan-400" />
                Add Alert Source
              </DialogTitle>
              <DialogDescription className="text-zinc-500">
                Connect a SIEM, EDR, or other alert source.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-xs text-zinc-400">Source Name</Label>
                <Input
                  value={newSourceName}
                  onChange={e => setNewSourceName(e.target.value)}
                  placeholder="e.g. Production Splunk"
                  className="mt-1 bg-zinc-800/50 border-zinc-700 text-zinc-200"
                />
              </div>

              <div>
                <Label className="text-xs text-zinc-400">Source Type</Label>
                <Select value={newSourceType} onValueChange={v => setNewSourceType(v as SourceType)}>
                  <SelectTrigger className="mt-1 bg-zinc-800/50 border-zinc-700 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="splunk">Splunk</SelectItem>
                    <SelectItem value="elastic">Elastic SIEM</SelectItem>
                    <SelectItem value="sentinel">Microsoft Sentinel</SelectItem>
                    <SelectItem value="crowdstrike">CrowdStrike Falcon</SelectItem>
                    <SelectItem value="pagerduty">PagerDuty</SelectItem>
                    <SelectItem value="syslog">Syslog</SelectItem>
                    <SelectItem value="webhook">Webhook</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs text-zinc-400">
                  {newSourceType === "syslog" ? "Listen Port" : "Connection URL"}
                </Label>
                <Input
                  value={newSourceUrl}
                  onChange={e => setNewSourceUrl(e.target.value)}
                  placeholder={newSourceType === "syslog" ? "514" : "https://..."}
                  className="mt-1 bg-zinc-800/50 border-zinc-700 text-zinc-200"
                />
              </div>

              {newSourceType !== "syslog" && newSourceType !== "webhook" && (
                <div>
                  <Label className="text-xs text-zinc-400">API Key / Token</Label>
                  <Input
                    type="password"
                    value={newSourceApiKey}
                    onChange={e => setNewSourceApiKey(e.target.value)}
                    placeholder="Enter API key or bearer token"
                    className="mt-1 bg-zinc-800/50 border-zinc-700 text-zinc-200"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowAddSource(false)} className="text-zinc-400">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddSource}
                disabled={!newSourceName.trim()}
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                <Plus weight="bold" className="w-3.5 h-3.5 mr-1" />
                Add Source
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Investigation Dialog */}
        <Dialog open={showCreateInvestigation} onOpenChange={setShowCreateInvestigation}>
          <DialogContent className="bg-zinc-900 border-zinc-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-zinc-100 flex items-center gap-2">
                <GitBranch weight="duotone" className="w-5 h-5 text-cyan-400" />
                New Investigation
              </DialogTitle>
              <DialogDescription className="text-zinc-500">
                Create a unified investigation timeline for related alerts and findings.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div>
                <Label className="text-xs text-zinc-400">Investigation Name</Label>
                <Input
                  value={newInvName}
                  onChange={e => setNewInvName(e.target.value)}
                  placeholder="e.g. PROD-WEB-01 Compromise Investigation"
                  className="mt-1 bg-zinc-800/50 border-zinc-700 text-zinc-200"
                />
              </div>

              <div>
                <Label className="text-xs text-zinc-400">Description</Label>
                <Textarea
                  value={newInvDescription}
                  onChange={e => setNewInvDescription(e.target.value)}
                  placeholder="What triggered this investigation? What are you looking for?"
                  rows={3}
                  className="mt-1 bg-zinc-800/50 border-zinc-700 text-zinc-200 resize-none"
                />
              </div>

              <div>
                <Label className="text-xs text-zinc-400">Initial Severity</Label>
                <Select value={newInvSeverity} onValueChange={setNewInvSeverity}>
                  <SelectTrigger className="mt-1 bg-zinc-800/50 border-zinc-700 text-zinc-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowCreateInvestigation(false)} className="text-zinc-400">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateInvestigation}
                disabled={!newInvName.trim()}
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                <Plus weight="bold" className="w-3.5 h-3.5 mr-1" />
                Create Investigation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
