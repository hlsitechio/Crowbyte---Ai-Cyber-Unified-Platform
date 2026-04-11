import { useState } from "react";
import { UilPlus, UilCheck } from "@iconscout/react-unicons";
import { motion, AnimatePresence } from "framer-motion";
import type { WidgetDef, WidgetCategory } from "./types";

const categoryLabels: Record<WidgetCategory, string> = {
  system: "System",
  security: "Security",
  intel: "Intelligence",
  agents: "Agents",
  tools: "Tools",
};

const categoryColors: Record<WidgetCategory, string> = {
  system: "text-emerald-400",
  security: "text-red-400",
  intel: "text-blue-400",
  agents: "text-violet-400",
  tools: "text-amber-400",
};

const categoryBorder: Record<WidgetCategory, string> = {
  system: "border-emerald-500",
  security: "border-red-500",
  intel: "border-blue-500",
  agents: "border-violet-500",
  tools: "border-amber-500",
};

// Sub-groups within intel to separate dashboards from IP blocklists
const INTEL_SUBGROUPS: { label: string; ids: string[] }[] = [
  {
    label: "Dashboards",
    ids: ["cyber-pulse", "threat-intel", "feed", "live-feed"],
  },
  {
    label: "Threat Feeds",
    ids: ["intel-malware", "intel-phishing", "intel-vulns", "intel-iocs", "intel-oss-vulns"],
  },
  {
    label: "IP Blocklists",
    ids: ["intel-c2", "intel-bruteforce", "intel-compromised", "intel-ip-rep", "intel-web-attacks", "intel-spam"],
  },
];

interface WidgetPickerProps {
  registry: WidgetDef[];
  activeWidgetIds: string[];
  onAdd: (widgetId: string, size: WidgetDef["defaultSize"]) => void;
  onRemove: (widgetId: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

function WidgetCard({
  widget,
  isActive,
  onToggle,
}: {
  widget: WidgetDef;
  isActive: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
        isActive
          ? "border-blue-500/30 bg-blue-500/[0.06] hover:border-blue-500/40"
          : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12] hover:bg-white/[0.04]"
      }`}
    >
      <div
        className={`p-2 rounded-lg border shrink-0 ${
          isActive
            ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
            : "bg-white/[0.04] border-white/[0.08] text-zinc-400"
        }`}
      >
        {widget.icon ? (
          <widget.icon size={16} className="text-inherit" />
        ) : (
          <UilPlus size={16} className="text-inherit" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{widget.name}</span>
          {widget.desktopOnly && (
            <span className="text-[9px] text-zinc-600 border border-zinc-700 px-1.5 py-0.5 rounded">
              DESKTOP
            </span>
          )}
        </div>
        <span className="text-[11px] text-zinc-500 line-clamp-1">
          {widget.description}
        </span>
      </div>
      <div
        className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center ${
          isActive ? "bg-blue-500" : "border border-white/[0.12]"
        }`}
      >
        {isActive && <UilCheck size={12} className="text-white" />}
      </div>
    </button>
  );
}

export default function WidgetPicker({
  registry,
  activeWidgetIds,
  onAdd,
  onRemove,
  onClose,
  isOpen,
}: WidgetPickerProps) {
  const [activeTab, setActiveTab] = useState<WidgetCategory>("intel");

  // Group by category
  const grouped = registry.reduce<Record<WidgetCategory, WidgetDef[]>>(
    (acc, w) => {
      if (!acc[w.category]) acc[w.category] = [];
      acc[w.category].push(w);
      return acc;
    },
    {} as any
  );

  // Ordered tabs — only show categories that have widgets
  const tabOrder: WidgetCategory[] = ["intel", "security", "system", "agents", "tools"];
  const availableTabs = tabOrder.filter((cat) => grouped[cat]?.length > 0);

  const handleToggle = (widget: WidgetDef) => {
    if (activeWidgetIds.includes(widget.id)) {
      onRemove(widget.id);
    } else {
      onAdd(widget.id, widget.defaultSize);
    }
  };

  // Render intel with sub-groups
  const renderIntelTab = () => {
    const intelWidgets = grouped["intel"] || [];
    return (
      <div className="space-y-5">
        {INTEL_SUBGROUPS.map((group) => {
          const widgets = group.ids
            .map((id) => intelWidgets.find((w) => w.id === id))
            .filter(Boolean) as WidgetDef[];
          if (widgets.length === 0) return null;
          return (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                  {group.label}
                </span>
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] text-zinc-600">{widgets.length}</span>
              </div>
              <div className="space-y-2">
                {widgets.map((widget) => (
                  <WidgetCard
                    key={widget.id}
                    widget={widget}
                    isActive={activeWidgetIds.includes(widget.id)}
                    onToggle={() => handleToggle(widget)}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // Render a generic category tab
  const renderCategoryTab = (cat: WidgetCategory) => {
    const widgets = grouped[cat] || [];
    return (
      <div className="space-y-2">
        {widgets.map((widget) => (
          <WidgetCard
            key={widget.id}
            widget={widget}
            isActive={activeWidgetIds.includes(widget.id)}
            onToggle={() => handleToggle(widget)}
          />
        ))}
      </div>
    );
  };

  // Count active widgets per category
  const countActive = (cat: WidgetCategory) =>
    (grouped[cat] || []).filter((w) => activeWidgetIds.includes(w.id)).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[400px] bg-zinc-900/95 backdrop-blur-xl border-l border-white/[0.08] z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-5 pb-0">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-sans text-lg font-bold text-white">
                  Add Widgets
                </h2>
                <button
                  onClick={onClose}
                  className="text-xs text-zinc-500 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/[0.06]"
                >
                  Done
                </button>
              </div>

              {/* Tab bar */}
              <div className="flex gap-0.5 border-b border-white/[0.06] -mx-5 px-5">
                {availableTabs.map((cat) => {
                  const active = activeTab === cat;
                  const count = countActive(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => setActiveTab(cat)}
                      className={`relative px-3 py-2 text-xs font-medium transition-colors ${
                        active
                          ? categoryColors[cat]
                          : "text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {categoryLabels[cat]}
                        {count > 0 && (
                          <span
                            className={`text-[9px] px-1 py-0.5 rounded-full leading-none ${
                              active
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-white/[0.06] text-zinc-500"
                            }`}
                          >
                            {count}
                          </span>
                        )}
                      </span>
                      {active && (
                        <motion.div
                          layoutId="picker-tab-indicator"
                          className={`absolute bottom-0 left-0 right-0 h-0.5 ${categoryBorder[cat]}`}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tab content — scrollable */}
            <div className="flex-1 overflow-y-auto p-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {activeTab === "intel"
                    ? renderIntelTab()
                    : renderCategoryTab(activeTab)}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer — active count */}
            <div className="p-4 border-t border-white/[0.06] text-center">
              <span className="text-[11px] text-zinc-500">
                {activeWidgetIds.length} widget{activeWidgetIds.length !== 1 ? "s" : ""} active
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
