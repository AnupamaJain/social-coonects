"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Fades and lifts children into place the first time they scroll into view.
 * Server-renders visible (no layout flash, nothing hidden from crawlers), then
 * the client hides-and-reveals only when motion is allowed.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"ssr" | "hidden" | "shown">("ssr");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Already on screen at load — reveal immediately rather than hide it first.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.9) { setState("shown"); return; }

    setState("hidden");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) { setState("shown"); io.disconnect(); }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: state === "hidden" ? 0 : 1,
        transform: state === "hidden" ? "translateY(22px)" : "none",
        transition: "opacity 700ms cubic-bezier(0.22,1,0.36,1), transform 700ms cubic-bezier(0.22,1,0.36,1)",
        transitionDelay: `${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}
