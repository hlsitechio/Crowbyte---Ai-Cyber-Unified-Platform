import { forwardRef, useState } from "react";
import { UilTimes, UilCompressArrows, UilExpandArrows, UilDraggabledots } from "@iconscout/react-unicons";
import type { WidgetSize } from "./types";
import { sizeToGridSpan } from "./types";

interface WidgetShellProps {
  children: React.ReactNode;
  size: WidgetSize;
  allowedSizes?: WidgetSize[];
  editMode?: boolean;
  widgetId: string;
  widgetName?: string;
  compact?: boolean;
  onRemove?: () => void;
  onResize?: (newSize: WidgetSize) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDragStart?: (widgetId: string) => void;
  onDragOver?: (widgetId: string) => void;
  onDragEnd?: () => void;
  index?: number;
}

const WidgetShell = forwardRef<HTMLDivElement, WidgetShellProps>(function WidgetShell({
  children,
  size,
  allowedSizes,
  editMode,
  widgetId,
  widgetName,
  compact,
  onRemove,
  onResize,
  onDragStart,
  onDragOver,
  onDragEnd,
  index = 0,
}: WidgetShellProps, ref) {
  const span = sizeToGridSpan[size];
  const [dragOver, setDragOver] = useState(false);

  const cycleSize = () => {
    if (!onResize || !allowedSizes || allowedSizes.length < 2) return;
    const currentIdx = allowedSizes.indexOf(size);
    const nextIdx = (currentIdx + 1) % allowedSizes.length;
    onResize(allowedSizes[nextIdx]);
  };

  const sizeLabel: Record<string, string> = {
    "1x1": "1x1",
    "2x1": "Half",
    "3x1": "3/4",
    "4x1": "Full",
    "1x2": "1x2",
    "2x2": "2x2",
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", widgetId);
    e.dataTransfer.effectAllowed = "move";
    onDragStart?.(widgetId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
    onDragOver?.(widgetId);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    onDragEnd?.();
  };

  return (
    <div
      ref={ref}
      className={`relative animate-in fade-in-0 slide-in-from-bottom-3 duration-300 fill-mode-both ${editMode ? "ring-1 ring-dashed ring-blue-500/30 rounded-xl" : ""} ${dragOver && editMode ? "ring-2 ring-blue-400 bg-blue-500/5" : ""}`}
      style={{
        gridColumn: `span ${span.col}`,
        gridRow: `span ${span.row}`,
        animationDelay: `${index * 40}ms`,
        ...(compact ? { alignSelf: "start" } : {}),
      }}
      onDragOver={editMode ? handleDragOver : undefined}
      onDragLeave={editMode ? handleDragLeave : undefined}
      onDrop={editMode ? handleDrop : undefined}
    >
      {/* Edit mode: drag handle label + controls */}
      {editMode && widgetName && (
        <div className="absolute -top-2 left-3 right-3 z-50 flex items-center justify-between">
          {/* Drag handle */}
          <div
            draggable
            onDragStart={handleDragStart}
            className="px-2 py-0.5 rounded bg-zinc-800 border border-white/10 cursor-grab active:cursor-grabbing select-none"
          >
            <span className="text-[10px] text-zinc-400 font-mono flex items-center gap-1">
              <UilDraggabledots size={10} className="text-blue-400" />
              {widgetName}
            </span>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            {onResize && (
              <button
                onClick={cycleSize}
                className="h-5 px-1.5 rounded bg-zinc-800 border flex items-center justify-center gap-0.5 hover:bg-zinc-700 transition-colors"
                title={`Resize (current: ${sizeLabel[size] || size})`}
              >
                {size === "4x1" ? (
                  <UilCompressArrows size={9} className="text-blue-400" />
                ) : (
                  <UilExpandArrows size={9} className="text-blue-400" />
                )}
                <span className="text-[8px] text-blue-400 font-mono">{sizeLabel[size] || size}</span>
              </button>
            )}
            {onRemove && (
              <button
                onClick={onRemove}
                className="h-5 w-5 rounded bg-red-500/20 border flex items-center justify-center hover:bg-red-500/40 transition-colors"
                title={`Remove ${widgetName || widgetId}`}
              >
                <UilTimes size={9} className="text-red-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  );
});

export default WidgetShell;
