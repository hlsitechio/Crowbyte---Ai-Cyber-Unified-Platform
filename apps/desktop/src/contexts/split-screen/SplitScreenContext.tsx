import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export type SplitDirection = "left" | "right";
export type PanePosition = "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
export type SplitMode = "none" | "dual" | "quad";

export interface SplitPane {
  /** Route path of the page rendered in this pane */
  path: string;
}

export interface SplitScreenState {
  /** Current split mode */
  mode: SplitMode;
  /** Legacy: true when mode !== 'none' */
  isSplit: boolean;

  // ─── Dual mode panes ─────────────────────
  left: SplitPane | null;
  right: SplitPane | null;

  // ─── Quad mode panes ─────────────────────
  topLeft: SplitPane | null;
  topRight: SplitPane | null;
  bottomLeft: SplitPane | null;
  bottomRight: SplitPane | null;

  /** Which pane is focused (dual uses left/right mapped to quad positions) */
  focusedPane: PanePosition;
  /** Which pane is zoomed to center overlay (null = no zoom) */
  zoomedPane: PanePosition | null;
  /** Column ratio: left column width % (20-80) */
  colRatio: number;
  /** Row ratio: top row height % (20-80, quad only) — shared for dual/fallback */
  rowRatio: number;
  /** Independent row ratios per column (quad only) */
  leftRowRatio: number;
  rightRowRatio: number;
}

export interface SplitScreenContextValue extends SplitScreenState {
  // ─── Dual mode actions ─────────────────────
  splitRight: (rightPath: string) => void;
  splitLeft: (leftPath: string) => void;
  setPanePage: (direction: SplitDirection, path: string) => void;
  closeSplit: (keepPane?: SplitDirection) => void;
  swapPanes: () => void;
  setFocusedPane: (pane: PanePosition) => void;
  /** @deprecated use setColRatio */
  setSplitRatio: (ratio: number) => void;
  setColRatio: (ratio: number) => void;
  setRowRatio: (ratio: number) => void;
  setLeftRowRatio: (ratio: number) => void;
  setRightRowRatio: (ratio: number) => void;
  detachTab: (path: string) => void;

  // ─── Quad mode actions ─────────────────────
  /** Activate quad split. Current page → topLeft, pick 3 others or null for empty */
  splitQuad: (pages?: { topRight?: string; bottomLeft?: string; bottomRight?: string }) => void;
  /** Change page in a quad pane */
  setQuadPanePage: (position: PanePosition, path: string) => void;
  /** Close quad mode, keeping specified pane */
  closeQuad: (keepPane?: PanePosition) => void;
  /** Close the entire split (any mode) */
  closeAll: () => void;
  /** Swap two quad panes */
  swapQuadPanes: (a: PanePosition, b: PanePosition) => void;

  // ─── Zoom/Focus mode ─────────────────────
  /** Zoom a pane to center overlay (reading mode) */
  zoomPane: (position: PanePosition) => void;
  /** Exit zoom mode */
  unzoom: () => void;

  // ─── Compat ─────────────────────
  /** Legacy splitRatio accessor */
  splitRatio: number;
}

