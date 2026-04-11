import React, { useRef, useEffect, useCallback, memo } from "react";
import { animate } from "framer-motion";

interface GlowingEffectProps {
  blur?: number;
  inactiveZone?: number;
  proximity?: number;
  spread?: number;
  glow?: boolean;
  borderWidth?: number;
  disabled?: boolean;
  movementDuration?: number;
  className?: string;
}

export const GlowingEffect = memo(function GlowingEffect({
  blur = 0,
  inactiveZone = 0.7,
  proximity = 64,
  spread = 40,
  glow = false,
  borderWidth = 1,
  disabled = true,
  movementDuration = 2,
  className,
}: GlowingEffectProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const rafId = useRef(0);

  const handleMove = useCallback(
    (pos?: { x: number; y: number }) => {
      const el = containerRef.current;
      if (!el) return;

      if (rafId.current) cancelAnimationFrame(rafId.current);

      rafId.current = requestAnimationFrame(() => {
        if (!containerRef.current) return;
        const { left, top, width, height } = containerRef.current.getBoundingClientRect();

        const x = pos?.x ?? lastPos.current.x;
        const y = pos?.y ?? lastPos.current.y;
        if (pos) lastPos.current = { x, y };

        const center = [left + width * 0.5, top + height * 0.5];
        const dist = Math.hypot(x - center[0], y - center[1]);
        const deadZone = 0.5 * Math.min(width, height) * inactiveZone;

        if (dist < deadZone) {
          containerRef.current.style.setProperty("--active", "0");
          return;
        }

        const inRange =
          x > left - proximity &&
          x < left + width + proximity &&
          y > top - proximity &&
          y < top + height + proximity;

        containerRef.current.style.setProperty("--active", inRange ? "1" : "0");

        if (!inRange) return;

        const currentStart = parseFloat(containerRef.current.style.getPropertyValue("--start")) || 0;
        const targetAngle = (180 * Math.atan2(y - center[1], x - center[0])) / Math.PI + 90;
        let delta = ((targetAngle - currentStart + 180) % 360) - 180;
        const finalAngle = currentStart + delta;

        animate(currentStart, finalAngle, {
          duration: movementDuration,
          ease: [0.16, 1, 0.3, 1],
          onUpdate: (v) => {
            containerRef.current?.style.setProperty("--start", String(v));
          },
        });
      });
    },
    [inactiveZone, proximity, movementDuration]
  );

  useEffect(() => {
    if (disabled) return;

    const onScroll = () => handleMove();
    const onPointer = (e: PointerEvent) => handleMove({ x: e.clientX, y: e.clientY });

    window.addEventListener("scroll", onScroll, { passive: true });
    document.body.addEventListener("pointermove", onPointer, { passive: true });

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      window.removeEventListener("scroll", onScroll);
      document.body.removeEventListener("pointermove", onPointer);
    };
  }, [handleMove, disabled]);

  return (
    <>
      {/* Fallback static border when disabled */}
      <div
        className={`pointer-events-none absolute -inset-px hidden rounded-[inherit] border opacity-0 transition-opacity ${
          glow ? "opacity-100" : ""
        } ${disabled ? "!block" : ""}`}
        style={{ borderColor: "rgba(255,255,255,0.06)" }}
      />

      {/* Animated glow container */}
      <div
        ref={containerRef}
        style={
          {
            "--blur": `${blur}px`,
            "--spread": spread,
            "--start": "0",
            "--active": "0",
            "--glowingeffect-border-width": `${borderWidth}px`,
            "--gradient": `repeating-conic-gradient(
              from 236.84deg at 50% 50%,
              #0d0d0d 0%,
              #3b82f6 8%,
              #2563eb 16%,
              #7c3aed 24%,
              #a855f7 32%,
              #f97316 40%,
              #ef4444 48%,
              #0d0d0d 56%,
              #3b82f6 64%,
              #7c3aed 72%,
              #f97316 80%,
              #ef4444 88%,
              #0d0d0d 100%
            )`,
          } as React.CSSProperties
        }
        className={`pointer-events-none absolute inset-0 rounded-[inherit] opacity-100 transition-opacity ${
          glow ? "opacity-100" : ""
        } ${blur > 0 ? "blur-[var(--blur)]" : ""} ${className || ""} ${
          disabled ? "!hidden" : ""
        }`}
      >
        <div
          className="rounded-[inherit] h-full w-full"
          style={{
            content: '""',
            position: "relative",
            height: "100%",
            width: "100%",
          }}
        >
          <div
            style={{
              content: '""',
              position: "absolute",
              inset: `calc(-1 * ${borderWidth}px)`,
              borderRadius: "inherit",
              border: `${borderWidth}px solid transparent`,
              background: "var(--gradient)",
              backgroundAttachment: "fixed",
              opacity: "var(--active)",
              transition: "opacity 300ms",
              maskClip: "padding-box, border-box",
              WebkitMaskClip: "padding-box, border-box",
              maskComposite: "intersect",
              WebkitMaskComposite: "source-in",
              maskImage: `linear-gradient(#0000, #0000), conic-gradient(from calc((var(--start) - var(--spread)) * 1deg), #00000000 0deg, #fff, #00000000 calc(var(--spread) * 2deg))`,
              WebkitMaskImage: `linear-gradient(#0000, #0000), conic-gradient(from calc((var(--start) - var(--spread)) * 1deg), #00000000 0deg, #fff, #00000000 calc(var(--spread) * 2deg))`,
            }}
          />
        </div>
      </div>
    </>
  );
});
