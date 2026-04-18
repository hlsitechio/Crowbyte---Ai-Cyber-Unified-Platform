import { useRef, useEffect, useCallback } from "react";

const CELL = 28;
const RADIUS = 4;
const BASE_ALPHA = 0.03;
const PEAK_ALPHA = 0.15;
const DECAY = 0.93;

export default function InteractiveGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const glowRef = useRef<Map<string, number>>(new Map());
  const rafRef = useRef<number>(0);
  const activeRef = useRef(false);

  const handleMove = useCallback((e: MouseEvent) => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    activeRef.current = true;
  }, []);

  const handleLeave = useCallback(() => {
    mouseRef.current = { x: -1000, y: -1000 };
    activeRef.current = false;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = container!.offsetWidth;
      const h = container!.offsetHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    const resizeObs = new ResizeObserver(resize);
    resizeObs.observe(container);

    function draw() {
      const w = container!.offsetWidth;
      const h = container!.offsetHeight;
      ctx!.clearRect(0, 0, w, h);

      const cols = Math.ceil(w / CELL) + 1;
      const rows = Math.ceil(h / CELL) + 1;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      // Update glow near cursor
      if (activeRef.current) {
        const mCol = Math.floor(mx / CELL);
        const mRow = Math.floor(my / CELL);
        for (let dr = -RADIUS; dr <= RADIUS; dr++) {
          for (let dc = -RADIUS; dc <= RADIUS; dc++) {
            const c = mCol + dc;
            const r = mRow + dr;
            if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
            const dist = Math.sqrt(dc * dc + dr * dr);
            if (dist > RADIUS) continue;
            const intensity = (1 - dist / RADIUS) * PEAK_ALPHA;
            const key = `${c},${r}`;
            const current = glowRef.current.get(key) || 0;
            glowRef.current.set(key, Math.max(current, intensity));
          }
        }
      }

      // Base grid lines
      ctx!.lineWidth = 1;
      ctx!.strokeStyle = `rgba(255,255,255,${BASE_ALPHA})`;
      ctx!.beginPath();
      for (let c = 0; c <= cols; c++) {
        const x = c * CELL;
        ctx!.moveTo(x, 0);
        ctx!.lineTo(x, h);
      }
      for (let r = 0; r <= rows; r++) {
        const y = r * CELL;
        ctx!.moveTo(0, y);
        ctx!.lineTo(w, y);
      }
      ctx!.stroke();

      // Glowing cells
      const toDelete: string[] = [];
      glowRef.current.forEach((alpha, key) => {
        const [cs, rs] = key.split(",");
        const c = parseInt(cs);
        const r = parseInt(rs);
        const x = c * CELL;
        const y = r * CELL;

        ctx!.fillStyle = `rgba(59,130,246,${alpha * 0.35})`;
        ctx!.fillRect(x + 1, y + 1, CELL - 1, CELL - 1);

        ctx!.strokeStyle = `rgba(59,130,246,${alpha * 0.8})`;
        ctx!.strokeRect(x, y, CELL, CELL);

        const next = alpha * DECAY;
        if (next < 0.003) {
          toDelete.push(key);
        } else {
          glowRef.current.set(key, next);
        }
      });
      toDelete.forEach(k => glowRef.current.delete(k));

      rafRef.current = requestAnimationFrame(draw);
    }

    rafRef.current = requestAnimationFrame(draw);
    container.addEventListener("mousemove", handleMove);
    container.addEventListener("mouseleave", handleLeave);

    return () => {
      cancelAnimationFrame(rafRef.current);
      container.removeEventListener("mousemove", handleMove);
      container.removeEventListener("mouseleave", handleLeave);
      resizeObs.disconnect();
    };
  }, [handleMove, handleLeave]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-0">
      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  );
}
