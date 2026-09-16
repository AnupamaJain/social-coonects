"use client";

import { useId, useMemo, useState } from "react";
import { formatNumber } from "@/lib/utils";

export const SERIES = [
  "var(--series-1)", "var(--series-2)", "var(--series-3)",
  "var(--series-4)", "var(--series-5)", "var(--series-6)",
];

// ---------------------------------------------------------------------------
// Line chart — one series, so no legend: the title names it.
// ---------------------------------------------------------------------------

export function TrendChart({
  data,
  label,
  height = 200,
}: {
  data: { date: string; value: number }[];
  label: string;
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const gradId = useId();

  const { path, area, points, max, pad, w, h } = useMemo(() => {
    const w = 640;
    const h = height;
    const pad = { top: 12, right: 12, bottom: 24, left: 44 };
    const max = Math.max(1, ...data.map((d) => d.value));
    const innerW = w - pad.left - pad.right;
    const innerH = h - pad.top - pad.bottom;

    const points = data.map((d, i) => ({
      x: pad.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
      y: pad.top + innerH - (d.value / max) * innerH,
      ...d,
    }));

    const path = points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join(" ");
    const area = points.length
      ? `${path} L${points[points.length - 1].x},${pad.top + innerH} L${points[0].x},${pad.top + innerH} Z`
      : "";

    return { path, area, points, max, pad, w, h };
  }, [data, height]);

  if (!data.length) {
    return (
      <p className="py-12 text-center text-sm text-muted">
        No data yet. Publish a post and refresh analytics.
      </p>
    );
  }

  const active = hover !== null ? points[hover] : null;

  return (
    <div className="viz-root relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`${label} over time`}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Recessive grid + y labels */}
        {[0, 0.5, 1].map((t) => {
          const y = pad.top + (h - pad.top - pad.bottom) * (1 - t);
          return (
            <g key={t}>
              <line
                x1={pad.left} x2={w - pad.right} y1={y} y2={y}
                stroke="var(--viz-grid)" strokeWidth="1"
              />
              <text
                x={pad.left - 8} y={y + 3} textAnchor="end"
                fill="var(--viz-text-muted)" fontSize="10"
              >
                {formatNumber(Math.round(max * t))}
              </text>
            </g>
          );
        })}

        <path d={area} fill={`url(#${gradId})`} />
        <path
          d={path} fill="none" stroke="var(--series-1)" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
        />

        {active ? (
          <>
            <line
              x1={active.x} x2={active.x} y1={pad.top} y2={h - pad.bottom}
              stroke="var(--viz-grid)" strokeWidth="1"
            />
            <circle
              cx={active.x} cy={active.y} r="5"
              fill="var(--series-1)" stroke="var(--viz-surface)" strokeWidth="2"
            />
          </>
        ) : null}

        {/* Hit targets, wider than the marks */}
        {points.map((p, i) => (
          <rect
            key={i}
            x={p.x - (w - pad.left - pad.right) / Math.max(1, points.length) / 2}
            y={pad.top}
            width={(w - pad.left - pad.right) / Math.max(1, points.length)}
            height={h - pad.top - pad.bottom}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
          />
        ))}

        {/* First and last x labels only — no axis clutter */}
        {[points[0], points[points.length - 1]].map((p, i) => (
          <text
            key={i}
            x={p.x} y={h - 6}
            textAnchor={i === 0 ? "start" : "end"}
            fill="var(--viz-text-muted)" fontSize="10"
          >
            {new Date(p.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </text>
        ))}
      </svg>

      {active ? (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border bg-[var(--panel)] px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: `${(active.x / w) * 100}%`, top: 0 }}
        >
          <p className="font-medium tabular-nums">{formatNumber(active.value)}</p>
          <p className="text-muted">
            {new Date(active.date).toLocaleDateString(undefined, {
              month: "short", day: "numeric",
            })}
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Horizontal bars — categorical identity, always direct-labelled.
// ---------------------------------------------------------------------------

export function BarList({
  data,
  format = formatNumber,
}: {
  data: { label: string; value: number; sub?: string }[];
  format?: (n: number) => string;
}) {
  if (!data.length) {
    return <p className="py-8 text-center text-sm text-muted">Nothing to show yet.</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="viz-root space-y-3">
      {data.map((d, i) => (
        <div key={d.label} className="group">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 font-medium">
              <span
                className="size-2.5 shrink-0 rounded-sm"
                style={{ background: SERIES[i % SERIES.length] }}
              />
              {d.label}
            </span>
            <span className="tabular-nums">{format(d.value)}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full border bg-[var(--bg-subtle)]">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${Math.max(1.5, (d.value / max) * 100)}%`,
                background: SERIES[i % SERIES.length],
              }}
            />
          </div>
          {d.sub ? <p className="mt-1 text-xs text-muted">{d.sub}</p> : null}
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Calibration scatter — does the pre-flight score actually predict engagement?
// One series, so identity needs no color: the reference line carries the story.
// ---------------------------------------------------------------------------

export function CalibrationChart({
  data,
  height = 220,
}: {
  data: { predicted: number; actual: number; label: string }[];
  height?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 420;
  const pad = { top: 14, right: 14, bottom: 30, left: 38 };

  if (data.length < 3) {
    return (
      <p className="py-10 text-center text-sm text-muted">
        Publish a few more posts and this shows whether the score is actually
        predicting your engagement.
      </p>
    );
  }

  const innerW = w - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const px = (v: number) => pad.left + (v / 100) * innerW;
  const py = (v: number) => pad.top + innerH - (v / 100) * innerH;

  const active = hover !== null ? data[hover] : null;

  return (
    <div className="viz-root relative">
      <svg
        viewBox={`0 0 ${w} ${height}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="Predicted score against actual engagement percentile"
        onMouseLeave={() => setHover(null)}
      >
        {[0, 50, 100].map((t) => (
          <g key={t}>
            <line
              x1={pad.left} x2={w - pad.right} y1={py(t)} y2={py(t)}
              stroke="var(--viz-grid)" strokeWidth="1"
            />
            <text
              x={pad.left - 6} y={py(t) + 3} textAnchor="end"
              fill="var(--viz-text-muted)" fontSize="10"
            >
              {t}
            </text>
          </g>
        ))}

        {/* Perfect-calibration reference */}
        <line
          x1={px(0)} y1={py(0)} x2={px(100)} y2={py(100)}
          stroke="var(--viz-text-muted)" strokeWidth="1.5"
          strokeDasharray="4 4" opacity="0.5"
        />

        {data.map((d, i) => (
          <circle
            key={i}
            cx={px(d.predicted)} cy={py(d.actual)} r={hover === i ? 7 : 5}
            fill="var(--seq)"
            stroke="var(--viz-surface)" strokeWidth="2"
            onMouseEnter={() => setHover(i)}
            style={{ cursor: "pointer" }}
          />
        ))}

        <text
          x={pad.left + innerW / 2} y={height - 6} textAnchor="middle"
          fill="var(--viz-text-muted)" fontSize="10"
        >
          Predicted score →
        </text>
      </svg>

      {active ? (
        <div className="pointer-events-none absolute left-2 top-2 max-w-[70%] rounded-lg border bg-[var(--panel)] px-2.5 py-1.5 text-xs shadow-lg">
          <p className="tabular-nums">
            Predicted {active.predicted} · actual {active.actual}
          </p>
          <p className="mt-0.5 line-clamp-2 text-muted">{active.label}</p>
        </div>
      ) : null}
    </div>
  );
}
