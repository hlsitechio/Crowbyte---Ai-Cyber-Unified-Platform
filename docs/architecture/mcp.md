# MCP Architecture

## Overview

CrowByt uses Model Context Protocol (MCP) servers to extend AI capabilities with external tools.

## MCP Configuration

### Claude CLI (Development)
Located in: `~/.claude.json`

```bash
# Manage MCPs
claude mcp list          # List all MCPs
claude mcp add <name>    # Add new MCP
claude mcp remove <name> # Remove MCP
```

### CrowByt App (Production)
Located in: `apps/desktop/src/config/mcp-servers.ts`

The app has its own MCP client implementation separate from Claude CLI.

## Available MCP Servers

### NVD CVE Search (`mcp-servers/nvd`)
- **Purpose**: Search National Vulnerability Database
- **Transport**: STDIO
- **Tools**:
  - `search_cves` - Search CVEs by keyword
  - `get_cve_by_id` - Get CVE details
  - `search_recent_cves` - Get recent vulnerabilities

### Resend Email (`mcp-servers/resend`)
- **Purpose**: Send emails via Resend API
- **Transport**: STDIO
- **Tools**:
  - `send-email` - Send email
  - `list-audiences` - List email audiences

### Supabase (`backend/supabase`)
- **Purpose**: Database operations
- **Transport**: HTTP
- **URL**: `https://mcp.supabase.com/mcp?project_ref=<PROJECT_REF>`
- **Tools**:
  - `execute_sql` - Run SQL queries
  - `apply_migration` - Apply migrations
  - `list_tables` - List database tables
  - `get_advisors` - Security advisors

### Make.com (`automation/make`)
- **Purpose**: Automation workflows
- **Transport**: SSE
- **Tools**:
  - Scenario management
  - Webhook triggers
  - Data store operations

## Adding New MCP Servers

1. Create server in `mcp-servers/<name>/`
2. Implement MCP protocol
3. Add to Claude CLI: `claude mcp add <name> <command>`
4. Add to app config in `mcp-servers.ts`

## Security

- MCPs run in isolated processes
- API keys stored in environment variables
- RLS policies protect database access
