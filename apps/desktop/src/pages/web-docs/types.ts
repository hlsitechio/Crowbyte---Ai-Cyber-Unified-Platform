import type { ComponentType } from "react";
type PhosphorIcon = ComponentType<{ size?: number | string; color?: string; className?: string }>;

export type WebDocSection =
  | "overview"
  | "getting-started"
  | "ai-chat"
  | "ai-models"
  | "cve-database"
  | "red-team"
  | "cyber-ops"
  | "network-scanner"
  | "security-monitor"
  | "fleet"
  | "knowledge-base"
  | "agent-builder"
  | "mission-planner"
  | "bookmarks"
  | "threat-intel"
  | "analytics"
  | "terminal"
  | "security"
  | "beta-program"
  | "pricing"
  | "roadmap"
  | "faq";

export interface WebNavItem {
  id: WebDocSection;
  label: string;
  icon: PhosphorIcon;
  badge?: string;
  adminOnly?: boolean;
}

export interface WebNavGroup {
  label: string;
  color: string;
  icon: PhosphorIcon;
  items: WebNavItem[];
}
