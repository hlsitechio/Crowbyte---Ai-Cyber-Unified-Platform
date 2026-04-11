/**
 * SplitScreenLayout — Single, Dual (left/right), or Quad (2x2 grid) layout.
 * Cross-hair resizable dividers in quad mode.
 */
import { useState, useCallback, useRef, useEffect, type ReactNode, Suspense } from "react";
import { createPortal } from "react-dom";
import { useSplitScreen, type PanePosition } from "@/contexts/split-screen";
import { getPageByPath, PAGE_REGISTRY } from "@/lib/page-registry";
import { PaneHeader } from "@/components/TabController";
import { PaneContextMenu, triggerPaneContextMenu } from "@/components/PaneContextMenu";

interface Props {
  children: ReactNode;
}

// ─── Pane Loading Skeleton ───────────────────────────────────────────────────

function PaneLoader() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-zinc-600 border-t-zinc-300 rounded-full animate-spin" />
        <span className="text-xs text-zinc-500">Loading...</span>
      </div>
    </div>
  );
}

// ─── Empty Pane (no page selected yet) ───────────────────────────────────────

function EmptyPane({ position }: { position: PanePosition }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="text-zinc-600 text-sm mb-1">Empty Pane</div>
        <div className="text-zinc-700 text-xs">Use the header dropdown to select a page</div>
      </div>
    </div>
  );
}

// ─── Page Content Renderer ───────────────────────────────────────────────────

function PaneContent({ path }: { path: string }) {
  const entry = getPageByPath(path);
  if (!entry) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
        Page not found: {path}
      </div>
    );
  }
  const Component = entry.component;
  return (
    <Suspense fallback={<PaneLoader />}>
      <Component />
    </Suspense>
  );
}

// ─── Vertical Divider (col-resize) ──────────────────────────────────────────

function VerticalDivider({
  onDrag,
  currentRatio,
}: {
  onDrag: (newRatio: number) => void;
  currentRatio: number;
}) {
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);

      const startX = e.clientX;
      const startRatio = currentRatio;
      const containerWidth = ref.current?.parentElement?.clientWidth || 1;

      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        onDrag(startRatio + (delta / containerWidth) * 100);
      };
      const onUp = () => {
        setDragging(false);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [onDrag, currentRatio]
  );

  return (
    <div
      ref={ref}
      onMouseDown={handleMouseDown}
      className={`relative flex-shrink-0 w-1 cursor-col-resize group z-10 ${
        dragging ? "bg-blue-500/40" : ""
      }`}
    >
      <div
        className={`absolute inset-y-0 left-0 w-px transition-colors ${
          dragging ? "bg-blue-500" : "bg-zinc-800 group-hover:bg-zinc-600"
        }`}
      />
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}

// ─── Horizontal Divider (row-resize) ─────────────────────────────────────────

function HorizontalDivider({
  onDrag,
  currentRatio,
}: {
  onDrag: (newRatio: number) => void;
  currentRatio: number;
}) {
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);

      const startY = e.clientY;
      const startRatio = currentRatio;
      const containerHeight = ref.current?.parentElement?.clientHeight || 1;

      const onMove = (ev: MouseEvent) => {
        const delta = ev.clientY - startY;
        onDrag(startRatio + (delta / containerHeight) * 100);
      };
      const onUp = () => {
        setDragging(false);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
    },
    [onDrag, currentRatio]
  );

  return (
    <div
      ref={ref}
      onMouseDown={handleMouseDown}
      className={`relative flex-shrink-0 h-1 cursor-row-resize group z-10 ${
        dragging ? "bg-blue-500/40" : ""
      }`}
    >
      <div
        className={`absolute inset-x-0 top-0 h-px transition-colors ${
          dragging ? "bg-blue-500" : "bg-zinc-800 group-hover:bg-zinc-600"
        }`}
      />
      <div className="absolute inset-x-0 -top-1 -bottom-1" />
    </div>
  );
}

// ─── Cross-hair Center Handle (quad only) ────────────────────────────────────

