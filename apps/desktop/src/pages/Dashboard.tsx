import { useState, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { UilHistory, UilPlus, UilSave, UilCheck, UilDraggabledots } from "@iconscout/react-unicons";
import { Button } from "@/components/ui/button";
import WidgetShell from "@/components/dashboard/WidgetShell";
import WidgetPicker from "@/components/dashboard/WidgetPicker";
import { widgetRegistry, getWidgetDef } from "@/components/dashboard/widget-registry";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { IS_WEB } from "@/lib/platform";

const Dashboard = () => {
  const {
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
  } = useDashboardLayout();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dragSourceId, setDragSourceId] = useState<string | null>(null);

  // Flash "Saved" indicator then fade
  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(t);
    }
  }, [saved]);

  // Listen for edit toggle from TabController icon
  const handleToggleEdit = useCallback(() => {
    setEditMode((prev: boolean) => {
      if (prev) {
        setPickerOpen(false);
        setSaved(true);
      }
      return !prev;
    });
  }, [setEditMode]);

  useEffect(() => {
    window.addEventListener("crowbyte-toggle-edit-dashboard", handleToggleEdit);
    return () => window.removeEventListener("crowbyte-toggle-edit-dashboard", handleToggleEdit);
  }, [handleToggleEdit]);

  // Filter desktop-only widgets on web
  const availableRegistry = IS_WEB
    ? widgetRegistry.filter(w => !w.desktopOnly)
    : widgetRegistry;

  const visibleWidgets = sortedWidgets.filter(w => {
    const def = getWidgetDef(w.widgetId);
    if (!def) return false;
    if (IS_WEB && def.desktopOnly) return false;
    return true;
  });

  const handleDragStart = (widgetId: string) => setDragSourceId(widgetId);

  const handleDragOver = (widgetId: string) => {
    if (!dragSourceId || dragSourceId === widgetId) return;
    const targetIndex = visibleWidgets.findIndex(w => w.widgetId === widgetId);
    if (targetIndex !== -1) reorderWidget(dragSourceId, targetIndex);
  };

  const handleDragEnd = () => setDragSourceId(null);

  const handleDone = () => {
    setPickerOpen(false);
    setSaved(true);
    setEditMode(false);
  };

  return (
    <div className="space-y-4 p-6">
      {/* Dashboard edit toolbar — only visible in edit mode */}
      {editMode && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] text-zinc-500">
              <UilDraggabledots size={12} className="text-blue-400" />
              Drag to reorder
            </span>
            {saved && (
              <span className="flex items-center gap-1 text-[11px] text-emerald-500 animate-pulse">
                <UilCheck size={12} />
                Saved
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPickerOpen(true)}
              className="h-7 px-3 text-xs text-blue-400 hover:text-blue-300"
            >
              <UilPlus size={12} className="mr-1.5" />
              Add Widget
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={resetLayout}
              className="h-7 px-3 text-xs text-zinc-500 hover:text-zinc-300"
            >
              <UilHistory size={12} className="mr-1.5" />
              Reset
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSaved(true)}
              className="h-7 px-3 text-xs text-emerald-500 hover:text-emerald-400"
            >
              <UilSave size={12} className="mr-1.5" />
              Save
            </Button>
            <Button
              size="sm"
              onClick={handleDone}
              className="h-7 px-3 text-xs bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
            >
              <UilCheck size={12} className="mr-1.5" />
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Widget Grid */}
      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: "repeat(4, 1fr)",
        }}
      >
        <AnimatePresence mode="popLayout">
          {visibleWidgets.map((placement, index) => {
            const def = getWidgetDef(placement.widgetId);
            if (!def) return null;

            const WidgetComponent = def.component;

            return (
              <WidgetShell
                key={placement.widgetId}
                widgetId={placement.widgetId}
                widgetName={def.name}
                size={placement.size}
                allowedSizes={def.allowedSizes}
                editMode={editMode}
                compact={def.compact}
                index={index}
                onRemove={editMode ? () => removeWidget(placement.widgetId) : undefined}
                onResize={editMode && def.allowedSizes && def.allowedSizes.length > 1
                  ? (newSize) => resizeWidget(placement.widgetId, newSize)
                  : undefined}
                onDragStart={editMode ? handleDragStart : undefined}
                onDragOver={editMode ? handleDragOver : undefined}
                onDragEnd={editMode ? handleDragEnd : undefined}
              >
                <WidgetComponent
                  id={placement.widgetId}
                  size={placement.size}
                  editMode={editMode}
                  onRemove={() => removeWidget(placement.widgetId)}
                  config={def.config}
                />
              </WidgetShell>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty state */}
      {visibleWidgets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-4xl mb-4">📊</div>
          <h3 className="text-lg font-semibold text-white mb-2">No widgets on your dashboard</h3>
          <p className="text-sm text-zinc-500 mb-6 max-w-md">
            Click the edit icon in the control bar to customize your dashboard
          </p>
          <Button
            onClick={() => { setEditMode(true); setPickerOpen(true); }}
            className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
          >
            <UilPlus size={16} className="mr-2" />
            Add Your First Widget
          </Button>
        </div>
      )}

      {/* Widget Picker */}
      <WidgetPicker
        registry={availableRegistry}
        activeWidgetIds={activeWidgetIds}
        onAdd={addWidget}
        onRemove={removeWidget}
        onClose={() => setPickerOpen(false)}
        isOpen={pickerOpen}
      />
    </div>
  );
};

export default Dashboard;
