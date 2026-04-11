/**
 * CrowByte MCP — Full Application Control Plane
 *
 * ~85 tools giving AI complete CRUD access to EVERY CrowByte feature:
 * CVE database, knowledge base, bookmarks, findings, red team ops,
 * fleet endpoints, threat intel, reports, network scans, custom agents,
 * sentinel, missions, alerts, cloud security, detection engine,
 * tools registry, analytics, conversations, triage engine, support.
 *
 * The AI IS the app. It reads, writes, navigates, creates, deletes,
 * exports, scans, triages, and orchestrates across all pages and data.
 */

import type { ToolDef } from './terminal-tools';
import { pgOr } from '@/lib/utils';

// ─── Lazy Supabase client ────────────────────────────────────────────────────

async function getSupabase() {
  const { supabase } = await import('@/integrations/supabase/client');
  return supabase;
}

async function getUserId(): Promise<string> {
  const supabase = await getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function csvToArray(csv?: string): string[] {
  return csv ? csv.split(',').map(s => s.trim()).filter(Boolean) : [];
}

function truncate(s: string, max = 200): string {
  return s.length > max ? s.slice(0, max) + '...' : s;
}

function jsonSafe(obj: any): string {
  try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
}

// ─── Tool Definitions ────────────────────────────────────────────────────────
// Organized by domain. Each tool maps to a service method.

export const APP_TOOLS: ToolDef[] = [

  // ═══════════════════════════════════════════════════════════════════════════
  // CVE DATABASE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'cve_db_search',
      description: 'Search the CrowByte CVE database by keyword, severity, product.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search cve_id, description, products' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          limit: { type: 'string', description: 'Max results (default 10)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cve_db_save',
      description: 'Save/upsert a CVE to the database.',
      parameters: {
        type: 'object',
        properties: {
          cve_id: { type: 'string', description: 'CVE-YYYY-NNNNN' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          cvss_score: { type: 'string', description: '0.0-10.0' },
          products: { type: 'string', description: 'Comma-separated' },
          cwe: { type: 'string', description: 'CWE-XX' },
        },
        required: ['cve_id', 'description', 'severity'],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // KNOWLEDGE BASE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'knowledge_search',
      description: 'Search CrowByte knowledge base entries.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search title, content, summary' },
          category: { type: 'string' },
          tags: { type: 'string', description: 'Comma-separated tags' },
          limit: { type: 'string', description: 'Max results (default 10)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'knowledge_save',
      description: 'Save a knowledge base entry.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          content: { type: 'string' },
          category: { type: 'string' },
          tags: { type: 'string', description: 'Comma-separated' },
          source_url: { type: 'string' },
          importance: { type: 'string', description: '1-5' },
        },
        required: ['title', 'content'],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOKMARKS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'bookmarks_search',
      description: 'Search saved bookmarks.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          category: { type: 'string' },
          limit: { type: 'string' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bookmark_save',
      description: 'Save a new bookmark.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          url: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string' },
          tags: { type: 'string' },
        },
        required: ['title', 'url'],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FINDINGS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'findings_search',
      description: 'Search security findings from all scan tools.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
          status: { type: 'string', enum: ['open', 'confirmed', 'false_positive', 'resolved', 'accepted_risk', 'duplicate'] },
          source: { type: 'string', enum: ['nmap', 'nuclei', 'sqlmap', 'burp', 'shodan', 'manual', 'dalfox', 'ffuf', 'nikto'] },
          limit: { type: 'string' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'finding_save',
      description: 'Save a new security finding.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          target_host: { type: 'string' },
          target_port: { type: 'string' },
          target_url: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
          finding_type: { type: 'string', enum: ['vuln', 'misconfig', 'info', 'exposure', 'credential', 'service'] },
          source: { type: 'string', enum: ['nmap', 'nuclei', 'sqlmap', 'shodan', 'manual'] },
          cve_ids: { type: 'string', description: 'Comma-separated' },
          cwe_ids: { type: 'string', description: 'Comma-separated' },
          tags: { type: 'string' },
        },
        required: ['title', 'target_host', 'severity'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'finding_update',
      description: 'Update a finding status, severity, or details.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Finding ID' },
          status: { type: 'string', enum: ['open', 'confirmed', 'false_positive', 'resolved', 'accepted_risk', 'duplicate'] },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
          notes: { type: 'string', description: 'Additional notes' },
        },
        required: ['id'],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // RED TEAM OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'redteam_list',
      description: 'List red team operations.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['planned', 'in_progress', 'paused', 'completed', 'cancelled'] },
          limit: { type: 'string' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'redteam_create',
      description: 'Create a new red team operation.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          target: { type: 'string' },
          operation_type: { type: 'string', enum: ['pentest', 'red_team', 'vulnerability_assessment', 'bug_bounty'] },
          description: { type: 'string' },
          rules_of_engagement: { type: 'string' },
          tags: { type: 'string' },
        },
        required: ['name', 'target', 'operation_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'redteam_update',
      description: 'Update a red team operation (status, progress, etc).',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['planned', 'in_progress', 'paused', 'completed', 'cancelled'] },
          progress: { type: 'string', description: '0-100' },
        },
        required: ['id'],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FLEET / ENDPOINTS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'fleet_status',
      description: 'Get all fleet endpoints with status, CPU, memory, disk, OS.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['online', 'offline', 'warning', 'critical'] },
        },
        required: [],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // THREAT INTELLIGENCE
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'threat_intel_search',
      description: 'Search threat IOCs (IPs, URLs, domains, hashes).',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          ioc_type: { type: 'string', description: 'ip, url, domain, hash, email' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          limit: { type: 'string' },
        },
        required: [],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // REPORTS (report-generator.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'report_list',
      description: 'List all security reports.',
      parameters: { type: 'object', properties: { limit: { type: 'string' } }, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'report_create',
      description: 'Create a new security report.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          report_type: { type: 'string', enum: ['pentest', 'bounty', 'disclosure', 'compliance', 'executive'] },
          template: { type: 'string', enum: ['hackerone', 'bugcrowd', 'pentest_full', 'pentest_executive', 'disclosure', 'custom'] },
          target: { type: 'string', description: 'Target system/domain' },
          executive_summary: { type: 'string' },
          scope: { type: 'string', description: 'Comma-separated scope items' },
        },
        required: ['title', 'report_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'report_get',
      description: 'Get a report by ID with full details.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'report_update',
      description: 'Update report fields (title, status, summary, etc).',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'review', 'final', 'submitted'] },
          executive_summary: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'report_add_finding',
      description: 'Add a finding to a report by finding ID.',
      parameters: {
        type: 'object',
        properties: {
          report_id: { type: 'string' },
          finding_id: { type: 'string' },
        },
        required: ['report_id', 'finding_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'report_auto_populate',
      description: 'Auto-populate a report with findings matching target.',
      parameters: {
        type: 'object',
        properties: {
          report_id: { type: 'string' },
          target: { type: 'string', description: 'Target host/domain to match findings' },
        },
        required: ['report_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'report_export',
      description: 'Export a report in various formats.',
      parameters: {
        type: 'object',
        properties: {
          report_id: { type: 'string' },
          format: { type: 'string', enum: ['markdown', 'html', 'pdf_html', 'hackerone_json', 'bugcrowd_json', 'json'] },
        },
        required: ['report_id', 'format'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'report_delete',
      description: 'Delete a report.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NETWORK SCANS (network-scans.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'scan_list',
      description: 'List all network scans with status and stats.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'running', 'completed', 'failed', 'cancelled'] },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scan_create',
      description: 'Create a new network scan.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          target: { type: 'string', description: 'IP, CIDR, or hostname' },
          scan_type: { type: 'string', enum: ['quick', 'full', 'stealth', 'vulnerability', 'custom'] },
          ports: { type: 'string', description: 'Port range (e.g., 1-1000, or 80,443,8080)' },
          options: { type: 'string', description: 'Nmap flags' },
        },
        required: ['name', 'target', 'scan_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scan_get',
      description: 'Get scan details including discovered hosts and ports.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scan_start',
      description: 'Start a pending network scan.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scan_cancel',
      description: 'Cancel a running network scan.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scan_hosts',
      description: 'Get all discovered hosts from a scan.',
      parameters: {
        type: 'object',
        properties: { scan_id: { type: 'string' } },
        required: ['scan_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scan_ports',
      description: 'Get all discovered ports from a scan (optionally by host).',
      parameters: {
        type: 'object',
        properties: {
          scan_id: { type: 'string' },
          host_id: { type: 'string', description: 'Optional: filter by host' },
        },
        required: ['scan_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scan_stats',
      description: 'Get network scan statistics (total, by status, by type).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'scan_delete',
      description: 'Delete a network scan and its results.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM AGENTS (custom-agents.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'agent_list',
      description: 'List all custom AI agents.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Filter by category' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'agent_create',
      description: 'Create a new custom AI agent.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          instructions: { type: 'string', description: 'System prompt for the agent' },
          model: { type: 'string', description: 'Model ID to use' },
          category: { type: 'string', description: 'Agent category' },
          capabilities: { type: 'string', description: 'Comma-separated capabilities' },
          temperature: { type: 'string', description: '0.0-2.0' },
        },
        required: ['name', 'instructions'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'agent_get',
      description: 'Get a custom agent by ID with full config.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'agent_update',
      description: 'Update a custom agent config.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          instructions: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'testing'] },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'agent_delete',
      description: 'Delete a custom AI agent.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'agent_clone',
      description: 'Clone an existing agent with a new name.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Source agent ID' },
          new_name: { type: 'string' },
        },
        required: ['id', 'new_name'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'agent_stats',
      description: 'Get agent usage statistics.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SENTINEL (sentinel.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'sentinel_assets',
      description: 'List all monitored infrastructure assets.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sentinel_add_asset',
      description: 'Add an infrastructure asset to Sentinel monitoring.',
      parameters: {
        type: 'object',
        properties: {
          hostname: { type: 'string' },
          ip_address: { type: 'string' },
          asset_type: { type: 'string', enum: ['server', 'workstation', 'network_device', 'iot', 'cloud_instance', 'container'] },
          os: { type: 'string' },
          environment: { type: 'string', enum: ['production', 'staging', 'development', 'testing'] },
          criticality: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
        },
        required: ['hostname', 'ip_address', 'asset_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sentinel_threats',
      description: 'List detected threats, optionally filtered by status.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'mitigated', 'investigating', 'false_positive'] },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sentinel_create_threat',
      description: 'Manually create a threat entry.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          threat_type: { type: 'string' },
          affected_asset_id: { type: 'string' },
          ioc_values: { type: 'string', description: 'Comma-separated IOC values' },
        },
        required: ['title', 'severity'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sentinel_update_threat',
      description: 'Update threat status.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['active', 'mitigated', 'investigating', 'false_positive'] },
        },
        required: ['id', 'status'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sentinel_scans',
      description: 'List Sentinel security scans.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'string' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'sentinel_dashboard',
      description: 'Get Sentinel dashboard stats (assets, threats, scans, actions).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MISSION PLANS (mission-plans.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'mission_list',
      description: 'List all mission plans.',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Filter by mission type' },
          status: { type: 'string', description: 'Filter by status' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mission_create',
      description: 'Create a new mission plan.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          type: { type: 'string', enum: ['recon', 'pentest', 'red_team', 'bug_bounty', 'incident_response', 'threat_hunt'] },
          priority: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          target: { type: 'string', description: 'Target scope' },
          objectives: { type: 'string', description: 'Comma-separated objectives' },
        },
        required: ['name', 'type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mission_get',
      description: 'Get mission plan details.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mission_update',
      description: 'Update a mission plan.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['draft', 'active', 'paused', 'completed', 'cancelled'] },
          progress: { type: 'string', description: '0-100' },
          notes: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mission_delete',
      description: 'Delete a mission plan.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mission_search',
      description: 'Search mission plans by keyword.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mission_stats',
      description: 'Get mission plan statistics.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ALERT CENTER (alert-ingestion.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'alert_sources',
      description: 'List all configured alert sources (Splunk, Elastic, CrowdStrike, etc).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'alert_create_source',
      description: 'Create a new alert source connection.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          source_type: { type: 'string', enum: ['splunk', 'elastic', 'sentinel', 'crowdstrike', 'syslog', 'webhook', 'pagerduty', 'manual'] },
          url: { type: 'string', description: 'Connection URL' },
          api_key: { type: 'string', description: 'API key/token' },
        },
        required: ['name', 'source_type'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'alert_list',
      description: 'List alerts with optional filters.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['new', 'triaging', 'escalated', 'resolved', 'false_positive'] },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
          source_type: { type: 'string' },
          limit: { type: 'string' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'alert_update',
      description: 'Update alert status or details.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          status: { type: 'string', enum: ['new', 'triaging', 'escalated', 'resolved', 'false_positive'] },
          assignee: { type: 'string' },
          notes: { type: 'string' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'alert_escalate',
      description: 'Escalate an alert to a security finding.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'alert_correlate',
      description: 'Run alert correlation to group related alerts.',
      parameters: {
        type: 'object',
        properties: { time_window: { type: 'string', description: 'Minutes (default 15)' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'alert_timeline_create',
      description: 'Create an investigation timeline for an incident.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          alert_ids: { type: 'string', description: 'Comma-separated alert IDs to link' },
        },
        required: ['title'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'alert_timelines',
      description: 'List investigation timelines.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'alert_stats',
      description: 'Get alert center statistics.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOUD SECURITY (cloud-security.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'cloud_accounts',
      description: 'List cloud accounts (AWS/Azure/GCP).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cloud_add_account',
      description: 'Add a cloud account for security monitoring.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          provider: { type: 'string', enum: ['aws', 'azure', 'gcp'] },
          account_id: { type: 'string' },
          access_key: { type: 'string' },
          secret_key: { type: 'string' },
          region: { type: 'string' },
        },
        required: ['name', 'provider', 'account_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cloud_resources',
      description: 'List cloud resources for an account.',
      parameters: {
        type: 'object',
        properties: {
          account_id: { type: 'string' },
          resource_type: { type: 'string', description: 'Filter by type (ec2, s3, rds, etc)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cloud_findings',
      description: 'List cloud security findings/misconfigs.',
      parameters: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'info'] },
          category: { type: 'string', description: 'iam, network, encryption, storage, compute, logging, compliance' },
          status: { type: 'string', enum: ['open', 'remediated', 'suppressed', 'in_progress', 'accepted'] },
          limit: { type: 'string' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cloud_sbom_list',
      description: 'List SBOM (Software Bill of Materials) imports.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cloud_dashboard',
      description: 'Get cloud security dashboard stats.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DETECTION ENGINE (detection-engine.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'detection_list',
      description: 'List detection rules (SIGMA, YARA, KQL, SPL, Snort, Suricata).',
      parameters: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['sigma', 'kql', 'spl', 'yara', 'snort', 'suricata'] },
          status: { type: 'string', enum: ['draft', 'testing', 'active', 'disabled', 'retired'] },
          search: { type: 'string' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detection_create',
      description: 'Create a new detection rule.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          format: { type: 'string', enum: ['sigma', 'kql', 'spl', 'yara', 'snort', 'suricata'] },
          content: { type: 'string', description: 'Rule content/logic' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'informational'] },
          mitre_tactics: { type: 'string', description: 'Comma-separated MITRE ATT&CK tactics' },
          mitre_techniques: { type: 'string', description: 'Comma-separated technique IDs' },
          tags: { type: 'string' },
        },
        required: ['name', 'format', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detection_generate',
      description: 'AI-generate a detection rule from a description.',
      parameters: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'What to detect (e.g., "lateral movement via PsExec")' },
          format: { type: 'string', enum: ['sigma', 'kql', 'spl', 'yara', 'snort', 'suricata'] },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
          log_source: { type: 'string', description: 'Log source type' },
        },
        required: ['description', 'format'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detection_test',
      description: 'Test a detection rule against sample logs.',
      parameters: {
        type: 'object',
        properties: {
          rule_id: { type: 'string' },
          sample_logs: { type: 'string', description: 'Newline-separated log entries to test against' },
        },
        required: ['rule_id', 'sample_logs'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detection_deploy',
      description: 'Deploy a detection rule to a target SIEM.',
      parameters: {
        type: 'object',
        properties: {
          rule_id: { type: 'string' },
          target: { type: 'string', description: 'Deployment target (e.g., splunk, elastic)' },
        },
        required: ['rule_id', 'target'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detection_stats',
      description: 'Get detection engine stats (rules by format, status, coverage).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detection_delete',
      description: 'Delete a detection rule.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TOOLS REGISTRY (tools.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'tools_list',
      description: 'List registered tools in CrowByte.',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Filter by category (recon, exploit, scanner, util)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tools_create',
      description: 'Register a new tool.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          category: { type: 'string', enum: ['recon', 'exploit', 'scanner', 'forensics', 'osint', 'utility', 'custom'] },
          command: { type: 'string', description: 'CLI command template' },
          install_command: { type: 'string' },
          documentation_url: { type: 'string' },
        },
        required: ['name', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tools_execute',
      description: 'Execute a registered tool and log the result.',
      parameters: {
        type: 'object',
        properties: {
          tool_id: { type: 'string' },
          target: { type: 'string' },
          parameters: { type: 'string', description: 'JSON string of parameters' },
        },
        required: ['tool_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'tools_stats',
      description: 'Get tool usage statistics.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ANALYTICS (analytics.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'analytics_activity',
      description: 'Get recent activity logs.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'string' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analytics_summary',
      description: 'Get activity summary for the past N days.',
      parameters: {
        type: 'object',
        properties: { days: { type: 'string', description: 'Number of days (default 7)' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'analytics_log',
      description: 'Log an activity event.',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string' },
          category: { type: 'string' },
          details: { type: 'string' },
        },
        required: ['action'],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CONVERSATIONS (conversationStorage.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'conversation_list',
      description: 'List all saved conversations.',
      parameters: {
        type: 'object',
        properties: { limit: { type: 'string' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'conversation_search',
      description: 'Search conversations by keyword.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'conversation_export',
      description: 'Export conversations as JSON or markdown.',
      parameters: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['json', 'markdown'] },
          conversation_ids: { type: 'string', description: 'Comma-separated IDs (all if empty)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'conversation_stats',
      description: 'Get conversation statistics.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'conversation_delete',
      description: 'Delete a conversation.',
      parameters: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
      },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TRIAGE ENGINE (triage-engine.ts)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'triage_auto',
      description: 'Auto-triage all open findings using AI. Returns verdicts and recommended actions.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'triage_approve',
      description: 'Approve an auto-triage verdict for a finding.',
      parameters: {
        type: 'object',
        properties: { finding_id: { type: 'string' } },
        required: ['finding_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'triage_reject',
      description: 'Reject auto-triage verdict and set human verdict.',
      parameters: {
        type: 'object',
        properties: {
          finding_id: { type: 'string' },
          verdict: { type: 'string', enum: ['confirmed', 'false_positive', 'needs_investigation', 'duplicate', 'resolved'] },
          notes: { type: 'string' },
        },
        required: ['finding_id', 'verdict'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'triage_stats',
      description: 'Get triage engine statistics.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'triage_history',
      description: 'Get triage history for a specific finding.',
      parameters: {
        type: 'object',
        properties: { finding_id: { type: 'string' } },
        required: ['finding_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'triage_playbooks',
      description: 'List available remediation playbooks.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // APP NAVIGATION & STATUS
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'app_navigate',
      description: 'Navigate CrowByte to a page.',
      parameters: {
        type: 'object',
        properties: {
          page: { type: 'string', enum: [
            '/dashboard', '/terminal', '/chat', '/cve', '/knowledge', '/bookmarks',
            '/findings', '/reports', '/redteam', '/fleet', '/network-scanner',
            '/cyber-ops', '/threat-intelligence', '/sentinel', '/missions',
            '/mission-planner', '/agent-builder', '/agent-teams', '/memory',
            '/analytics', '/alert-center', '/cloud-security', '/detection-lab',
            '/connectors', '/tools', '/logs', '/settings',
          ]},
        },
        required: ['page'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'app_status',
      description: 'Get full CrowByte app status — counts across all tables.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DATA DELETE (universal)
  // ═══════════════════════════════════════════════════════════════════════════
  {
    type: 'function',
    function: {
      name: 'data_delete',
      description: 'Delete any record by table and ID.',
      parameters: {
        type: 'object',
        properties: {
          table: { type: 'string', enum: [
            'cves', 'knowledge_base', 'bookmarks', 'findings', 'red_team_ops',
            'red_team_findings', 'endpoints', 'reports', 'network_scans',
            'custom_agents', 'mission_plans', 'alert_sources', 'alerts',
            'investigation_timelines', 'detection_rules', 'tools',
            'threat_iocs', 'sentinel_scans',
          ]},
          id: { type: 'string' },
        },
        required: ['table', 'id'],
      },
    },
  },
];

// ─── Tool Executor Router ───────────────────────────────────────────────────

export async function executeAppTool(name: string, args: Record<string, string>): Promise<string> {
  try {
    // CVE
    if (name === 'cve_db_search') return await toolCveDbSearch(args);
    if (name === 'cve_db_save') return await toolCveDbSave(args);
    // Knowledge
    if (name === 'knowledge_search') return await toolKnowledgeSearch(args);
    if (name === 'knowledge_save') return await toolKnowledgeSave(args);
    // Bookmarks
    if (name === 'bookmarks_search') return await toolBookmarksSearch(args);
    if (name === 'bookmark_save') return await toolBookmarkSave(args);
    // Findings
    if (name === 'findings_search') return await toolFindingsSearch(args);
    if (name === 'finding_save') return await toolFindingSave(args);
    if (name === 'finding_update') return await toolFindingUpdate(args);
    // Red Team
    if (name === 'redteam_list') return await toolRedteamList(args);
    if (name === 'redteam_create') return await toolRedteamCreate(args);
    if (name === 'redteam_update') return await toolRedteamUpdate(args);
    // Fleet
    if (name === 'fleet_status') return await toolFleetStatus(args);
    // Threat Intel
    if (name === 'threat_intel_search') return await toolThreatIntelSearch(args);
    // Reports
    if (name === 'report_list') return await toolReportList(args);
    if (name === 'report_create') return await toolReportCreate(args);
    if (name === 'report_get') return await toolReportGet(args);
    if (name === 'report_update') return await toolReportUpdate(args);
    if (name === 'report_add_finding') return await toolReportAddFinding(args);
    if (name === 'report_auto_populate') return await toolReportAutoPopulate(args);
    if (name === 'report_export') return await toolReportExport(args);
    if (name === 'report_delete') return await toolReportDelete(args);
    // Network Scans
    if (name === 'scan_list') return await toolScanList(args);
    if (name === 'scan_create') return await toolScanCreate(args);
    if (name === 'scan_get') return await toolScanGet(args);
    if (name === 'scan_start') return await toolScanStart(args);
    if (name === 'scan_cancel') return await toolScanCancel(args);
    if (name === 'scan_hosts') return await toolScanHosts(args);
    if (name === 'scan_ports') return await toolScanPorts(args);
    if (name === 'scan_stats') return await toolScanStats();
    if (name === 'scan_delete') return await toolScanDelete(args);
    // Custom Agents
    if (name === 'agent_list') return await toolAgentList(args);
    if (name === 'agent_create') return await toolAgentCreate(args);
    if (name === 'agent_get') return await toolAgentGet(args);
    if (name === 'agent_update') return await toolAgentUpdate(args);
    if (name === 'agent_delete') return await toolAgentDelete(args);
    if (name === 'agent_clone') return await toolAgentClone(args);
    if (name === 'agent_stats') return await toolAgentStats();
    // Sentinel
    if (name === 'sentinel_assets') return await toolSentinelAssets();
    if (name === 'sentinel_add_asset') return await toolSentinelAddAsset(args);
    if (name === 'sentinel_threats') return await toolSentinelThreats(args);
    if (name === 'sentinel_create_threat') return await toolSentinelCreateThreat(args);
    if (name === 'sentinel_update_threat') return await toolSentinelUpdateThreat(args);
    if (name === 'sentinel_scans') return await toolSentinelScans(args);
    if (name === 'sentinel_dashboard') return await toolSentinelDashboard();
    // Missions
    if (name === 'mission_list') return await toolMissionList(args);
    if (name === 'mission_create') return await toolMissionCreate(args);
    if (name === 'mission_get') return await toolMissionGet(args);
    if (name === 'mission_update') return await toolMissionUpdate(args);
    if (name === 'mission_delete') return await toolMissionDelete(args);
    if (name === 'mission_search') return await toolMissionSearch(args);
    if (name === 'mission_stats') return await toolMissionStats();
    // Alert Center
    if (name === 'alert_sources') return await toolAlertSources();
    if (name === 'alert_create_source') return await toolAlertCreateSource(args);
    if (name === 'alert_list') return await toolAlertList(args);
    if (name === 'alert_update') return await toolAlertUpdate(args);
    if (name === 'alert_escalate') return await toolAlertEscalate(args);
    if (name === 'alert_correlate') return await toolAlertCorrelate(args);
    if (name === 'alert_timeline_create') return await toolAlertTimelineCreate(args);
    if (name === 'alert_timelines') return await toolAlertTimelines();
    if (name === 'alert_stats') return await toolAlertStats();
    // Cloud Security
    if (name === 'cloud_accounts') return await toolCloudAccounts();
    if (name === 'cloud_add_account') return await toolCloudAddAccount(args);
    if (name === 'cloud_resources') return await toolCloudResources(args);
    if (name === 'cloud_findings') return await toolCloudFindings(args);
    if (name === 'cloud_sbom_list') return await toolCloudSbomList();
    if (name === 'cloud_dashboard') return await toolCloudDashboard();
    // Detection Engine
    if (name === 'detection_list') return await toolDetectionList(args);
    if (name === 'detection_create') return await toolDetectionCreate(args);
    if (name === 'detection_generate') return await toolDetectionGenerate(args);
    if (name === 'detection_test') return await toolDetectionTest(args);
    if (name === 'detection_deploy') return await toolDetectionDeploy(args);
    if (name === 'detection_stats') return await toolDetectionStats();
    if (name === 'detection_delete') return await toolDetectionDelete(args);
    // Tools Registry
    if (name === 'tools_list') return await toolToolsList(args);
    if (name === 'tools_create') return await toolToolsCreate(args);
    if (name === 'tools_execute') return await toolToolsExecute(args);
    if (name === 'tools_stats') return await toolToolsStats();
    // Analytics
    if (name === 'analytics_activity') return await toolAnalyticsActivity(args);
    if (name === 'analytics_summary') return await toolAnalyticsSummary(args);
    if (name === 'analytics_log') return await toolAnalyticsLog(args);
    // Conversations
    if (name === 'conversation_list') return await toolConversationList(args);
    if (name === 'conversation_search') return await toolConversationSearch(args);
    if (name === 'conversation_export') return await toolConversationExport(args);
    if (name === 'conversation_stats') return await toolConversationStats();
    if (name === 'conversation_delete') return await toolConversationDelete(args);
    // Triage
    if (name === 'triage_auto') return await toolTriageAuto();
    if (name === 'triage_approve') return await toolTriageApprove(args);
    if (name === 'triage_reject') return await toolTriageReject(args);
    if (name === 'triage_stats') return await toolTriageStats();
    if (name === 'triage_history') return await toolTriageHistory(args);
    if (name === 'triage_playbooks') return await toolTriagePlaybooks();
    // App Control
    if (name === 'app_navigate') return toolAppNavigate(args);
    if (name === 'app_status') return await toolAppStatus();
    if (name === 'data_delete') return await toolDataDelete(args);

    return `Unknown app tool: ${name}`;
  } catch (e: any) {
    return `Error: ${e.message || 'App tool execution failed'}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOOL IMPLEMENTATIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── CVE UilDatabase ────────────────────────────────────────────────────────────

async function toolCveDbSearch(args: Record<string, string>): Promise<string> {
  const supabase = await getSupabase();
  const limit = parseInt(args.limit) || 10;
  let query = supabase.from('cves').select('*').order('cvss_score', { ascending: false }).limit(limit);
  if (args.severity) query = query.eq('severity', args.severity);
  if (args.query) query = query.or(`cve_id.ilike.%${pgOr(args.query)}%,description.ilike.%${pgOr(args.query)}%`);
  const { data, error } = await query;
  if (error) return `Error: ${error.message}`;
  if (!data?.length) return 'No CVEs found.';
  return data.map((c: any) =>
    `${c.cve_id} | ${c.severity} | CVSS: ${c.cvss_score || 'N/A'} | ${truncate(c.description || '')}`
  ).join('\n');
}

async function toolCveDbSave(args: Record<string, string>): Promise<string> {
  const supabase = await getSupabase();
  const userId = await getUserId();
  const { data, error } = await supabase.from('cves').upsert({
    cve_id: args.cve_id, description: args.description, severity: args.severity,
    cvss_score: args.cvss_score ? parseFloat(args.cvss_score) : null,
    products: csvToArray(args.products), cwe: args.cwe || null, user_id: userId,
  }, { onConflict: 'cve_id' }).select().single();
  if (error) return `Error: ${error.message}`;
  return `[+] CVE saved: ${data.cve_id} (${data.severity}, CVSS: ${data.cvss_score || 'N/A'})`;
}

// ─── Knowledge Base ──────────────────────────────────────────────────────────

async function toolKnowledgeSearch(args: Record<string, string>): Promise<string> {
  const supabase = await getSupabase();
  const userId = await getUserId();
  const limit = parseInt(args.limit) || 10;
  let query = supabase.from('knowledge_base').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(limit);
  if (args.category) query = query.eq('category', args.category);
  if (args.tags) query = query.contains('tags', csvToArray(args.tags));
  if (args.query) query = query.or(`title.ilike.%${pgOr(args.query)}%,content.ilike.%${pgOr(args.query)}%,summary.ilike.%${pgOr(args.query)}%`);
  const { data, error } = await query;
  if (error) return `Error: ${error.message}`;
  if (!data?.length) return 'No knowledge entries found.';
  return data.map((k: any) =>
    `[${k.category || 'uncategorized'}] ${k.title}\n  ID: ${k.id} | Tags: ${(k.tags || []).join(', ') || 'none'}\n  ${truncate(k.content || '', 150)}`
  ).join('\n\n');
}

async function toolKnowledgeSave(args: Record<string, string>): Promise<string> {
  const supabase = await getSupabase();
  const userId = await getUserId();
  const { data, error } = await supabase.from('knowledge_base').insert({
    user_id: userId, title: args.title, content: args.content,
    category: args.category || 'General', tags: csvToArray(args.tags),
    source_url: args.source_url || null, importance: parseInt(args.importance) || 3,
  }).select().single();
  if (error) return `Error: ${error.message}`;
  return `[+] Saved: "${data.title}" [${data.category}] (ID: ${data.id})`;
}

// ─── Bookmarks ───────────────────────────────────────────────────────────────

async function toolBookmarksSearch(args: Record<string, string>): Promise<string> {
  const supabase = await getSupabase();
  const limit = parseInt(args.limit) || 10;
  let query = supabase.from('bookmarks').select('*').order('created_at', { ascending: false }).limit(limit);
  if (args.category) query = query.eq('category', args.category);
  if (args.query) query = query.or(`title.ilike.%${pgOr(args.query)}%,url.ilike.%${pgOr(args.query)}%,description.ilike.%${pgOr(args.query)}%`);
  const { data, error } = await query;
  if (error) return `Error: ${error.message}`;
  if (!data?.length) return 'No bookmarks found.';
  return data.map((b: any) =>
    `[${b.category}] ${b.title}\n  ${b.url}\n  ${b.description ? truncate(b.description, 100) : ''}`
  ).join('\n\n');
}

async function toolBookmarkSave(args: Record<string, string>): Promise<string> {
  const supabase = await getSupabase();
  const userId = await getUserId();
  const { data, error } = await supabase.from('bookmarks').insert({
    user_id: userId, title: args.title, url: args.url,
    description: args.description || null, category: args.category || 'General',
    tags: csvToArray(args.tags),
  }).select().single();
  if (error) return `Error: ${error.message}`;
  return `[+] Bookmark saved: "${data.title}" → ${data.url}`;
}

// ─── Findings ────────────────────────────────────────────────────────────────

async function toolFindingsSearch(args: Record<string, string>): Promise<string> {
  const supabase = await getSupabase();
  const userId = await getUserId();
  const limit = parseInt(args.limit) || 10;
  let query = supabase.from('findings').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false }).limit(limit);
  if (args.severity) query = query.eq('severity', args.severity);
  if (args.status) query = query.eq('status', args.status);
  if (args.source) query = query.eq('source', args.source);
  if (args.query) query = query.or(`title.ilike.%${pgOr(args.query)}%,description.ilike.%${pgOr(args.query)}%,target_host.ilike.%${pgOr(args.query)}%`);
  const { data, error } = await query;
  if (error) return `Error: ${error.message}`;
  if (!data?.length) return 'No findings found.';
  return data.map((f: any) =>
    `[${f.severity?.toUpperCase()}] ${f.title}\n  Target: ${f.target_host}${f.target_port ? ':' + f.target_port : ''}\n  Source: ${f.source} | Status: ${f.status} | ID: ${f.id}`
  ).join('\n\n');
}

async function toolFindingSave(args: Record<string, string>): Promise<string> {
  const supabase = await getSupabase();
  const userId = await getUserId();
  const { data, error } = await supabase.from('findings').insert({
    user_id: userId, title: args.title, description: args.description || null,
    target_host: args.target_host, target_port: args.target_port ? parseInt(args.target_port) : null,
    target_url: args.target_url || null, severity: args.severity,
    finding_type: args.finding_type || 'vuln', source: args.source || 'manual',
    status: 'open', cve_ids: csvToArray(args.cve_ids), cwe_ids: csvToArray(args.cwe_ids),
    tags: csvToArray(args.tags), included_in_report: false,
  }).select().single();
  if (error) return `Error: ${error.message}`;
  return `[+] Finding saved: "${data.title}" [${data.severity}] → ${data.target_host} (ID: ${data.id})`;
}

async function toolFindingUpdate(args: Record<string, string>): Promise<string> {
  const supabase = await getSupabase();
  const updates: any = {};
  if (args.status) updates.status = args.status;
  if (args.severity) updates.severity = args.severity;
  if (args.notes) updates.remediation_notes = args.notes;
  const { error } = await supabase.from('findings').update(updates).eq('id', args.id);
  if (error) return `Error: ${error.message}`;
  return `[+] Finding ${args.id} updated`;
}

// ─── Red Team ────────────────────────────────────────────────────────────────

async function toolRedteamList(args: Record<string, string>): Promise<string> {
  const supabase = await getSupabase();
  const limit = parseInt(args.limit) || 10;
  let query = supabase.from('red_team_ops').select('*').order('created_at', { ascending: false }).limit(limit);
  if (args.status) query = query.eq('status', args.status);
  const { data, error } = await query;
  if (error) return `Error: ${error.message}`;
  if (!data?.length) return 'No red team operations found.';
  return data.map((op: any) =>
    `[${op.status?.toUpperCase()}] ${op.name}\n  Target: ${op.target} | Type: ${op.operation_type}\n  Findings: ${op.total_findings || 0} (C:${op.critical_findings||0} H:${op.high_findings||0})\n  ID: ${op.id}`
  ).join('\n\n');
}

async function toolRedteamCreate(args: Record<string, string>): Promise<string> {
  const supabase = await getSupabase();
  const userId = await getUserId();
  const { data, error } = await supabase.from('red_team_ops').insert({
    user_id: userId, name: args.name, target: args.target,
    operation_type: args.operation_type, description: args.description || null,
    status: 'planned', progress: 0, scope: [], exclusions: [],
    tags: csvToArray(args.tags), rules_of_engagement: args.rules_of_engagement || null,
    total_findings: 0, critical_findings: 0, high_findings: 0, medium_findings: 0, low_findings: 0, info_findings: 0,
  }).select().single();
  if (error) return `Error: ${error.message}`;
  return `[+] Op created: "${data.name}" → ${data.target} (ID: ${data.id})`;
}

async function toolRedteamUpdate(args: Record<string, string>): Promise<string> {
  const supabase = await getSupabase();
  const updates: any = {};
  if (args.status) updates.status = args.status;
  if (args.progress) updates.progress = parseInt(args.progress);
  const { error } = await supabase.from('red_team_ops').update(updates).eq('id', args.id);
  if (error) return `Error: ${error.message}`;
  return `[+] Op ${args.id} updated`;
}

// ─── Fleet ───────────────────────────────────────────────────────────────────

async function toolFleetStatus(args: Record<string, string>): Promise<string> {
  const supabase = await getSupabase();
  const userId = await getUserId();
  let query = supabase.from('endpoints').select('*').eq('user_id', userId).order('status');
  if (args.status) query = query.eq('status', args.status);
  const { data, error } = await query;
  if (error) return `Error: ${error.message}`;
  if (!data?.length) return 'No fleet endpoints registered.';
  return data.map((e: any) =>
    `[${e.status?.toUpperCase()}] ${e.hostname} (${e.ip_address})\n  OS: ${e.os_name} | CPU: ${e.cpu_usage}% | RAM: ${e.memory_usage}% | Disk: ${e.disk_usage}%\n  Threats: ${e.threats_detected || 0}${e.is_current_device ? ' [THIS MACHINE]' : ''}`
  ).join('\n\n');
}

// ─── Threat Intel ────────────────────────────────────────────────────────────

async function toolThreatIntelSearch(args: Record<string, string>): Promise<string> {
  const supabase = await getSupabase();
  const limit = parseInt(args.limit) || 20;
  let query = supabase.from('threat_iocs').select('*').order('last_seen', { ascending: false }).limit(limit);
  if (args.ioc_type) query = query.eq('ioc_type', args.ioc_type);
  if (args.severity) query = query.eq('severity', args.severity);
  if (args.query) query = query.ilike('value', `%${args.query}%`);
  const { data, error } = await query;
  if (error) return `Error: ${error.message}`;
  if (!data?.length) return 'No IOCs found.';
  return data.map((ioc: any) =>
    `[${ioc.severity?.toUpperCase()}] ${ioc.ioc_type}: ${ioc.value}\n  Feed: ${ioc.feed_name} | Confidence: ${ioc.confidence}%`
  ).join('\n\n');
}

// ─── Reports ─────────────────────────────────────────────────────────────────

async function getReportGenerator() {
  const mod = await import('./report-generator');
  return mod.reportGenerator;
}

async function toolReportList(args: Record<string, string>): Promise<string> {
  const rg = await getReportGenerator();
  const reports = await rg.getAll();
  if (!reports.length) return 'No reports found.';
  return reports.map((r: any) =>
    `[${r.status?.toUpperCase()}] ${r.title}\n  Type: ${r.report_type} | Template: ${r.template}\n  Findings: ${r.finding_ids?.length || 0} | ID: ${r.id}`
  ).join('\n\n');
}

async function toolReportCreate(args: Record<string, string>): Promise<string> {
  const rg = await getReportGenerator();
  const report = await rg.create({
    title: args.title, report_type: args.report_type as any,
    template: (args.template || 'custom') as any,
    target: args.target, executive_summary: args.executive_summary,
    scope: csvToArray(args.scope),
  });
  return `[+] Report created: "${report.title}" [${report.report_type}] (ID: ${report.id})`;
}

async function toolReportGet(args: Record<string, string>): Promise<string> {
  const rg = await getReportGenerator();
  const r = await rg.getById(args.id);
  return [
    `Report: ${r.title}`,
    `Type: ${r.report_type} | Template: ${r.template} | Status: ${r.status}`,
    `Target: ${r.target || 'N/A'}`,
    `Findings: ${r.finding_ids?.length || 0}`,
    `Executive Summary: ${truncate(r.executive_summary || 'None', 300)}`,
    `ID: ${r.id}`,
  ].join('\n');
}

async function toolReportUpdate(args: Record<string, string>): Promise<string> {
  const rg = await getReportGenerator();
  const updates: any = {};
  if (args.title) updates.title = args.title;
  if (args.status) updates.status = args.status;
  if (args.executive_summary) updates.executive_summary = args.executive_summary;
  await rg.update(args.id, updates);
  return `[+] Report ${args.id} updated`;
}

async function toolReportAddFinding(args: Record<string, string>): Promise<string> {
  const rg = await getReportGenerator();
  await rg.addFinding(args.report_id, args.finding_id);
  return `[+] Finding ${args.finding_id} added to report ${args.report_id}`;
}

async function toolReportAutoPopulate(args: Record<string, string>): Promise<string> {
  const rg = await getReportGenerator();
  const count = await rg.autoPopulate(args.report_id, args.target);
  return `[+] Auto-populated ${count} findings into report`;
}

async function toolReportExport(args: Record<string, string>): Promise<string> {
  const rg = await getReportGenerator();
  const format = args.format as any;
  let result: any;
  switch (format) {
    case 'markdown': result = await rg.exportMarkdown(args.report_id); break;
    case 'html': result = await rg.exportHTML(args.report_id); break;
    case 'pdf_html': result = await rg.exportPdfHTML(args.report_id); break;
    case 'hackerone_json': result = await rg.exportHackerOneJSON(args.report_id); break;
    case 'bugcrowd_json': result = await rg.exportBugcrowdJSON(args.report_id); break;
    case 'json': result = await rg.exportJSON(args.report_id); break;
    default: return `Unknown format: ${format}`;
  }
  return typeof result === 'string' ? truncate(result, 3000) : truncate(jsonSafe(result), 3000);
}

async function toolReportDelete(args: Record<string, string>): Promise<string> {
  const rg = await getReportGenerator();
  await rg.delete(args.id);
  return `[+] Report ${args.id} deleted`;
}

// ─── Network Scans ───────────────────────────────────────────────────────────

async function getNetworkScans() {
  const mod = await import('./network-scans');
  return mod.networkScansService;
}

async function toolScanList(args: Record<string, string>): Promise<string> {
  const ns = await getNetworkScans();
  const scans = args.status ? await ns.getScansByStatus(args.status as any) : await ns.getScans();
  if (!scans.length) return 'No network scans found.';
  return scans.map((s: any) =>
    `[${s.status?.toUpperCase()}] ${s.name}\n  Target: ${s.target} | Type: ${s.scan_type}\n  Hosts: ${s.hosts_up || 0}/${s.hosts_total || 0} | Ports: ${s.open_ports || 0} | ID: ${s.id}`
  ).join('\n\n');
}

async function toolScanCreate(args: Record<string, string>): Promise<string> {
  const ns = await getNetworkScans();
  const scan = await ns.createScan({
    name: args.name, target: args.target, scan_type: args.scan_type as any,
    ports: args.ports, options: args.options,
  });
  return `[+] Scan created: "${scan.name}" → ${scan.target} (ID: ${scan.id})`;
}

async function toolScanGet(args: Record<string, string>): Promise<string> {
  const ns = await getNetworkScans();
  const s = await ns.getScan(args.id);
  const hosts = await ns.getScanHosts(args.id);
  return [
    `Scan: ${s.name} [${s.status}]`,
    `Target: ${s.target} | Type: ${s.scan_type}`,
    `Hosts: ${s.hosts_up}/${s.hosts_total} up | Ports: ${s.open_ports} open`,
    '',
    ...hosts.map((h: any) => `  ${h.ip_address} (${h.hostname || 'N/A'}) - ${h.status} - ${h.os_name || 'unknown OS'} - ${h.open_ports || 0} ports`),
  ].join('\n');
}

async function toolScanStart(args: Record<string, string>): Promise<string> {
  const ns = await getNetworkScans();
  await ns.startScan(args.id);
  return `[+] Scan ${args.id} started`;
}

async function toolScanCancel(args: Record<string, string>): Promise<string> {
  const ns = await getNetworkScans();
  await ns.cancelScan(args.id);
  return `[+] Scan ${args.id} cancelled`;
}

async function toolScanHosts(args: Record<string, string>): Promise<string> {
  const ns = await getNetworkScans();
  const hosts = await ns.getScanHosts(args.scan_id);
  if (!hosts.length) return 'No hosts discovered.';
  return hosts.map((h: any) =>
    `${h.ip_address} | ${h.hostname || 'N/A'} | ${h.status} | OS: ${h.os_name || '?'} | Ports: ${h.open_ports || 0}`
  ).join('\n');
}

async function toolScanPorts(args: Record<string, string>): Promise<string> {
  const ns = await getNetworkScans();
  const ports = await ns.getScanPorts(args.scan_id, args.host_id);
  if (!ports.length) return 'No ports discovered.';
  return ports.map((p: any) =>
    `${p.port}/${p.protocol} | ${p.state} | ${p.service_name || '?'} ${p.service_version || ''}`
  ).join('\n');
}

async function toolScanStats(): Promise<string> {
  const ns = await getNetworkScans();
  const stats = await ns.getScanStats();
  return jsonSafe(stats);
}

async function toolScanDelete(args: Record<string, string>): Promise<string> {
  const ns = await getNetworkScans();
  await ns.deleteScan(args.id);
  return `[+] Scan ${args.id} deleted`;
}

// ─── Custom Agents ───────────────────────────────────────────────────────────

async function getCustomAgents() {
  const mod = await import('./custom-agents');
  return mod.customAgentsService;
}

async function toolAgentList(args: Record<string, string>): Promise<string> {
  const svc = await getCustomAgents();
  const agents = args.category ? await svc.getAgentsByCategory(args.category) : await svc.getAgents();
  if (!agents.length) return 'No custom agents found.';
  return agents.map((a: any) =>
    `[${a.status?.toUpperCase()}] ${a.name}\n  ${truncate(a.description || '', 80)}\n  Model: ${a.model} | Category: ${a.category} | ID: ${a.id}`
  ).join('\n\n');
}

async function toolAgentCreate(args: Record<string, string>): Promise<string> {
  const svc = await getCustomAgents();
  const agent = await svc.createAgent({
    name: args.name, description: args.description || '',
    instructions: args.instructions, model: args.model || 'qwen/qwen3-coder:free',
    category: args.category || 'custom',
    capabilities: csvToArray(args.capabilities),
    temperature: args.temperature ? parseFloat(args.temperature) : 0.7,
  });
  return `[+] Agent created: "${agent.name}" (ID: ${agent.id})`;
}

async function toolAgentGet(args: Record<string, string>): Promise<string> {
  const svc = await getCustomAgents();
  const a = await svc.getAgent(args.id);
  return [
    `Agent: ${a.name} [${a.status}]`,
    `Model: ${a.model} | Category: ${a.category}`,
    `Capabilities: ${(a.capabilities || []).join(', ')}`,
    `Instructions: ${truncate(a.instructions || '', 300)}`,
    `ID: ${a.id}`,
  ].join('\n');
}

async function toolAgentUpdate(args: Record<string, string>): Promise<string> {
  const svc = await getCustomAgents();
  if (args.status) {
    await svc.updateAgentStatus(args.id, args.status as any);
  }
  const updates: any = {};
  if (args.name) updates.name = args.name;
  if (args.instructions) updates.instructions = args.instructions;
  if (Object.keys(updates).length > 0) await svc.updateAgent(args.id, updates);
  return `[+] Agent ${args.id} updated`;
}

async function toolAgentDelete(args: Record<string, string>): Promise<string> {
  const svc = await getCustomAgents();
  await svc.deleteAgent(args.id);
  return `[+] Agent ${args.id} deleted`;
}

async function toolAgentClone(args: Record<string, string>): Promise<string> {
  const svc = await getCustomAgents();
  const clone = await svc.cloneAgent(args.id, args.new_name);
  return `[+] Agent cloned: "${clone.name}" (ID: ${clone.id})`;
}

async function toolAgentStats(): Promise<string> {
  const svc = await getCustomAgents();
  const stats = await svc.getAgentStats();
  return jsonSafe(stats);
}

// ─── Sentinel ────────────────────────────────────────────────────────────────

async function getSentinel() {
  const mod = await import('./sentinel');
  return mod.sentinelService;
}

async function toolSentinelAssets(): Promise<string> {
  const svc = await getSentinel();
  const assets = await svc.getAssets();
  if (!assets.length) return 'No infrastructure assets monitored.';
  return assets.map((a: any) =>
    `[${a.status?.toUpperCase()}] ${a.hostname} (${a.ip_address})\n  Type: ${a.asset_type} | OS: ${a.os || 'N/A'} | Criticality: ${a.criticality}\n  ID: ${a.id}`
  ).join('\n\n');
}

async function toolSentinelAddAsset(args: Record<string, string>): Promise<string> {
  const svc = await getSentinel();
  const asset = await svc.addAsset({
    hostname: args.hostname, ip_address: args.ip_address,
    asset_type: args.asset_type as any, os: args.os,
    environment: (args.environment || 'production') as any,
    criticality: (args.criticality || 'medium') as any,
    status: 'active', services: [], software: [], tags: [],
  });
  return `[+] Asset added: ${asset.hostname} (ID: ${asset.id})`;
}

async function toolSentinelThreats(args: Record<string, string>): Promise<string> {
  const svc = await getSentinel();
  const threats = await svc.getThreats(args.status as any);
  if (!threats.length) return 'No threats found.';
  return threats.map((t: any) =>
    `[${t.severity?.toUpperCase()}] ${t.title}\n  Type: ${t.threat_type} | Status: ${t.status}\n  ${truncate(t.description || '', 120)}\n  ID: ${t.id}`
  ).join('\n\n');
}

async function toolSentinelCreateThreat(args: Record<string, string>): Promise<string> {
  const svc = await getSentinel();
  const threat = await svc.createThreat({
    title: args.title, description: args.description || '',
    severity: args.severity as any, threat_type: args.threat_type || 'unknown',
    status: 'active', affected_asset_id: args.affected_asset_id || null,
    source: 'manual', confidence: 80, ioc_values: csvToArray(args.ioc_values),
    actions: [], mitre_tactics: [], mitre_techniques: [],
  } as any);
  return `[+] Threat created: "${threat.title}" (ID: ${threat.id})`;
}

async function toolSentinelUpdateThreat(args: Record<string, string>): Promise<string> {
  const svc = await getSentinel();
  await svc.updateThreatStatus(args.id, args.status as any);
  return `[+] Threat ${args.id} → ${args.status}`;
}

async function toolSentinelScans(args: Record<string, string>): Promise<string> {
  const svc = await getSentinel();
  const scans = await svc.getScans(parseInt(args.limit) || 20);
  if (!scans.length) return 'No Sentinel scans.';
  return scans.map((s: any) =>
    `[${s.status?.toUpperCase()}] ${s.scan_type} scan\n  Target: ${s.target || 'all'} | Findings: ${s.findings_count || 0} | ${s.created_at}`
  ).join('\n\n');
}

async function toolSentinelDashboard(): Promise<string> {
  const svc = await getSentinel();
  const stats = await svc.getDashboardStats();
  return jsonSafe(stats);
}

// ─── Mission Plans ───────────────────────────────────────────────────────────

async function getMissionPlans() {
  const mod = await import('./mission-plans');
  return mod.missionPlansService;
}

async function toolMissionList(args: Record<string, string>): Promise<string> {
  const svc = await getMissionPlans();
  let plans;
  if (args.type) plans = await svc.getPlansByType(args.type as any);
  else if (args.status === 'active') plans = await svc.getActivePlans();
  else plans = await svc.getPlans();
  if (!plans.length) return 'No mission plans found.';
  return plans.map((p: any) =>
    `[${p.status?.toUpperCase()}] ${p.name}\n  Type: ${p.type} | Priority: ${p.priority} | Progress: ${p.progress || 0}%\n  ID: ${p.id}`
  ).join('\n\n');
}

async function toolMissionCreate(args: Record<string, string>): Promise<string> {
  const svc = await getMissionPlans();
  const plan = await svc.createPlan({
    name: args.name, description: args.description || '',
    type: args.type as any, priority: (args.priority || 'medium') as any,
    target: args.target, objectives: csvToArray(args.objectives),
  });
  return `[+] Mission created: "${plan.name}" [${plan.type}] (ID: ${plan.id})`;
}

async function toolMissionGet(args: Record<string, string>): Promise<string> {
  const svc = await getMissionPlans();
  const p = await svc.getPlan(args.id);
  if (!p) return 'Mission not found.';
  return [
    `Mission: ${p.name} [${p.status}]`,
    `Type: ${p.type} | Priority: ${p.priority} | Progress: ${p.progress || 0}%`,
    `Target: ${p.target || 'N/A'}`,
    `Objectives: ${(p.objectives || []).join(', ') || 'none'}`,
    `AI Assessment: ${truncate(p.ai_assessment || 'none', 200)}`,
    `ID: ${p.id}`,
  ].join('\n');
}

async function toolMissionUpdate(args: Record<string, string>): Promise<string> {
  const svc = await getMissionPlans();
  if (args.status) await svc.updateStatus(args.id, args.status as any);
  const updates: any = {};
  if (args.progress) updates.progress = parseInt(args.progress);
  if (args.notes) updates.notes = args.notes;
  if (Object.keys(updates).length > 0) await svc.updatePlan(args.id, updates);
  return `[+] Mission ${args.id} updated`;
}

async function toolMissionDelete(args: Record<string, string>): Promise<string> {
  const svc = await getMissionPlans();
  await svc.deletePlan(args.id);
  return `[+] Mission ${args.id} deleted`;
}

async function toolMissionSearch(args: Record<string, string>): Promise<string> {
  const svc = await getMissionPlans();
  const plans = await svc.searchPlans(args.query);
  if (!plans.length) return 'No missions match query.';
  return plans.map((p: any) => `[${p.status}] ${p.name} | ${p.type} | ID: ${p.id}`).join('\n');
}

async function toolMissionStats(): Promise<string> {
  const svc = await getMissionPlans();
  const stats = await svc.getStats();
  return jsonSafe(stats);
}

// ─── Alert Center ────────────────────────────────────────────────────────────

async function getAlertIngestion() {
  const mod = await import('./alert-ingestion');
  return mod.alertIngestion;
}

async function toolAlertSources(): Promise<string> {
  const svc = await getAlertIngestion();
  const sources = await svc.getSources();
  if (!sources.length) return 'No alert sources configured.';
  return sources.map((s: any) =>
    `[${s.status?.toUpperCase()}] ${s.name} (${s.source_type})\n  Alerts: ${s.alert_count || 0} | Last sync: ${s.last_sync_at || 'never'}\n  ID: ${s.id}`
  ).join('\n\n');
}

async function toolAlertCreateSource(args: Record<string, string>): Promise<string> {
  const svc = await getAlertIngestion();
  const source = await svc.createSource({
    name: args.name, source_type: args.source_type as any,
    connection_config: { url: args.url || '', api_key: args.api_key || '', headers: {} },
  });
  return `[+] Alert source created: "${source.name}" [${source.source_type}] (ID: ${source.id})`;
}

async function toolAlertList(args: Record<string, string>): Promise<string> {
  const svc = await getAlertIngestion();
  const filters: any = {};
  if (args.status) filters.status = args.status;
  if (args.severity) filters.severity = args.severity;
  if (args.source_type) filters.source_type = args.source_type;
  if (args.limit) filters.limit = parseInt(args.limit);
  const alerts = await svc.getAlerts(Object.keys(filters).length ? filters : undefined);
  if (!alerts.length) return 'No alerts found.';
  return alerts.map((a: any) =>
    `[${a.severity?.toUpperCase()}] ${a.title}\n  Source: ${a.source_type} | Status: ${a.status}\n  ${truncate(a.description || '', 100)}\n  ID: ${a.id}`
  ).join('\n\n');
}

async function toolAlertUpdate(args: Record<string, string>): Promise<string> {
  const svc = await getAlertIngestion();
  const updates: any = {};
  if (args.status) updates.status = args.status;
  if (args.assignee) updates.assignee = args.assignee;
  if (args.notes) updates.notes = args.notes;
  await svc.updateAlert(args.id, updates);
  return `[+] Alert ${args.id} updated`;
}

async function toolAlertEscalate(args: Record<string, string>): Promise<string> {
  const svc = await getAlertIngestion();
  const findingId = await svc.escalateToFinding(args.id);
  return `[+] Alert ${args.id} escalated → Finding ${findingId}`;
}

async function toolAlertCorrelate(args: Record<string, string>): Promise<string> {
  const svc = await getAlertIngestion();
  const groups = await svc.correlateAlerts(parseInt(args.time_window) || 15);
  if (!groups.length) return 'No correlated alert groups found.';
  return groups.map((g: any) =>
    `Group: ${g.key || 'unknown'}\n  Alerts: ${g.alert_ids?.length || 0} | Severity: ${g.severity}`
  ).join('\n\n');
}

async function toolAlertTimelineCreate(args: Record<string, string>): Promise<string> {
  const svc = await getAlertIngestion();
  const tl = await svc.createTimeline({
    title: args.title, description: args.description || '',
    alert_ids: csvToArray(args.alert_ids),
  });
  return `[+] Timeline created: "${tl.title}" (ID: ${tl.id})`;
}

async function toolAlertTimelines(): Promise<string> {
  const svc = await getAlertIngestion();
  const timelines = await svc.getTimelines();
  if (!timelines.length) return 'No investigation timelines.';
  return timelines.map((t: any) =>
    `[${t.status?.toUpperCase()}] ${t.title}\n  Events: ${t.events?.length || 0} | Created: ${t.created_at}\n  ID: ${t.id}`
  ).join('\n\n');
}

async function toolAlertStats(): Promise<string> {
  const svc = await getAlertIngestion();
  const stats = await svc.getStats();
  return jsonSafe(stats);
}

// ─── Cloud Security ──────────────────────────────────────────────────────────

async function toolCloudAccounts(): Promise<string> {
  const userId = await getUserId();
  const { getCloudAccounts } = await import('./cloud-security');
  const accounts = await getCloudAccounts(userId);
  if (!accounts.length) return 'No cloud accounts configured.';
  return accounts.map((a: any) =>
    `[${a.status?.toUpperCase()}] ${a.name} (${a.provider})\n  Account: ${a.account_id} | Region: ${a.region || 'N/A'}\n  Resources: ${a.resource_count || 0} | Findings: ${a.finding_count || 0}\n  ID: ${a.id}`
  ).join('\n\n');
}

async function toolCloudAddAccount(args: Record<string, string>): Promise<string> {
  const userId = await getUserId();
  const { createCloudAccount } = await import('./cloud-security');
  const account = await createCloudAccount({
    user_id: userId, name: args.name, provider: args.provider as any,
    account_id: args.account_id, region: args.region || 'us-east-1',
    credentials: { access_key: args.access_key || '', secret_key: args.secret_key || '' },
    status: 'connected',
  } as any);
  return `[+] Cloud account added: "${account.name}" [${account.provider}] (ID: ${account.id})`;
}

async function toolCloudResources(args: Record<string, string>): Promise<string> {
  const userId = await getUserId();
  const { getCloudResources } = await import('./cloud-security');
  const filters: any = { userId };
  if (args.account_id) filters.accountId = args.account_id;
  if (args.resource_type) filters.resourceType = args.resource_type;
  const resources = await getCloudResources(userId, args.account_id, args.resource_type);
  if (!resources.length) return 'No cloud resources found.';
  return resources.map((r: any) =>
    `${r.resource_type}: ${r.name || r.resource_id}\n  Region: ${r.region} | Account: ${r.account_id}\n  Tags: ${jsonSafe(r.tags || {})}`
  ).join('\n\n');
}

async function toolCloudFindings(args: Record<string, string>): Promise<string> {
  const userId = await getUserId();
  const { getCloudFindings } = await import('./cloud-security');
  const findings = await getCloudFindings(userId, {
    severity: args.severity as any, category: args.category as any,
    status: args.status as any, limit: parseInt(args.limit) || 20,
  });
  if (!findings.length) return 'No cloud findings.';
  return findings.map((f: any) =>
    `[${f.severity?.toUpperCase()}] ${f.title}\n  Category: ${f.category} | Status: ${f.status}\n  Resource: ${f.resource_id} | ${truncate(f.description || '', 100)}\n  ID: ${f.id}`
  ).join('\n\n');
}

async function toolCloudSbomList(): Promise<string> {
  const userId = await getUserId();
  const { getSBOMImports } = await import('./cloud-security');
  const sboms = await getSBOMImports(userId);
  if (!sboms.length) return 'No SBOM imports.';
  return sboms.map((s: any) =>
    `${s.name} (${s.format})\n  Components: ${s.component_count || 0} | Vulns: ${s.vulnerability_count || 0}\n  ID: ${s.id}`
  ).join('\n\n');
}

async function toolCloudDashboard(): Promise<string> {
  const userId = await getUserId();
  const { getCloudDashboardStats } = await import('./cloud-security');
  const stats = await getCloudDashboardStats(userId);
  return jsonSafe(stats);
}

// ─── Detection Engine ────────────────────────────────────────────────────────

async function getDetectionEngine() {
  const mod = await import('./detection-engine');
  return mod.detectionEngine;
}

async function toolDetectionList(args: Record<string, string>): Promise<string> {
  const de = await getDetectionEngine();
  const rules = await de.getAll({
    format: args.format as any, status: args.status as any, search: args.search,
  });
  if (!rules.length) return 'No detection rules found.';
  return rules.map((r: any) =>
    `[${r.status?.toUpperCase()}] ${r.name}\n  Format: ${r.format} | Severity: ${r.severity}\n  MITRE: ${(r.mitre_tactics || []).join(', ') || 'N/A'}\n  ID: ${r.id}`
  ).join('\n\n');
}

async function toolDetectionCreate(args: Record<string, string>): Promise<string> {
  const de = await getDetectionEngine();
  const rule = await de.create({
    name: args.name, description: args.description || '',
    format: args.format as any, content: args.content,
    severity: (args.severity || 'medium') as any,
    mitre_tactics: csvToArray(args.mitre_tactics),
    mitre_techniques: csvToArray(args.mitre_techniques),
    tags: csvToArray(args.tags),
  });
  return `[+] Detection rule created: "${rule.name}" [${rule.format}] (ID: ${rule.id})`;
}

async function toolDetectionGenerate(args: Record<string, string>): Promise<string> {
  const de = await getDetectionEngine();
  const rule = await de.generateAndSave({
    description: args.description, format: args.format as any,
    severity: (args.severity || 'medium') as any, log_source: args.log_source,
  });
  return `[+] AI-generated rule: "${rule.name}" [${rule.format}]\n\n${truncate(rule.content || '', 1000)}\n\nID: ${rule.id}`;
}

async function toolDetectionTest(args: Record<string, string>): Promise<string> {
  const de = await getDetectionEngine();
  const logs = args.sample_logs.split('\n').filter(Boolean);
  const results = await de.testRule(args.rule_id, logs);
  return [
    `Test Results for rule ${args.rule_id}:`,
    `Matches: ${results.matches} / ${results.total_logs}`,
    `Match rate: ${results.match_rate}%`,
    `False positives: ${results.false_positives}`,
    results.details ? `Details:\n${jsonSafe(results.details)}` : '',
  ].join('\n');
}

async function toolDetectionDeploy(args: Record<string, string>): Promise<string> {
  const de = await getDetectionEngine();
  await de.deploy(args.rule_id, args.target);
  return `[+] Rule ${args.rule_id} deployed to ${args.target}`;
}

async function toolDetectionStats(): Promise<string> {
  const de = await getDetectionEngine();
  const stats = await de.getStats();
  return jsonSafe(stats);
}

async function toolDetectionDelete(args: Record<string, string>): Promise<string> {
  const de = await getDetectionEngine();
  await de.delete(args.id);
  return `[+] Detection rule ${args.id} deleted`;
}

// ─── Tools Registry ──────────────────────────────────────────────────────────

async function getToolsService() {
  const mod = await import('./tools');
  return mod.toolsService;
}

async function toolToolsList(args: Record<string, string>): Promise<string> {
  const svc = await getToolsService();
  const tools = args.category ? await svc.getToolsByCategory(args.category as any) : await svc.getTools();
  if (!tools.length) return 'No tools registered.';
  return tools.map((t: any) =>
    `[${t.status?.toUpperCase() || 'ACTIVE'}] ${t.name}\n  Category: ${t.category} | Command: ${t.command || 'N/A'}\n  ${truncate(t.description || '', 80)}\n  ID: ${t.id}`
  ).join('\n\n');
}

async function toolToolsCreate(args: Record<string, string>): Promise<string> {
  const svc = await getToolsService();
  const tool = await svc.createTool({
    name: args.name, description: args.description || '',
    category: args.category as any, command: args.command,
    install_command: args.install_command, documentation_url: args.documentation_url,
  });
  return `[+] Tool registered: "${tool.name}" [${tool.category}] (ID: ${tool.id})`;
}

async function toolToolsExecute(args: Record<string, string>): Promise<string> {
  const svc = await getToolsService();
  let params = {};
  try { params = JSON.parse(args.parameters || '{}'); } catch {}
  const exec = await svc.executeTool({
    tool_id: args.tool_id, target: args.target || '', parameters: params,
  });
  return `[+] Tool executed (${exec.status})\n${truncate(exec.output || '', 1000)}`;
}

async function toolToolsStats(): Promise<string> {
  const svc = await getToolsService();
  const stats = await svc.getToolStats();
  return jsonSafe(stats);
}

// ─── Analytics ───────────────────────────────────────────────────────────────

async function getAnalytics() {
  const mod = await import('./analytics');
  return mod.analyticsService;
}

async function toolAnalyticsActivity(args: Record<string, string>): Promise<string> {
  const svc = await getAnalytics();
  const activity = await svc.getRecentActivity(parseInt(args.limit) || 50);
  if (!activity.length) return 'No recent activity.';
  return activity.map((a: any) =>
    `${a.created_at} | ${a.action} | ${a.category || 'general'} | ${truncate(a.details || '', 80)}`
  ).join('\n');
}

async function toolAnalyticsSummary(args: Record<string, string>): Promise<string> {
  const svc = await getAnalytics();
  const summary = await svc.getActivitySummary(parseInt(args.days) || 7);
  return jsonSafe(summary);
}

async function toolAnalyticsLog(args: Record<string, string>): Promise<string> {
  const svc = await getAnalytics();
  await svc.logActivity({ action: args.action, category: args.category, details: args.details });
  return `[+] Activity logged: ${args.action}`;
}

// ─── Conversations ───────────────────────────────────────────────────────────

async function getConversationStorage() {
  const mod = await import('./conversationStorage');
  return mod.conversationStorage;
}

async function toolConversationList(args: Record<string, string>): Promise<string> {
  const svc = await getConversationStorage();
  const userId = await getUserId();
  const convos = await svc.getUserConversations(userId);
  if (!convos.length) return 'No conversations.';
  const limited = convos.slice(0, parseInt(args.limit) || 20);
  return limited.map((c: any) =>
    `${c.title || 'Untitled'}\n  Provider: ${c.provider} | Messages: ${c.message_count || 0}\n  ${c.updated_at} | ID: ${c.id}`
  ).join('\n\n');
}

async function toolConversationSearch(args: Record<string, string>): Promise<string> {
  const svc = await getConversationStorage();
  const userId = await getUserId();
  const results = await svc.searchConversations(userId, args.query);
  if (!results.length) return 'No conversations match query.';
  return results.map((c: any) =>
    `${c.title || 'Untitled'} | Messages: ${c.message_count || 0} | ID: ${c.id}`
  ).join('\n');
}

async function toolConversationExport(args: Record<string, string>): Promise<string> {
  const svc = await getConversationStorage();
  const userId = await getUserId();
  const ids = csvToArray(args.conversation_ids);
  const exported = await svc.exportConversations(userId, {
    format: (args.format || 'json') as any,
    conversationIds: ids.length ? ids : undefined,
  });
  return truncate(typeof exported === 'string' ? exported : jsonSafe(exported), 3000);
}

async function toolConversationStats(): Promise<string> {
  const svc = await getConversationStorage();
  const userId = await getUserId();
  const stats = await svc.getStatistics(userId);
  return jsonSafe(stats);
}

async function toolConversationDelete(args: Record<string, string>): Promise<string> {
  const svc = await getConversationStorage();
  await svc.deleteConversation(args.id);
  return `[+] Conversation ${args.id} deleted`;
}

// ─── Triage Engine ───────────────────────────────────────────────────────────

async function getTriageEngine() {
  const mod = await import('./triage-engine');
  return mod.triageEngine;
}

async function toolTriageAuto(): Promise<string> {
  const te = await getTriageEngine();
  const results = await te.triageOpenFindings();
  if (!results.length) return 'No open findings to triage.';
  return results.map((r: any) =>
    `${r.finding_id}: ${r.verdict} (confidence: ${r.confidence}%)\n  ${r.reasoning ? truncate(r.reasoning, 100) : ''}`
  ).join('\n\n');
}

async function toolTriageApprove(args: Record<string, string>): Promise<string> {
  const te = await getTriageEngine();
  await te.approveVerdict(args.finding_id);
  return `[+] Triage verdict approved for ${args.finding_id}`;
}

async function toolTriageReject(args: Record<string, string>): Promise<string> {
  const te = await getTriageEngine();
  await te.rejectVerdict(args.finding_id, args.verdict as any, args.notes);
  return `[+] Triage verdict rejected for ${args.finding_id} → ${args.verdict}`;
}

async function toolTriageStats(): Promise<string> {
  const te = await getTriageEngine();
  const stats = await te.getStats();
  return jsonSafe(stats);
}

async function toolTriageHistory(args: Record<string, string>): Promise<string> {
  const te = await getTriageEngine();
  const history = await te.getTriageHistory(args.finding_id);
  if (!history.length) return 'No triage history.';
  return history.map((h: any) =>
    `${h.created_at} | ${h.event_type} | ${h.verdict || 'N/A'} | ${h.actor || 'system'}`
  ).join('\n');
}

async function toolTriagePlaybooks(): Promise<string> {
  const te = await getTriageEngine();
  const playbooks = await te.getPlaybooks();
  if (!playbooks.length) return 'No playbooks configured.';
  return playbooks.map((p: any) =>
    `${p.name}\n  Steps: ${p.steps?.length || 0} | Success: ${p.success_count || 0}\n  ID: ${p.id}`
  ).join('\n\n');
}

// ─── App Navigation ──────────────────────────────────────────────────────────

function toolAppNavigate(args: Record<string, string>): string {
  const page = args.page;
  if (!page) return 'Error: page required';
  try {
    window.history.pushState(null, '', page);
    window.dispatchEvent(new PopStateEvent('popstate'));
    return `[+] Navigated to ${page}`;
  } catch {
    return `[-] Failed to navigate to ${page}`;
  }
}

// ─── App Status ──────────────────────────────────────────────────────────────

async function toolAppStatus(): Promise<string> {
  const supabase = await getSupabase();
  const userId = await getUserId();
  const [cves, kb, bm, findings, ops, endpoints, iocs, reports, scans, agents, rules, missions, alerts] = await Promise.all([
    supabase.from('cves').select('id', { count: 'exact', head: true }),
    supabase.from('knowledge_base').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('bookmarks').select('id', { count: 'exact', head: true }),
    supabase.from('findings').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('red_team_ops').select('id', { count: 'exact', head: true }),
    supabase.from('endpoints').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('threat_iocs').select('id', { count: 'exact', head: true }),
    supabase.from('reports').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
    supabase.from('network_scans').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
    supabase.from('custom_agents').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
    supabase.from('detection_rules').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
    supabase.from('mission_plans').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
    supabase.from('alerts').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
  ]);

  const critOpen = await supabase.from('findings')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId).eq('severity', 'critical').eq('status', 'open');

  return [
    'CrowByte Status:',
    `  CVEs:              ${cves.count ?? 0}`,
    `  Knowledge Base:    ${kb.count ?? 0}`,
    `  Bookmarks:         ${bm.count ?? 0}`,
    `  Findings:          ${findings.count ?? 0} (${critOpen.count ?? 0} critical open)`,
    `  Red Team Ops:      ${ops.count ?? 0}`,
    `  Fleet Endpoints:   ${endpoints.count ?? 0}`,
    `  Threat IOCs:       ${iocs.count ?? 0}`,
    `  Reports:           ${(reports as any).count ?? 0}`,
    `  Network Scans:     ${(scans as any).count ?? 0}`,
    `  Custom Agents:     ${(agents as any).count ?? 0}`,
    `  Detection Rules:   ${(rules as any).count ?? 0}`,
    `  Mission Plans:     ${(missions as any).count ?? 0}`,
    `  Alerts:            ${(alerts as any).count ?? 0}`,
  ].join('\n');
}

// ─── Data Delete ─────────────────────────────────────────────────────────────

async function toolDataDelete(args: Record<string, string>): Promise<string> {
  const supabase = await getSupabase();
  const { table, id } = args;
  if (!table || !id) return 'Error: table and id required';
  const allowed = [
    'cves', 'knowledge_base', 'bookmarks', 'findings', 'red_team_ops',
    'red_team_findings', 'endpoints', 'reports', 'network_scans',
    'custom_agents', 'mission_plans', 'alert_sources', 'alerts',
    'investigation_timelines', 'detection_rules', 'tools',
    'threat_iocs', 'sentinel_scans',
  ];
  if (!allowed.includes(table)) return `Error: table "${table}" not allowed`;
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) return `Error: ${error.message}`;
  return `[+] Deleted ${id} from ${table}`;
}
