import type { ComponentType } from "react";

/* ── Widget size presets for CSS Grid ── */
export type WidgetSize = "1x1" | "2x1" | "3x1" | "1x2" | "2x2" | "4x1";

/* ── Widget category for the picker ── */
export type WidgetCategory = "system" | "security" | "intel" | "agents" | "tools";

/* ── Widget definition in the registry ── */
export interface WidgetDef {
  id: string;
  name: string;
  description: string;
  category: WidgetCategory;
  defaultSize: WidgetSize;
  /** Sizes the user can choose from */
  allowedSizes?: WidgetSize[];
  /** Component to render */
  component: ComponentType<WidgetProps>;
  /** Desktop-only widget (hidden on web) */
  desktopOnly?: boolean;
  /** Icon component for the picker */
  icon?: ComponentType<{ size?: number; className?: string }>;
  /** Static config passed to the widget component */
  config?: Record<string, any>;
  /** Compact widget — does not stretch to fill row height */
  compact?: boolean;
}

/* ── Props every widget receives ── */
export interface WidgetProps {
  id: string;
  size: WidgetSize;
  editMode?: boolean;
  onRemove?: () => void;
  /** Optional config passed from the widget definition */
  config?: Record<string, any>;
}

/* ── A placed widget in the user's layout ── */
export interface WidgetPlacement {
  widgetId: string;
  size: WidgetSize;
  /** Position in the grid (order) */
  order: number;
}

/* ── Full dashboard layout ── */
export interface DashboardLayout {
  version: number;
  widgets: WidgetPlacement[];
}

/* ── Grid span mapping ── */
export const sizeToGridSpan: Record<WidgetSize, { col: number; row: number }> = {
  "1x1": { col: 1, row: 1 },
  "2x1": { col: 2, row: 1 },
  "3x1": { col: 3, row: 1 },
  "1x2": { col: 1, row: 2 },
  "2x2": { col: 2, row: 2 },
  "4x1": { col: 4, row: 1 },
};