function CrosshairHandle({
  colRatio,
  rowRatio,
  onDragCol,
  onDragRow,
}: {
  colRatio: number;
  rowRatio: number;
  onDragCol: (r: number) => void;
  onDragRow: (r: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragging(true);

      const startX = e.clientX;
      const startY = e.clientY;
      const startCol = colRatio;
      const startRow = rowRatio;
      const parent = ref.current?.closest('.quad-grid-container') as HTMLElement;
      const cw = parent?.clientWidth || 1;
      const ch = parent?.clientHeight || 1;

      const onMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        onDragCol(startCol + (dx / cw) * 100);
        onDragRow(startRow + (dy / ch) * 100);
      };
      const onUp = () => {
        setDragging(false);
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      document.body.style.cursor = "move";
      document.body.style.userSelect = "none";
    },
    [colRatio, rowRatio, onDragCol, onDragRow]
  );

  return (
    <div
      ref={ref}
      onMouseDown={handleMouseDown}
      className="absolute z-20 cursor-move"
      style={{
        left: `calc(${colRatio}% - 6px)`,
        top: `calc(${rowRatio}% - 6px)`,
        width: 12,
        height: 12,
      }}
    >
      <div
        className={`w-3 h-3 rounded-full border-2 transition-colors ${
          dragging
            ? "bg-blue-500 border-blue-400 shadow-lg shadow-blue-500/30"
            : "bg-zinc-700 border-zinc-500 hover:bg-zinc-600 hover:border-zinc-400"
        }`}
      />
    </div>
  );
}

// ─── Single Quad Pane ────────────────────────────────────────────────────────

function QuadPane({
  position,
  path,
  onClick,
}: {
  position: PanePosition;
  path: string | null;
  onClick: () => void;
}) {
  return (
    <div
      className="flex flex-col h-full w-full min-w-0 min-h-0"
      onClick={onClick}
      onContextMenu={(e) => triggerPaneContextMenu(e, position, path)}
    >
      <PaneHeader direction={position} currentPath={path || ""} />
      <div
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3"
        style={{ overscrollBehavior: "contain" }}
      >
        {path ? <PaneContent path={path} /> : <EmptyPane position={position} />}
      </div>
    </div>
  );
}

// ─── Zoom Overlay (Focus / Reading Mode) ─────────────────────────────────────

