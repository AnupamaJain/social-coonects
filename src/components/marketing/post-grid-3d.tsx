"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";

const COLS = 20;
const TOTAL = 180;
const WINNERS = [14, 39, 62, 97, 128, 161];

type Phase = "static" | "rewound" | "laying" | "lifting" | "held";

/**
 * 180 posts on a tilted plane; the six that worked lift off it.
 *
 * Real CSS 3D — the tiles sit on a rotated plane with preserve-3d, so the
 * winners translate on Z and cast shadows onto the others. The plane tracks the
 * cursor, which is what sells it as a physical object rather than a picture of
 * one.
 */
export function PostGrid3D() {
  const root = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Starts finished, so the server renders a complete grid — crawlers and
  // reduced-motion users get the whole picture, and nothing is ever invisible
  // because JavaScript hasn't run yet. The observer rewinds and replays it.
  const [phase, setPhase] = useState<Phase>("static");
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const still = phase === "static";

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const play = useCallback(() => {
    clear();
    setPhase("rewound");
    // One frame at opacity 0 gives the cascade a state to animate out of.
    timers.current.push(setTimeout(() => setPhase("laying"), 30));
    timers.current.push(setTimeout(() => setPhase("lifting"), 1530));
    timers.current.push(setTimeout(() => setPhase("held"), 3230));
  }, [clear]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { play(); io.disconnect(); } },
      { threshold: 0.25 },
    );
    io.observe(el);
    return () => { io.disconnect(); clear(); };
  }, [play, clear]);

  useEffect(() => clear, [clear]);

  // Cursor parallax, clamped so the plane never loses its footing.
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (still) return;
    const r = e.currentTarget.getBoundingClientRect();
    setTilt({
      x: ((e.clientY - r.top) / r.height - 0.5) * -10,
      y: ((e.clientX - r.left) / r.width - 0.5) * 16,
    });
  };

  const laid = phase !== "rewound";
  const lifted = phase === "lifting" || phase === "held" || still;

  return (
    <div
      ref={root}
      className="group/grid relative select-none"
      // Rotating a wide grid makes its painted box wider than its layout box,
      // so the plane is scaled down and the wrapper padded to keep the corners
      // inside the column.
      style={{ perspective: "1300px", perspectiveOrigin: "50% 38%" }}
      onMouseMove={onMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
    >
      <div
        className="mx-auto"
        style={{
          transformStyle: "preserve-3d",
          transform: `rotateX(${54 + tilt.x}deg) rotateZ(${-6 + tilt.y * 0.3}deg) scale(0.86)`,
          transition: "transform 600ms cubic-bezier(0.22,1,0.36,1)",
          padding: "10% 6% 16%",
        }}
      >
        <div
          className="grid gap-[3px]"
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, transformStyle: "preserve-3d" }}
        >
          {Array.from({ length: TOTAL }, (_, i) => {
            const win = WINNERS.indexOf(i);
            const isWin = win !== -1;
            const row = Math.floor(i / COLS);
            const col = i % COLS;
            // Cascade along the diagonal so it reads as a wave, not a wipe.
            const delay = still ? 0 : (row + col) * 22;
            const z = isWin && lifted ? 46 : 0;

            return (
              <div
                key={i}
                className="aspect-square rounded-[3px]"
                style={{
                  background: isWin && lifted ? "var(--color-clay-500)" : "var(--color-ink-200)",
                  transform: `translateZ(${z}px)`,
                  opacity: laid ? 1 : 0,
                  boxShadow:
                    isWin && lifted
                      ? "0 18px 26px -10px color-mix(in srgb, var(--color-clay-700) 55%, transparent)"
                      : "none",
                  transition: still
                    ? "none"
                    : `opacity 420ms ease-out ${delay}ms, transform 900ms cubic-bezier(0.34,1.4,0.5,1) ${isWin ? 1500 + win * 90 : 0}ms, background 500ms ease ${isWin ? 1500 + win * 90 : 0}ms, box-shadow 700ms ease ${isWin ? 1500 + win * 90 : 0}ms`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Caption + replay */}
      <div className="mt-2 flex items-center justify-center gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          <span className="text-clay-500">{lifted ? WINNERS.length : 0}</span> of {TOTAL} drove the results
        </p>
        {!still ? (
          <button
            type="button"
            onClick={play}
            aria-label="Replay"
            className="grid size-7 place-items-center rounded-md border text-muted opacity-0 transition-all hover:text-[var(--fg)] focus-visible:opacity-100 group-hover/grid:opacity-100 active:scale-90"
          >
            <RotateCcw className="size-3" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
