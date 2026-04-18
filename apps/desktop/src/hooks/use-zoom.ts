/**
 * useZoom — Ctrl+Wheel app zoom with snap steps.
 * Electron: uses webFrame.setZoomFactor (real Chromium zoom).
 * Web: falls back to CSS zoom on document root.
 */
import { useEffect, useRef, useCallback } from "react";
import { IS_ELECTRON } from "@/lib/platform";

// Snap steps in percentage: 25, 35, 45 … 100 … 200
const ZOOM_STEPS = [25, 35, 45, 55, 65, 75, 85, 100, 110, 125, 150, 175, 200];
const DEFAULT_ZOOM = 100;
const STORAGE_KEY = "crowbyte-zoom";

function snapToStep(pct: number, direction: 1 | -1): number {
  if (direction === 1) {
    // zoom in: find first step GREATER than current
    return ZOOM_STEPS.find(s => s > pct + 0.5) ?? ZOOM_STEPS[ZOOM_STEPS.length - 1];
  } else {
    // zoom out: find last step LESS than current
    const rev = [...ZOOM_STEPS].reverse();
    return rev.find(s => s < pct - 0.5) ?? ZOOM_STEPS[0];
  }
}

function showZoomToast(pct: number) {
  // Reuse or create a persistent indicator element
  let el = document.getElementById("__crowbyte-zoom-hud");
  if (!el) {
    el = document.createElement("div");
    el.id = "__crowbyte-zoom-hud";
    Object.assign(el.style, {
      position: "fixed",
      bottom: "24px",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: "99999",
      pointerEvents: "none",
      fontFamily: "ui-monospace, monospace",
      fontSize: "12px",
      padding: "4px 12px",
      borderRadius: "6px",
      background: "rgba(20,20,30,0.88)",
      color: "#a1a1aa",
      border: "1px solid rgba(255,255,255,0.08)",
      backdropFilter: "blur(8px)",
      transition: "opacity 0.2s ease",
    });
    document.body.appendChild(el);
  }
  el.textContent = `${pct}%`;
  el.style.opacity = "1";

  // Clear previous hide timer
  const prev = (el as any).__zoomTimer;
  if (prev) clearTimeout(prev);
  (el as any).__zoomTimer = setTimeout(() => {
    el!.style.opacity = "0";
  }, 1200);
}

function applyZoom(factor: number) {
  if (IS_ELECTRON) {
    (window as any).electronAPI?.zoom?.setFactor(factor);
  } else {
    (document.documentElement as HTMLElement).style.zoom = String(factor);
  }
}

function loadSavedZoom(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return Math.max(25, Math.min(200, parseInt(saved, 10)));
  } catch {}
  return DEFAULT_ZOOM;
}

export function useZoom() {
  const zoomRef = useRef<number>(loadSavedZoom());

  // Apply saved zoom on mount
  useEffect(() => {
    const pct = zoomRef.current;
    applyZoom(pct / 100);
  }, []);

  const setZoom = useCallback((pct: number) => {
    zoomRef.current = pct;
    applyZoom(pct / 100);
    showZoomToast(pct);
    try { localStorage.setItem(STORAGE_KEY, String(pct)); } catch {}
  }, []);

  useEffect(() => {
    if (!IS_ELECTRON) return; // Ctrl+Wheel resize is Electron-only
    const handler = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      e.stopPropagation();

      const direction = e.deltaY < 0 ? 1 : -1; // scroll up = zoom in
      const next = snapToStep(zoomRef.current, direction as 1 | -1);
      if (next !== zoomRef.current) setZoom(next);
    };

    // Use passive: false so we can preventDefault (stops browser default zoom)
    window.addEventListener("wheel", handler, { passive: false, capture: true });
    return () => window.removeEventListener("wheel", handler, { capture: true });
  }, [setZoom]);

  return { zoom: zoomRef.current, setZoom };
}