function ZoomOverlay() {
  const ctx = useSplitScreen();
  const { mode, zoomedPane, unzoom, left, right, topLeft, topRight, bottomLeft, bottomRight } = ctx;

  // Esc key to exit
  useEffect(() => {
    if (!zoomedPane) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") unzoom();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [zoomedPane, unzoom]);

  if (!zoomedPane) return null;

  // Resolve path for zoomed pane
  let zoomedPath: string | null = null;
  if (mode === "dual") {
    zoomedPath = (zoomedPane === "topLeft" || zoomedPane === "bottomLeft")
      ? left?.path || null
      : right?.path || null;
  } else if (mode === "quad") {
    const paneMap: Record<PanePosition, typeof topLeft> = { topLeft, topRight, bottomLeft, bottomRight };
    zoomedPath = paneMap[zoomedPane]?.path || null;
  }

  if (!zoomedPath) return null;

  const page = PAGE_REGISTRY.find(p => p.path === zoomedPath);

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      onClick={(e) => {
        // Click on backdrop → exit zoom
        if (e.target === e.currentTarget) unzoom();
      }}
    >
      {/* Animation keyframes */}
      <style>{`
        @keyframes zoomPaneIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes zoomBackdropIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        style={{ animation: "zoomBackdropIn 150ms ease-out forwards" }}
      />

      {/* Zoomed pane */}
      <div
        className="relative w-[92%] h-[92%] rounded-xl border border-zinc-700/60 bg-card shadow-2xl shadow-black/60 overflow-hidden flex flex-col"
        style={{ animation: "zoomPaneIn 200ms ease-out forwards" }}
      >
        {/* Header */}
        <PaneHeader direction={zoomedPane} currentPath={zoomedPath} />

        {/* Content */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-6" style={{ overscrollBehavior: "contain" }}>
          <PaneContent path={zoomedPath} />
        </div>

        {/* Keyboard hint */}
        <div className="absolute bottom-3 right-3 text-[9px] text-zinc-600 font-mono pointer-events-none">
          ESC to exit
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Layout ─────────────────────────────────────────────────────────────

export function SplitScreenLayout({ children }: Props) {
  const ctx = useSplitScreen();
  const { mode, left, right, topLeft, topRight, bottomLeft, bottomRight,
          colRatio, rowRatio, leftRowRatio, rightRowRatio, zoomedPane,
          setColRatio, setRowRatio, setLeftRowRatio, setRightRowRatio, setFocusedPane } = ctx;

  // ─── Single pane ─────────────────────
  if (mode === "none") {
    return <>{children}</>;
  }

  // ─── Dual mode (left/right) ──────────
  if (mode === "dual" && left && right) {
    return (
      <div className="flex h-full w-full overflow-hidden">
        <ZoomOverlay />
        <PaneContextMenu />
        <div
          className="flex flex-col min-w-0 overflow-hidden border-r border-zinc-800/50"
          style={{ width: `${colRatio}%` }}
          onClick={() => setFocusedPane("topLeft")}
          onContextMenu={(e) => triggerPaneContextMenu(e, "topLeft", left.path)}
        >
          <PaneHeader direction="left" currentPath={left.path} />
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6" style={{ overscrollBehavior: "contain" }}>
            <PaneContent path={left.path} />
          </div>
        </div>
        <VerticalDivider currentRatio={colRatio} onDrag={setColRatio} />
        <div
          className="flex flex-col min-w-0 overflow-hidden flex-1"
          onClick={() => setFocusedPane("topRight")}
          onContextMenu={(e) => triggerPaneContextMenu(e, "topRight", right.path)}
        >
          <PaneHeader direction="right" currentPath={right.path} />
          <div className="flex-1 overflow-y-auto overflow-x-hidden p-6" style={{ overscrollBehavior: "contain" }}>
            <PaneContent path={right.path} />
          </div>
        </div>
      </div>
    );
  }

  // ─── Quad mode (2x2 grid — independent row ratios per column) ───────────
  if (mode === "quad") {
    return (
      <div className="flex h-full w-full overflow-hidden">
        <ZoomOverlay />
        <PaneContextMenu />
        {/* ─── Left Column ─── */}
        <div
          className="flex flex-col min-w-0 min-h-0 overflow-hidden"
          style={{ width: `${colRatio}%` }}
        >
          {/* Top-Left pane */}
          <div className="min-h-0 border-b border-zinc-800/50 border-r border-zinc-800/50" style={{ height: `${leftRowRatio}%` }}>
            <QuadPane
              position="topLeft"
              path={topLeft?.path || null}
              onClick={() => setFocusedPane("topLeft")}
            />
          </div>

          {/* Left column horizontal divider */}
          <HorizontalDivider currentRatio={leftRowRatio} onDrag={setLeftRowRatio} />

          {/* Bottom-Left pane */}
          <div className="flex-1 min-h-0 border-r border-zinc-800/50">
            <QuadPane
              position="bottomLeft"
              path={bottomLeft?.path || null}
              onClick={() => setFocusedPane("bottomLeft")}
            />
          </div>
        </div>

        {/* ─── Vertical Divider (between columns) ─── */}
        <VerticalDivider currentRatio={colRatio} onDrag={setColRatio} />

        {/* ─── Right Column ─── */}
        <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
          {/* Top-Right pane */}
          <div className="min-h-0 border-b border-zinc-800/50" style={{ height: `${rightRowRatio}%` }}>
            <QuadPane
              position="topRight"
              path={topRight?.path || null}
              onClick={() => setFocusedPane("topRight")}
            />
          </div>

          {/* Right column horizontal divider */}
          <HorizontalDivider currentRatio={rightRowRatio} onDrag={setRightRowRatio} />

          {/* Bottom-Right pane */}
          <div className="flex-1 min-h-0">
            <QuadPane
              position="bottomRight"
              path={bottomRight?.path || null}
              onClick={() => setFocusedPane("bottomRight")}
            />
          </div>
        </div>
      </div>
    );
  }

  // Fallback
  return <>{children}</>;
}