const SplitScreenContext = createContext<SplitScreenContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useSplitScreen() {
  const ctx = useContext(SplitScreenContext);
  if (!ctx) throw new Error("useSplitScreen must be used within SplitScreenProvider");
  return ctx;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSplitScreenSafe() {
  return useContext(SplitScreenContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

interface Props {
  currentPath: string;
  children: ReactNode;
}

const clamp = (v: number, min = 20, max = 80) => Math.max(min, Math.min(max, v));

export function SplitScreenProvider({ currentPath, children }: Props) {
  const [state, setState] = useState<SplitScreenState>({
    mode: "none",
    isSplit: false,
    left: null,
    right: null,
    topLeft: null,
    topRight: null,
    bottomLeft: null,
    bottomRight: null,
    focusedPane: "topLeft",
    zoomedPane: null,
    colRatio: 50,
    rowRatio: 50,
    leftRowRatio: 50,
    rightRowRatio: 50,
  });

  // ─── Dual mode ─────────────────────────────────

  const splitRight = useCallback((rightPath: string) => {
    setState((s) => ({
      ...s,
      mode: "dual",
      isSplit: true,
      left: { path: currentPath },
      right: { path: rightPath },
      focusedPane: "topRight",
    }));
  }, [currentPath]);

  const splitLeft = useCallback((leftPath: string) => {
    setState((s) => ({
      ...s,
      mode: "dual",
      isSplit: true,
      left: { path: leftPath },
      right: { path: currentPath },
      focusedPane: "topLeft",
    }));
  }, [currentPath]);

  const setPanePage = useCallback((direction: SplitDirection, path: string) => {
    setState((s) => ({ ...s, [direction]: { path } }));
  }, []);

  const closeSplit = useCallback((keepPane: SplitDirection = "left") => {
    setState((s) => {
      const keptPath = keepPane === "left" ? s.left?.path : s.right?.path;
      if (keptPath && keptPath !== currentPath) {
        window.history.pushState(null, "", keptPath);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
      return {
        ...s,
        mode: "none",
        isSplit: false,
        left: null,
        right: null,
        topLeft: null,
        topRight: null,
        bottomLeft: null,
        bottomRight: null,
        focusedPane: "topLeft",
        zoomedPane: null,
      };
    });
  }, [currentPath]);

  const swapPanes = useCallback(() => {
    setState((s) => ({ ...s, left: s.right, right: s.left }));
  }, []);

  // ─── Quad mode ─────────────────────────────────

  const splitQuad = useCallback((pages?: { topRight?: string; bottomLeft?: string; bottomRight?: string }) => {
    setState((s) => ({
      ...s,
      mode: "quad",
      isSplit: true,
      // Keep dual panes nulled
      left: null,
      right: null,
      // Set quad panes
      topLeft: { path: currentPath },
      topRight: pages?.topRight ? { path: pages.topRight } : null,
      bottomLeft: pages?.bottomLeft ? { path: pages.bottomLeft } : null,
      bottomRight: pages?.bottomRight ? { path: pages.bottomRight } : null,
      focusedPane: "topLeft",
      colRatio: 50,
      rowRatio: 50,
      leftRowRatio: 50,
      rightRowRatio: 50,
    }));
  }, [currentPath]);

  const setQuadPanePage = useCallback((position: PanePosition, path: string) => {
    setState((s) => ({ ...s, [position]: { path } }));
  }, []);

  const swapQuadPanes = useCallback((a: PanePosition, b: PanePosition) => {
    if (a === b) return;
    setState((s) => ({
      ...s,
      [a]: s[b],
      [b]: s[a],
    }));
  }, []);

  const closeQuad = useCallback((closedPane: PanePosition = "topLeft") => {
    setState((s) => {
      // Determine which panes survive after closing one
      const isLeftCol = closedPane === "topLeft" || closedPane === "bottomLeft";
      const isTop = closedPane === "topLeft" || closedPane === "topRight";

      // The partner in the same column (the one that stays in that column)
      const sameColPartner: PanePosition = isLeftCol
        ? (isTop ? "bottomLeft" : "topLeft")
        : (isTop ? "bottomRight" : "topRight");

      // The two panes in the opposite column
      const oppositeTop: PanePosition = isLeftCol ? "topRight" : "topLeft";
      const oppositeBottom: PanePosition = isLeftCol ? "bottomRight" : "bottomLeft";

      const partnerPath = s[sameColPartner]?.path || null;
      const oppTopPath = s[oppositeTop]?.path || null;
      const oppBottomPath = s[oppositeBottom]?.path || null;

      // Count surviving panes with content
      const surviving = [partnerPath, oppTopPath, oppBottomPath].filter(Boolean);

      if (surviving.length <= 1) {
        // Only 0-1 panes left → exit to single mode
        const keptPath = partnerPath || oppTopPath || oppBottomPath;
        if (keptPath && keptPath !== currentPath) {
          window.history.pushState(null, "", keptPath);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
        return {
          ...s,
          mode: "none" as const,
          isSplit: false,
          left: null, right: null,
          topLeft: null, topRight: null, bottomLeft: null, bottomRight: null,
          focusedPane: "topLeft" as PanePosition,
          zoomedPane: null,
        };
      }

      // Downgrade to dual mode:
      // - The surviving partner from the closed pane's column → one side
      // - The opposite column merges: if both exist, keep the one in the same row as partner
      //   Actually simpler: partner goes to one side, opposite column's "best" pane goes to other

      // If opposite column has both panes, we still go to dual (2 panes max)
      // Strategy: the column that lost a pane collapses to its survivor,
      //           the opposite column picks the pane in the same position as the closed one
      //           (or falls back to whichever exists)

      // But actually — if we close bottomLeft, we have topLeft + topRight + bottomRight
      // That's 3 panes → can't fit in dual. Best UX: merge each column to one pane.
      // Left column: topLeft survives. Right column: pick topRight (prefer top, or whichever has content).

      // Simpler approach: the closed pane's column keeps its partner.
      // The opposite column keeps both — but dual only has 2 slots.
      // So: merge opposite column by keeping the one at the same vertical position as the survivor.

      // Actually the cleanest UX: close the pane, collapse that column to its partner,
      // opposite column keeps BOTH merged into that side. But dual = left/right with one page each.
      // Let's just keep top panes from each column (or the survivor if only one).

      let leftPath: string | null;
      let rightPath: string | null;

      if (isLeftCol) {
        // Closed a left-column pane → partner is the left side
        leftPath = partnerPath;
        // Right column: prefer the pane that has content, top first
        rightPath = oppTopPath || oppBottomPath;
      } else {
        // Closed a right-column pane → partner is the right side
        rightPath = partnerPath;
        // Left column: prefer top
        leftPath = oppTopPath || oppBottomPath;
      }

      // If one side is empty, go to single
      if (!leftPath || !rightPath) {
        const keptPath = leftPath || rightPath;
        if (keptPath && keptPath !== currentPath) {
          window.history.pushState(null, "", keptPath);
          window.dispatchEvent(new PopStateEvent("popstate"));
        }
        return {
          ...s,
          mode: "none" as const,
          isSplit: false,
          left: null, right: null,
          topLeft: null, topRight: null, bottomLeft: null, bottomRight: null,
          focusedPane: "topLeft" as PanePosition,
          zoomedPane: null,
        };
      }

      return {
        ...s,
        mode: "dual" as const,
        isSplit: true,
        left: { path: leftPath },
        right: { path: rightPath },
        topLeft: null, topRight: null, bottomLeft: null, bottomRight: null,
        focusedPane: isLeftCol ? "topRight" : "topLeft" as PanePosition,
        zoomedPane: null,
        colRatio: 50,
      };
    });
  }, [currentPath]);

  const closeAll = useCallback(() => {
    setState((s) => {
      // Navigate to whatever was in the focused pane
      const keptPath = s.mode === "dual"
        ? (s.focusedPane === "topLeft" || s.focusedPane === "bottomLeft" ? s.left?.path : s.right?.path)
        : s[s.focusedPane]?.path;
      if (keptPath && keptPath !== currentPath) {
        window.history.pushState(null, "", keptPath);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
      return {
        ...s,
        mode: "none",
        isSplit: false,
        left: null,
        right: null,
        topLeft: null,
        topRight: null,
        bottomLeft: null,
        bottomRight: null,
        focusedPane: "topLeft",
        zoomedPane: null,
      };
    });
  }, [currentPath]);

  // ─── Shared ─────────────────────────────────

  const setFocusedPane = useCallback((pane: PanePosition) => {
    setState((s) => ({ ...s, focusedPane: pane }));
  }, []);

  const zoomPane = useCallback((position: PanePosition) => {
    setState((s) => ({ ...s, zoomedPane: position, focusedPane: position }));
  }, []);

  const unzoom = useCallback(() => {
    setState((s) => ({ ...s, zoomedPane: null }));
  }, []);

  const setColRatio = useCallback((ratio: number) => {
    setState((s) => ({ ...s, colRatio: clamp(ratio) }));
  }, []);

  const setRowRatio = useCallback((ratio: number) => {
    setState((s) => ({ ...s, rowRatio: clamp(ratio) }));
  }, []);

  const setLeftRowRatio = useCallback((ratio: number) => {
    setState((s) => ({ ...s, leftRowRatio: clamp(ratio) }));
  }, []);

  const setRightRowRatio = useCallback((ratio: number) => {
    setState((s) => ({ ...s, rightRowRatio: clamp(ratio) }));
  }, []);

  const setSplitRatio = useCallback((ratio: number) => {
    setState((s) => ({ ...s, colRatio: clamp(ratio) }));
  }, []);

  const detachTab = useCallback((path: string) => {
    const url = `${window.location.origin}${window.location.pathname}#${path}`;
    const w = window.open(url, "_blank", "width=1200,height=800,menubar=no,toolbar=no");
    if (w) w.focus();
  }, []);

  return (
    <SplitScreenContext.Provider
      value={{
        ...state,
        splitRatio: state.colRatio,
        splitRight,
        splitLeft,
        setPanePage,
        closeSplit,
        swapPanes,
        setFocusedPane,
        setSplitRatio,
        setColRatio,
        setRowRatio,
        setLeftRowRatio,
        setRightRowRatio,
        detachTab,
        splitQuad,
        setQuadPanePage,
        closeQuad,
        closeAll,
        swapQuadPanes,
        zoomPane,
        unzoom,
      }}
    >
      {children}
    </SplitScreenContext.Provider>
  );
}

export { SplitScreenContext };
