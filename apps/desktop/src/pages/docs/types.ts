import type { ComponentType } from "react";
type PhosphorIcon = ComponentType<{ size?: number | string; color?: string; className?: string }>;

export type DocSection =
  // Getting Started
  | "overview"
  | "installation"
  | "auth"
  // Command Center
  | "dashboard"
  | "chat"
  // AI Operations
  | "ai-agent"
  | "agent-builder"
  | "agent-testing"
  | "llm"
  // Red Team
  | "redteam"
  | "cyber-ops"
  | "tools-page"
  | "network-scanner"
  // Blue Team
  | "security-monitor"
  | "fleet"
  | "cve"
  | "threat-intel"
  // Intelligence
  | "mission-planner"
  | "knowledge"
  | "bookmarks"
  | "memory"
  | "analytics"
  // System
  | "terminal"
  | "logs"
  | "settings"
  // Integrations
  | "supabase"
  | "mcp"
  | "mcp-page"
  | "ai-providers"
  | "nvd-shodan"
  // Development
  | "tech-stack"
  | "electron-arch"
  | "data-security"
  | "cli-tools"
  | "roadmap";

export interface NavItem {
  id: DocSection;
  label: string;
  icon: PhosphorIcon;
  badge?: string;
}

export interface NavGroup {
  label: string;
  color: string;
  icon: PhosphorIcon;
  items: NavItem[];
}
