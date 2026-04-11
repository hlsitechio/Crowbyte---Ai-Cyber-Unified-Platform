/**
 * TabController — Floating control bar + per-pane headers.
 * Supports: Detach, Dual Split, Quad Split (2x2), Swap, Close.
 */
import { useState, useRef, useEffect, useLayoutEffect, forwardRef } from "react";
import { createPortal } from "react-dom";
import { UilSync, UilCompressArrows, UilTimes, UilAngleDown, UilColumns, UilGrid, UilExpandArrows, UilExpandArrowsAlt, UilEdit } from "@iconscout/react-unicons";
import { useSplitScreen, type SplitDirection, type PanePosition } from "@/contexts/split-screen";
import { PAGE_REGISTRY, getPagesBySection, SECTION_LABELS, type PageEntry } from "@/lib/page-registry";
import { useLocation } from "react-router-dom";

// ─── Page Picker Dropdown (portaled to body) ─────────────────────────────────

function PagePicker({
  onSelect,
  onClose,
  excludePath,
  anchorRef,
}: {
  onSelect: (path: string) => void;
  onClose: () => void;
  excludePath?: string;
  anchorRef: React.RefObject<HTMLElement | null>;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const sections = getPagesBySection();
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useLayoutEffect(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const dropdownWidth = 224;
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth) left = window.innerWidth - dropdownWidth - 8;
    if (left < 4) left = 4;
    setPos({ top: rect.bottom + 4, left });
  }, [anchorRef]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [onClose, anchorRef]);

  return createPortal(
    <div
      ref={dropdownRef}
      className="fixed w-56 bg-zinc-900 border border-zinc-700/60 rounded-lg shadow-2xl z-[200] overflow-hidden"
      style={{ top: pos.top, left: pos.left }}
    >
      <div className="max-h-[400px] overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-zinc-700">
        {Object.entries(sections).map(([key, pages]) => {
          const filtered = pages.filter((p) => p.path !== excludePath);
          if (filtered.length === 0) return null;
          return (
            <div key={key}>
              <div className="px-3 pt-2 pb-1 text-[9px] font-semibold uppercase tracking-widest text-zinc-500">
                {SECTION_LABELS[key]}
              </div>
              {filtered.map((page) => (
                <button
                  key={page.path}
                  onClick={() => {
                    onSelect(page.path);
                    onClose();
                  }}
                  className="w-full text-left px-3 py-1.5 text-[12px] text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 transition-colors flex items-center gap-2"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 flex-shrink-0" />
                  {page.title}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>,
    document.body
  );
}

// ─── Pane Header (used by both dual and quad modes) ──────────────────────────

export function PaneHeader({
  direction,
  currentPath,
}: {
  direction: SplitDirection | PanePosition;
  currentPath: string;
}) {
  const ctx = useSplitScreen();
  const {
    mode,
    focusedPane,
    zoomedPane,
    setFocusedPane,
    setPanePage,
    setQuadPanePage,
    closeSplit,
    closeQuad,
    swapPanes,
    swapQuadPanes,
    zoomPane,
    unzoom,
  } = ctx;
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const currentPage = PAGE_REGISTRY.find((p) => p.path === currentPath);

  // Map direction to PanePosition for focus check
  const panePosition: PanePosition =
    direction === "left" ? "topLeft" :
    direction === "right" ? "topRight" :
    direction as PanePosition;

  const isFocused = focusedPane === panePosition;

  // Label for quad panes
  const posLabel: Record<string, string> = {
    topLeft: "TL",
    topRight: "TR",
    bottomLeft: "BL",
    bottomRight: "BR",
  };

  // Handle page selection
  const handlePageSelect = (path: string) => {
    if (mode === "quad") {
      setQuadPanePage(panePosition, path);
    } else {
      const dir = direction === "left" || direction === "topLeft" || direction === "bottomLeft" ? "left" : "right";
      setPanePage(dir as SplitDirection, path);
    }
  };

  // Handle close
  const handleClose = () => {
    if (mode === "quad") {
      // Close this quad pane → downgrade to dual
      closeQuad(panePosition);
    } else {
      // Close dual → keep the other pane
      const keepDir = (direction === "left" ? "right" : "left") as SplitDirection;
      closeSplit(keepDir);
    }
  };

  // Drag-to-swap — works in both dual and quad mode
  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (mode === "none") return;
    e.preventDefault();
    setDragging(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const threshold = 60;
    let swapped = false;

    // Quad neighbor map: for each position, which pane is in each direction
    const quadNeighbors: Record<string, { right?: PanePosition; left?: PanePosition; up?: PanePosition; down?: PanePosition }> = {
      topLeft:     { right: "topRight",    down: "bottomLeft" },
      topRight:    { left: "topLeft",      down: "bottomRight" },
      bottomLeft:  { right: "bottomRight", up: "topLeft" },
      bottomRight: { left: "bottomLeft",   up: "topRight" },
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (swapped) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;

      if (mode === "dual") {
        // Dual: horizontal swap only
        if (
          (direction === "left" && dx > threshold) ||
          (direction === "right" && dx < -threshold)
        ) {
          swapPanes();
          swapped = true;
          cleanup();
        }
      } else if (mode === "quad") {
        // Quad: detect dominant direction, swap with neighbor
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        if (absDx < threshold && absDy < threshold) return;

        const neighbors = quadNeighbors[panePosition];
        if (!neighbors) return;

        let target: PanePosition | undefined;
        if (absDx > absDy) {
          // Horizontal drag
          target = dx > 0 ? neighbors.right : neighbors.left;
        } else {
          // Vertical drag
          target = dy > 0 ? neighbors.down : neighbors.up;
        }

        if (target) {
          swapQuadPanes(panePosition, target);
          swapped = true;
          cleanup();
        }
      }
    };
    const handleMouseUp = () => cleanup();
    const cleanup = () => {
      setDragging(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "grabbing";
    document.body.style.userSelect = "none";
  };

  return (
    <div
      ref={headerRef}
      onMouseDown={handleDragStart}
      className={`flex items-center justify-between h-7 px-2 border-b transition-colors select-none ${
        dragging
          ? "border-blue-500/50 bg-blue-500/10 cursor-grabbing"
          : isFocused
            ? "border-blue-500/30 bg-blue-500/[0.03] cursor-grab"
            : "border-zinc-800 bg-zinc-900/50 cursor-grab hover:bg-zinc-900/60"
      }`}
      onClick={() => setFocusedPane(panePosition)}
    >
      <div className="relative flex items-center gap-1">
        {/* Quad position badge */}
        {mode === "quad" && (
          <span className={`text-[8px] font-mono px-1 rounded ${
            isFocused ? "bg-blue-500/20 text-blue-400" : "bg-zinc-800 text-zinc-500"
          }`}>
            {posLabel[panePosition] || ""}
          </span>
        )}

        {/* Drag grip — drag to swap panes */}
        <div className="flex flex-col gap-[2px] mr-0.5 opacity-30">
          <div className="flex gap-[2px]">
            <div className="w-[3px] h-[3px] rounded-[1px] bg-zinc-400" />
            <div className="w-[3px] h-[3px] rounded-[1px] bg-zinc-400" />
          </div>
          <div className="flex gap-[2px]">
            <div className="w-[3px] h-[3px] rounded-[1px] bg-zinc-400" />
            <div className="w-[3px] h-[3px] rounded-[1px] bg-zinc-400" />
          </div>
        </div>

        <button
          ref={btnRef}
          onClick={(e) => {
            e.stopPropagation();
            setPickerOpen(!pickerOpen);
          }}
          className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${isFocused ? "bg-blue-400" : "bg-zinc-600"}`} />
          <span className="font-medium truncate max-w-[120px]">
            {currentPage?.title || "Select Page"}
          </span>
          <UilAngleDown size={9} />
        </button>

        {pickerOpen && (
          <PagePicker
            onSelect={(path) => handlePageSelect(path)}
            onClose={() => setPickerOpen(false)}
            anchorRef={btnRef}
          />
        )}
      </div>

      <div className="flex items-center gap-0.5 flex-shrink-0">
        {/* Zoom / Focus button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (zoomedPane === panePosition) {
              unzoom();
            } else {
              zoomPane(panePosition);
            }
          }}
          className={`flex items-center justify-center w-5 h-5 rounded transition-colors ${
            zoomedPane === panePosition
              ? "text-blue-400 hover:text-blue-300"
              : "text-zinc-600 hover:text-zinc-300"
          }`}
          title={zoomedPane === panePosition ? "Exit focus mode" : "Focus mode"}
        >
          {zoomedPane === panePosition
            ? <UilCompressArrows size={10} />
            : <UilExpandArrows size={10} />
          }
        </button>

        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          className="flex items-center justify-center w-5 h-5 rounded text-zinc-600 hover:text-zinc-300 transition-colors"
          title="Close pane"
        >
          <UilTimes size={10} />
        </button>
      </div>
    </div>
  );
}

// ─── Main TabController Bar ──────────────────────────────────────────────────

export function TabController() {
  const location = useLocation();
  const splitCtx = useSplitScreen();
  const { mode, isSplit, zoomedPane, detachTab, splitRight, splitQuad, swapPanes, closeAll } = splitCtx;
  const [splitPickerOpen, setSplitPickerOpen] = useState(false);
  const splitBtnRef = useRef<HTMLButtonElement>(null);
  const currentPath = location.pathname;
  const isDashboard = currentPath === "/" || currentPath === "/dashboard";

  return (
    <div className={`absolute top-3 right-3 z-50 flex items-center gap-0.5 transition-opacity ${zoomedPane ? "opacity-0 pointer-events-none" : ""}`}>
      {/* Edit Dashboard — only on dashboard page */}
      {isDashboard && (
        <ControlButton
          icon={<UilEdit size={14} />}
          tooltip="Edit Dashboard"
          onClick={() => window.dispatchEvent(new CustomEvent("crowbyte-toggle-edit-dashboard"))}
        />
      )}

      {/* Detach: pop-out to new window */}
      <ControlButton
        icon={<UilExpandArrowsAlt size={14} />}
        tooltip="Pop out to new window"
        onClick={() => detachTab(currentPath)}
      />

      {isSplit ? (
        <>
          {/* Swap (dual only) */}
          {mode === "dual" && (
            <ControlButton
              icon={<UilSync size={14} />}
              tooltip="Swap panes"
              onClick={swapPanes}
            />
          )}

          {/* Upgrade dual → quad */}
          {mode === "dual" && (
            <ControlButton
              icon={<UilGrid size={14} />}
              tooltip="Quad split (2x2)"
              onClick={() => splitQuad()}
            />
          )}

          {/* Close all splits */}
          <ControlButton
            icon={<UilTimes size={14} />}
            tooltip="Close split"
            onClick={closeAll}
          />
        </>
      ) : (
        <>
          {/* Dual split picker */}
          <div className="relative">
            <ControlButton
              ref={splitBtnRef}
              icon={<UilColumns size={14} />}
              tooltip="Split view"
              onClick={() => setSplitPickerOpen(!splitPickerOpen)}
              active={splitPickerOpen}
            />
            {splitPickerOpen && (
              <PagePicker
                onSelect={(path) => {
                  splitRight(path);
                  setSplitPickerOpen(false);
                }}
                onClose={() => setSplitPickerOpen(false)}
                excludePath={currentPath}
                anchorRef={splitBtnRef}
              />
            )}
          </div>

          {/* Quad split — instant 2x2 */}
          <ControlButton
            icon={<UilGrid size={14} />}
            tooltip="Quad split (2x2)"
            onClick={() => splitQuad()}
          />
        </>
      )}
    </div>
  );
}

// ─── Reusable button ─────────────────────────────────────────────────────────

const ControlButton = forwardRef<
  HTMLButtonElement,
  {
    icon: React.ReactNode;
    tooltip: string;
    onClick: () => void;
    active?: boolean;
  }
>(({ icon, tooltip, onClick, active }, ref) => (
  <button
    ref={ref}
    onClick={onClick}
    title={tooltip}
    className={`flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150 ${
      active
        ? "bg-zinc-700/80 text-zinc-100"
        : "bg-zinc-800/60 text-zinc-500 hover:bg-zinc-700/60 hover:text-zinc-300"
    } backdrop-blur-sm border border-zinc-700/40`}
  >
    {icon}
  </button>
));
ControlButton.displayName = "ControlButton";
