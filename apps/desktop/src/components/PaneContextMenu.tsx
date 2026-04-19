/**
 * PaneContextMenu — Custom right-click menu for split/quad panes.
 * Replaces the browser default context menu with pane-specific actions.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { UilSync, UilCopy, UilTimes, UilColumns, UilGrid, UilAngleRight, UilExpandArrows, UilExpandArrowsAlt, UilExchange } from "@iconscout/react-unicons";
import { useSplitScreen, type PanePosition, type SplitDirection } from "@/contexts/split-screen";
import { getPagesBySection, SECTION_LABELS, PAGE_REGISTRY } from "@/lib/page-registry";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  pane: PanePosition;
  panePath: string | null;
}

// ─── Context Menu Provider ──────────────────────────────────────────────────

// Global event bus for triggering the context menu from panes
type ContextMenuTrigger = (e: React.MouseEvent, pane: PanePosition, panePath: string | null) => void;
let globalTrigger: ContextMenuTrigger | null = null;

// eslint-disable-next-line react-refresh/only-export-components
export function triggerPaneContextMenu(e: React.MouseEvent, pane: PanePosition, panePath: string | null) {
  if (globalTrigger) globalTrigger(e, pane, panePath);
}

// ─── Menu Item Components ───────────────────────────────────────────────────

function MenuItem({
  icon,
  label,
  shortcut,
  onClick,
  danger,
  disabled,
}: {
  icon?: React.ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-left transition-colors rounded-[4px] ${
        disabled
          ? "text-zinc-600 cursor-not-allowed"
          : danger
            ? "text-red-400 hover:bg-red-500/10 hover:text-red-300"
            : "text-zinc-300 hover:bg-zinc-700/60 hover:text-zinc-100"
      }`}
    >
      {icon && <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 opacity-60">{icon}</span>}
      <span className="flex-1 truncate">{label}</span>
      {shortcut && <span className="text-[9px] text-zinc-600 font-mono ml-2">{shortcut}</span>}
    </button>
  );
}

function MenuDivider() {
  return <div className="h-px bg-zinc-800 my-1 mx-2" />;
}

function SubMenu({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [subPos, setSubPos] = useState<"right" | "left">("right");

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (rect.right + 200 > window.innerWidth) setSubPos("left");
      else setSubPos("right");
    }
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-700/60 hover:text-zinc-100 transition-colors rounded-[4px] cursor-default">
        {icon && <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 opacity-60">{icon}</span>}
        <span className="flex-1 truncate">{label}</span>
        <UilAngleRight size={8} className="text-zinc-500" />
      </div>

      {open && (
        <div
          className={`absolute top-0 w-52 bg-zinc-900 border border-zinc-700/60 rounded-lg shadow-2xl p-1 z-10 ${
            subPos === "right" ? "left-full ml-1" : "right-full mr-1"
          }`}
        >
          <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Context Menu ──────────────────────────────────────────────────────

export function PaneContextMenu() {
  const ctx = useSplitScreen();
  const {
    mode, focusedPane, zoomedPane,
    left, right, topLeft, topRight, bottomLeft, bottomRight,
    setFocusedPane, setPanePage, setQuadPanePage,
    closeSplit, closeQuad, closeAll,
    swapPanes, swapQuadPanes,
    zoomPane, unzoom, detachTab,
    splitRight, splitQuad,
  } = ctx;

  const [menu, setMenu] = useState<ContextMenuState>({
    visible: false, x: 0, y: 0, pane: "topLeft", panePath: null,
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // Register global trigger
  const handleTrigger: ContextMenuTrigger = useCallback((e, pane, panePath) => {
    e.preventDefault();
    e.stopPropagation();

    // Position — keep menu within viewport
    let x = e.clientX;
    let y = e.clientY;
    const menuWidth = 220;
    const menuHeight = 380;
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 8;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 8;
    if (x < 4) x = 4;
    if (y < 4) y = 4;

    setMenu({ visible: true, x, y, pane, panePath });
    setFocusedPane(pane);
  }, [setFocusedPane]);

  useEffect(() => {
    globalTrigger = handleTrigger;
    return () => { globalTrigger = null; };
  }, [handleTrigger]);

  // Close on click outside or Escape
  useEffect(() => {
    if (!menu.visible) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(m => ({ ...m, visible: false }));
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(m => ({ ...m, visible: false }));
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menu.visible]);

  // Close menu helper
  const close = () => setMenu(m => ({ ...m, visible: false }));
  const act = (fn: () => void) => () => { fn(); close(); };

  if (!menu.visible || mode === "none") return null;

  const currentPage = PAGE_REGISTRY.find(p => p.path === menu.panePath);
  const sections = getPagesBySection();
  const isZoomed = zoomedPane === menu.pane;
  const isDual = mode === "dual";
  const isQuad = mode === "quad";

  // Swap targets for quad mode
  const quadPositions: PanePosition[] = ["topLeft", "topRight", "bottomLeft", "bottomRight"];
  const otherPanes = quadPositions.filter(p => p !== menu.pane);

  const posLabel: Record<string, string> = {
    topLeft: "Top Left", topRight: "Top Right",
    bottomLeft: "Bottom Left", bottomRight: "Bottom Right",
  };

  // Page change handler
  const handleChangePage = (path: string) => {
    if (isDual) {
      const dir: SplitDirection = (menu.pane === "topLeft" || menu.pane === "bottomLeft") ? "left" : "right";
      setPanePage(dir, path);
    } else if (isQuad) {
      setQuadPanePage(menu.pane, path);
    }
    close();
  };

  // Close pane handler
  const handleClose = () => {
    if (isQuad) {
      closeQuad(menu.pane);
    } else if (isDual) {
      const keepDir: SplitDirection = (menu.pane === "topLeft" || menu.pane === "bottomLeft") ? "right" : "left";
      closeSplit(keepDir);
    }
    close();
  };

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-[400] w-56 bg-zinc-900/95 backdrop-blur-md border border-zinc-700/60 rounded-lg shadow-2xl shadow-black/50 p-1 overflow-hidden"
      style={{ left: menu.x, top: menu.y, animation: "ctxMenuIn 120ms ease-out forwards" }}
    >
      <style>{`
        @keyframes ctxMenuIn {
          from { opacity: 0; transform: scale(0.95) translateY(-4px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>

      {/* Pane identity */}
      <div className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-zinc-500 flex items-center gap-1.5">
        <span className={`w-1.5 h-1.5 rounded-full ${focusedPane === menu.pane ? "bg-blue-400" : "bg-zinc-600"}`} />
        {currentPage?.title || "Empty Pane"}
        {isQuad && <span className="ml-auto text-zinc-600 font-mono">{posLabel[menu.pane]}</span>}
      </div>

      <MenuDivider />

      {/* Focus / Zoom */}
      <MenuItem
        icon={<UilExpandArrows size={14} />}
        label={isZoomed ? "Exit Focus Mode" : "Focus Mode"}
        shortcut="Dbl-click"
        onClick={act(() => isZoomed ? unzoom() : zoomPane(menu.pane))}
      />

      {/* Pop out */}
      {menu.panePath && (
        <MenuItem
          icon={<UilExpandArrowsAlt size={14} />}
          label="Pop Out to Window"
          onClick={act(() => detachTab(menu.panePath!))}
        />
      )}

      <MenuDivider />

      {/* Change Page submenu */}
      <SubMenu icon={<UilColumns size={14} />} label="Change Page">
        {Object.entries(sections).map(([key, pages]) => {
          if (pages.length === 0) return null;
          return (
            <div key={key}>
              <div className="px-3 pt-2 pb-1 text-[8px] font-semibold uppercase tracking-widest text-zinc-500">
                {SECTION_LABELS[key]}
              </div>
              {pages.map(page => (
                <MenuItem
                  key={page.path}
                  label={page.title}
                  onClick={() => handleChangePage(page.path)}
                  disabled={page.path === menu.panePath}
                />
              ))}
            </div>
          );
        })}
      </SubMenu>

      <MenuDivider />

      {/* Swap */}
      {isDual && (
        <MenuItem
          icon={<UilExchange size={14} />}
          label="Swap Panes"
          onClick={act(swapPanes)}
        />
      )}

      {isQuad && (
        <SubMenu icon={<UilExchange size={14} />} label="Swap With">
          {otherPanes.map(target => {
            const targetPaneMap: Record<PanePosition, typeof topLeft> = { topLeft, topRight, bottomLeft, bottomRight };
            const targetPath = targetPaneMap[target]?.path;
            const targetPage = targetPath ? PAGE_REGISTRY.find(p => p.path === targetPath) : null;
            return (
              <MenuItem
                key={target}
                label={`${posLabel[target]}${targetPage ? ` (${targetPage.title})` : ""}`}
                onClick={act(() => swapQuadPanes(menu.pane, target))}
              />
            );
          })}
        </SubMenu>
      )}

      {/* Duplicate */}
      {menu.panePath && isQuad && (
        <MenuItem
          icon={<UilCopy size={14} />}
          label="Duplicate to Empty Pane"
          onClick={act(() => {
            const emptyPane = quadPositions.find(p => {
              const map: Record<PanePosition, typeof topLeft> = { topLeft, topRight, bottomLeft, bottomRight };
              return !map[p]?.path && p !== menu.pane;
            });
            if (emptyPane) setQuadPanePage(emptyPane, menu.panePath!);
          })}
          disabled={!quadPositions.some(p => {
            const map: Record<PanePosition, typeof topLeft> = { topLeft, topRight, bottomLeft, bottomRight };
            return !map[p]?.path && p !== menu.pane;
          })}
        />
      )}

      {/* Layout upgrades */}
      {isDual && (
        <>
          <MenuDivider />
          <MenuItem
            icon={<UilGrid size={14} />}
            label="Upgrade to Quad Split"
            onClick={act(() => splitQuad())}
          />
        </>
      )}

      <MenuDivider />

      {/* Close this pane */}
      <MenuItem
        icon={<UilTimes size={14} />}
        label="Close This Pane"
        onClick={act(handleClose)}
      />

      {/* Close all */}
      <MenuItem
        icon={<UilTimes size={14} />}
        label="Close All Splits"
        onClick={act(closeAll)}
        danger
      />
    </div>,
    document.body
  );
}
