import { useState, useCallback, useEffect, useRef } from "react";
import type { DashboardLayout, WidgetPlacement, WidgetSize } from "@/components/dashboard/types";
import supabase from "@/lib/supabase";

const STORAGE_KEY = "crowbyte-dashboard-layout";
const LAYOUT_VERSION = 4;

/* ── Default layout — what new users get ── */
const DEFAULT_LAYOUT: DashboardLayout = {
  version: LAYOUT_VERSION,
  widgets: [
    { widgetId: "command-center", size: "1x1", order: 0 },
    { widgetId: "clock", size: "2x1", order: 1 },
    { widgetId: "calendar", size: "1x1", order: 2 },
    { widgetId: "network-status", size: "4x1", order: 3 },
    { widgetId: "live-feed", size: "4x1", order: 4 },
    { widgetId: "quick-actions", size: "4x1", order: 5 },
    { widgetId: "system-health", size: "2x1", order: 6 },
    { widgetId: "vps-health", size: "2x1", order: 7 },
    { widgetId: "fleet", size: "2x1", order: 8 },
    { widgetId: "uptime-monitor", size: "2x1", order: 9 },
    { widgetId: "alert-center", size: "2x1", order: 10 },
    { widgetId: "shodan-monitor", size: "2x1", order: 11 },
    { widgetId: "feed", size: "4x1", order: 12 },
    { widgetId: "cve-alerts", size: "2x1", order: 13 },
    { widgetId: "threat-intel", size: "2x1", order: 14 },
    { widgetId: "analytics", size: "2x1", order: 15 },
    { widgetId: "agent-activity", size: "4x1", order: 16 },
  ],
};

function loadLayout(): DashboardLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as DashboardLayout;
    if (parsed.version !== LAYOUT_VERSION) return DEFAULT_LAYOUT;
    return parsed;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

function saveLayout(layout: DashboardLayout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch { /* empty */ }
}

/** Sync layout to Supabase (fire-and-forget) */
async function syncLayoutToCloud(layout: DashboardLayout): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        dashboard_layout: JSON.stringify(layout),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  } catch { /* empty */ }
}

/** Load layout from cloud on init */
async function loadLayoutFromCloud(): Promise<DashboardLayout | null> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('user_settings')
      .select('dashboard_layout')
      .eq('user_id', user.id)
      .single();

    if (data?.dashboard_layout) {
      const parsed = JSON.parse(data.dashboard_layout) as DashboardLayout;
      if (parsed.version === LAYOUT_VERSION && parsed.widgets?.length > 0) {
        return parsed;
      }
    }
  } catch { /* empty */ }
  return null;
}

export function useDashboardLayout() {
  const [layout, setLayout] = useState<DashboardLayout>(loadLayout);
  const [editMode, setEditMode] = useState(false);
  const cloudLoaded = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Load from cloud on mount (cloud wins if available)
  useEffect(() => {
    if (cloudLoaded.current) return;
    cloudLoaded.current = true;

    loadLayoutFromCloud().then(cloudLayout => {
      if (cloudLayout) {
        setLayout(cloudLayout);
        saveLayout(cloudLayout);
      }
    });
  }, []);

  // Persist on change — localStorage instant, cloud debounced
  useEffect(() => {
    saveLayout(layout);

    // Debounce cloud sync (500ms) to avoid hammering Supabase during drag/reorder
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      syncLayoutToCloud(layout);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [layout]);

  const addWidget = useCallback((widgetId: string, size: WidgetSize) => {
    setLayout(prev => {
      // Don't add duplicates
      if (prev.widgets.some(w => w.widgetId === widgetId)) return prev;
      const maxOrder = Math.max(0, ...prev.widgets.map(w => w.order));
      return {
        ...prev,
        widgets: [...prev.widgets, { widgetId, size, order: maxOrder + 1 }],
      };
    });
  }, []);

  const removeWidget = useCallback((widgetId: string) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets
        .filter(w => w.widgetId !== widgetId)
        .map((w, i) => ({ ...w, order: i })),
    }));
  }, []);

  const resizeWidget = useCallback((widgetId: string, newSize: WidgetSize) => {
    setLayout(prev => ({
      ...prev,
      widgets: prev.widgets.map(w =>
        w.widgetId === widgetId ? { ...w, size: newSize } : w
      ),
    }));
  }, []);

  const moveWidget = useCallback((widgetId: string, direction: "up" | "down") => {
    setLayout(prev => {
      const sorted = [...prev.widgets].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex(w => w.widgetId === widgetId);
      if (idx === -1) return prev;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= sorted.length) return prev;
      // Swap orders
      const temp = sorted[idx].order;
      sorted[idx] = { ...sorted[idx], order: sorted[targetIdx].order };
      sorted[targetIdx] = { ...sorted[targetIdx], order: temp };
      return { ...prev, widgets: sorted };
    });
  }, []);

  const reorderWidget = useCallback((widgetId: string, toIndex: number) => {
    setLayout(prev => {
      const sorted = [...prev.widgets].sort((a, b) => a.order - b.order);
      const fromIndex = sorted.findIndex(w => w.widgetId === widgetId);
      if (fromIndex === -1 || fromIndex === toIndex) return prev;
      const [moved] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, moved);
      return {
        ...prev,
        widgets: sorted.map((w, i) => ({ ...w, order: i })),
      };
    });
  }, []);

  const resetLayout = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
  }, []);

  const activeWidgetIds = layout.widgets.map(w => w.widgetId);

  const sortedWidgets = [...layout.widgets].sort((a, b) => a.order - b.order);

  return {
    layout,
    sortedWidgets,
    activeWidgetIds,
    editMode,
    setEditMode,
    addWidget,
    removeWidget,
    resizeWidget,
    moveWidget,
    reorderWidget,
    resetLayout,
  };
}
