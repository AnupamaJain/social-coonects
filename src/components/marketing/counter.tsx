"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counts a number up from zero when it scrolls into view. Accepts strings like
 * "28 → 87", "5 min", "0 keys": every integer in the string animates, the rest
 * is kept verbatim. Server-renders the final value so crawlers see real text.
 */
export function Counter({ value, duration = 1100 }: { value: string; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        setProgress(1 - Math.pow(1 - t, 3)); // ease-out cubic
        if (t < 1) requestAnimationFrame(tick);
      };
      setProgress(0);
      requestAnimationFrame(tick);
    }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [duration]);

  const rendered = value.replace(/\d+/g, (n) => String(Math.round(Number(n) * progress)));
  return <span ref={ref} className="tabular-nums">{rendered}</span>;
}
